'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

export default function PerfilNegocioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true) 
  const [countries, setCountries] = useState<any[]>([])
  
  const [form, setForm] = useState({
    owner_name: '',
    name: '',
    public_phone: '',
    address: '', 
    currency_symbol: '',
    timezone: '',
    country_code: ''
  })

  // --- 🚪 EL PORTERO LINEAL (Paso 3/7) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      // 1. Cargar lista de países
      const { data: countriesData } = await supabase
        .from('countries')
        .select('*')
        .eq('is_active', true) 
        .order('name', { ascending: true })
      
      if (countriesData) setCountries(countriesData)

      // 2. EL PORTERO: Validar estado de la organización
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()

      // Validar hacia atrás (Paso 1)
      if (!org?.business_type) {
        console.log("⚠️ Falta giro de negocio. Regresando al Paso 1...");
        router.push('/onboarding')
        return
      }

      // Validar hacia atrás (Paso 2)
      if (!org?.google_calendar_id) {
        console.log("⚠️ Falta calendario. Regresando al Paso 2...");
        router.push('/dashboard/calendario') 
        return
      }

      // 🚀 Validar hacia adelante: ¿Ya se completó este Paso 3?
      // Si ya tiene teléfono y dirección, avanzamos exclusivamente al Paso 4 (Horarios)
      if (org.public_phone && org.address) {
        console.log("✅ Perfil ya completado. Avanzando al Paso 4...");
        router.push('/dashboard/horarios')
        return
      }

      // 3. Cargar datos para el formulario si existen (Persistencia)
      if (org) {
        const { data: member } = await supabase
          .from('team_members_v_nexus')
          .select('name')
          .eq('organization_id', org.id)
          .eq('role', 'manager')
          .maybeSingle()

        setForm({
          owner_name: member?.name || '', 
          name: org.name || '',
          public_phone: org.public_phone || '',
          address: org.address || '',
          currency_symbol: org.currency_symbol || 'Q',
          timezone: org.timezone || 'America/Guatemala',
          country_code: org.country_code || 'GT'
        })
      }
      
      setIsLoading(false)
    }
    fetchInitialData()
  }, [supabase, router])

  const handleCountryChange = (code: string) => {
    const country = countries.find(c => c.code === code)
    if (country) {
      setForm({
        ...form,
        country_code: code,
        currency_symbol: country.currency_symbol,
        timezone: country.timezone_default || 'UTC'
      })
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay usuario autenticado")

      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, business_type, chat_context')
        .eq('owner_id', user.id)
        .single()

      // Obtenemos datos para hidratar el prompt (Lógica intacta)
      const { data: hoursData } = await supabase.from('operating_hours').select('*').eq('org_id', orgData.id)
      const { data: servicesData } = await supabase.from('services_config').select('*').eq('organization_id', orgData.id)
      const { data: templateData } = await supabase.from('ai_prompts').select('system_prompt').eq('business_type', orgData.business_type).eq('slug', 'main_assistant').eq('is_active', true).maybeSingle()

      let systemPrompt = templateData?.system_prompt || "Asistente de {{name}}. Moneda: {{currency}}."

      const scheduleSummary = hoursData?.length > 0 
        ? hoursData.map(h => `${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][h.day_of_week]}: ${h.is_closed ? 'Cerrado' : `${h.open_time.substring(0,5)} a ${h.close_time.substring(0,5)}`}`).join(', ')
        : "{{hours}}";

      const servicesSummary = servicesData?.length > 0
        ? servicesData.map(s => `${s.service_name} (${form.currency_symbol}${s.price})`).join(', ')
        : "{{services}}";

      const hydratedPrompt = systemPrompt
        .replace(/{{name}}/g, form.name)
        .replace(/{{currency}}/g, form.currency_symbol)
        .replace(/{{address}}/g, form.address) 
        .replace(/{{hours}}/g, scheduleSummary) 
        .replace(/{{services}}/g, servicesSummary);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: form.name,
          address: form.address,
          public_phone: form.public_phone,
          owner_phone: form.public_phone,
          currency_symbol: form.currency_symbol,
          timezone: form.timezone,
          country_code: form.country_code,
          chat_context: {
            ...orgData?.chat_context,
            system_prompt: hydratedPrompt
          },
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user.id)

      const { error: teamError } = await supabase
        .from('team_members_v_nexus')
        .upsert({
          organization_id: orgData.id,
          name: form.owner_name,
          phone: form.public_phone,
          role: 'manager',
          can_self_approve: true,
          is_active: true
        }, { onConflict: 'phone' });

      if (teamError) console.error("⚠️ Error sutil al registrar miembro del equipo:", teamError.message);
      if (error) throw error

      // Redirección lineal al Paso 4
      router.push('/dashboard/horarios')
    } catch (error: any) {
      console.error("❌ Error crítico:", error.message)
      alert("Error al guardar: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !form.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 md:p-10">
      
      <OnboardingProgress currentStep={3} />

      <div className="w-full max-w-lg bg-white rounded-[40px] p-8 md:p-14 shadow-xl shadow-slate-200 border border-slate-100">
        
        <header className="mb-12 text-center flex flex-col items-center">
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            Perfil de <span className="text-rose-700">VORA</span>
          </h1>
          <p className="text-slate-600 mt-2 font-medium text-lg max-w-xs">
            Configura la identidad de tu negocio en segundos.
          </p>
        </header>

        <div className="space-y-7">
          <div className="space-y-2.5 relative group">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">País de operación</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold appearance-none cursor-pointer focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all outline-none"
                value={form.country_code}
                onChange={e => handleCountryChange(e.target.value)}
              >
                <option value="">Selecciona tu país</option>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu Nombre (Propietario)</label>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all font-bold placeholder:text-slate-300"
              placeholder="Ej. Roberto Velasquez"
              value={form.owner_name || ''}
              onChange={e => setForm({...form, owner_name: e.target.value})}
            />
          </div>

          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Negocio</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all font-bold placeholder:text-slate-300"
                placeholder="Ej. VORA Beauty Spa"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dirección Física (Logística)</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all font-bold placeholder:text-slate-300"
                placeholder="Ej. 10 Calle 5-24 Zona 1, Guatemala"
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu WhatsApp (Dueño)</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all font-bold placeholder:text-slate-300"
                placeholder="50200000000"
                value={form.public_phone}
                onChange={e => setForm({...form, public_phone: e.target.value})}
              />
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex justify-between items-center mt-3">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] text-rose-900 font-black uppercase tracking-wider">Configuración Local</span>
                <span className="text-[10px] text-slate-400 font-bold">{form.timezone || 'Zona Horaria'}</span>
            </div>
            <span className="text-3xl font-black text-rose-950 tracking-tighter">{form.currency_symbol || '--'}</span>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSaveProfile}
              disabled={isLoading || !form.name || !form.public_phone || !form.address}
              className="w-full bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-rose-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                  <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></span>
              ) : 'Confirmar e Ir a Horarios 🚀'}
            </button>
          </div>
        </div>
      </div>
      
      <p className="mt-10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        Artemix S.A. • 2026
      </p>
    </div>
  )
}