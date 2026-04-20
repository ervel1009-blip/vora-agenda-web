'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

const DAYS = [
  { id: 0, name: 'Domingo' }, { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' }, { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' },
]

export default function HorariosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true) // Iniciamos en true para el Portero
  const [orgId, setOrgId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<{ [key: number]: { open: string, close: string, closed: boolean } }>({})

// --- 🚪 PORTERO PASO 4 ---
useEffect(() => {
  const fetchHoursAndCheck = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return; }

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', session.user.id)
      .single()

    // FILTRO EN CASCADA (No permite saltos)
    if (!org?.business_type) { router.push('/onboarding'); return; }
    if (!org?.google_calendar_id) { router.push('/onboarding/calendario'); return; }
    
    // Si falta el perfil (Paso 3), lo mandamos allá, NO al calendario
    if (!org?.public_phone || !org?.address) {
      console.log("⚠️ Falta perfil. Moviendo al Paso 3...");
      router.push('/onboarding/perfil'); 
      return;
    }

    // Si ya tiene horarios, saltamos al paso 5 (Servicios)
    const { data: hoursData } = await supabase
      .from('operating_hours')
      .select('*')
      .eq('org_id', org.id)

    if (hoursData && hoursData.length > 0) {
      router.push('/onboarding/servicios');
      return;
    }

    setOrgId(org.id);
    setLoading(false);
  }
  fetchHoursAndCheck();
}, [supabase, router])

  // --- FUNCIÓN handleSave (INTACTA) ---
  const handleSave = async () => {
    if (!orgId) return
    setLoading(true)

    try {
        const upsertData = DAYS.map(day => ({
            org_id: orgId,
            day_of_week: day.id,
            open_time: schedule[day.id]?.open || '08:00:00',
            close_time: schedule[day.id]?.close || '17:00:00',
            is_closed: !!schedule[day.id]?.closed
        }))

        const { error: hoursError } = await supabase
            .from('operating_hours')
            .upsert(upsertData, { onConflict: 'org_id, day_of_week' })

        if (hoursError) throw hoursError

        const scheduleSummary = DAYS.map(day => {
            const d = schedule[day.id]
            return `${day.name}: ${d?.closed ? 'Cerrado' : `${d?.open.substring(0,5)} a ${d?.close.substring(0,5)}`}`
        }).join(', ')

        const { data: orgData } = await supabase
            .from('organizations')
            .select('name, currency_symbol, business_type, chat_context')
            .eq('id', orgId)
            .single()

        const { data: templateData } = await supabase
            .from('ai_prompts')
            .select('system_prompt')
            .eq('business_type', orgData?.business_type)
            .eq('slug', 'main_assistant')
            .eq('is_active', true)
            .single()

        let systemPrompt = templateData?.system_prompt || ""

        const hydratedPrompt = systemPrompt
            .replace(/{{name}}/g, orgData.name)
            .replace(/{{currency}}/g, orgData.currency_symbol)
            .replace(/{{hours}}/g, scheduleSummary)

        const { error: updateError } = await supabase
            .from('organizations')
            .update({
                chat_context: {
                    ...orgData?.chat_context,
                    system_prompt: hydratedPrompt
                }
            })
            .eq('id', orgId)

        if (updateError) throw updateError

        console.log("✅ Horarios hidratados en el prompt.");
        router.push('/dashboard/servicios') 

    } catch (error: any) {
        console.error("❌ Error en el flujo de horarios:", error.message)
        alert("Error al guardar: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  // --- SPINNER DE CARGA DEL PORTERO ---
  if (loading && !orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 md:p-10">
      
      <OnboardingProgress currentStep={4} />

      <div className="w-full max-w-4xl bg-white rounded-[40px] p-8 md:p-14 shadow-xl shadow-slate-200 border border-slate-100">
        
        <header className="mb-12 text-center flex flex-col items-center">
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            Horarios de <span className="text-rose-700">Atención</span>
          </h1>
          <p className="text-slate-600 mt-2 font-medium text-lg max-w-md">
            Configura la disponibilidad para que VORA agende de forma autónoma.
          </p>
        </header>
        
        <div className="space-y-4">
          {DAYS.map((day) => (
            <div 
              key={day.id} 
              className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-3xl transition-all border-2 ${
                schedule[day.id]?.closed 
                ? 'bg-slate-50 border-slate-100 opacity-60' 
                : 'bg-white border-transparent hover:border-rose-100 shadow-sm'
              }`}
            >
              <div className="w-full md:w-32 mb-4 md:mb-0">
                <span className={`text-lg font-black ${schedule[day.id]?.closed ? 'text-slate-400' : 'text-slate-900'}`}>
                  {day.name}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <input 
                  type="time" 
                  step="1"
                  value={schedule[day.id]?.open || '08:00'} 
                  onChange={(e) => setSchedule({...schedule, [day.id]: { ...schedule[day.id], open: e.target.value }})}
                  disabled={schedule[day.id]?.closed}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all disabled:bg-slate-100 disabled:text-slate-300" 
                />
                <span className="text-rose-300 font-black italic">a</span>
                <input 
                  type="time" 
                  step="1"
                  value={schedule[day.id]?.close || '17:00'} 
                  onChange={(e) => setSchedule({...schedule, [day.id]: { ...schedule[day.id], close: e.target.value }})}
                  disabled={schedule[day.id]?.closed}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all disabled:bg-slate-100 disabled:text-slate-300" 
                />
              </div>

              <div className="mt-4 md:mt-0">
                <label className={`flex items-center gap-3 cursor-pointer px-6 py-3 rounded-2xl transition-all ${
                  schedule[day.id]?.closed 
                  ? 'bg-rose-950 text-white' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                  <input 
                    type="checkbox" 
                    checked={schedule[day.id]?.closed || false} 
                    onChange={(e) => setSchedule({...schedule, [day.id]: { ...schedule[day.id], closed: e.target.checked }})}
                    className="hidden" 
                  /> 
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {schedule[day.id]?.closed ? 'Cerrado' : 'Abierto'}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 ${schedule[day.id]?.closed ? 'bg-white border-white' : 'bg-transparent border-slate-400'}`}></div>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-10">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-rose-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              'Guardar y Continuar 🚀'
            )}
          </button>
        </div>
      </div>

      <p className="mt-10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] text-center">
        Powered by Artemix S.A.
      </p>
    </div>
  )
}