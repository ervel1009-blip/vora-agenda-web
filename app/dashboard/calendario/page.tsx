'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [calendars, setCalendars] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)

 // --- 🚪 EL PORTERO LINEAL (Paso 2/7) ---
  useEffect(() => {
    const gatekeeper = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('business_type, google_calendar_id')
        .eq('owner_id', session.user.id)
        .single()

      // 1. Validar hacia atrás: ¿Hizo el Paso 1?
      if (!org?.business_type) {
        console.log("⚠️ Falta giro de negocio. Regresando al Paso 1...");
        router.push('/onboarding')
        return
      }

      // 2. Validar hacia adelante: ¿Ya hizo este Paso 2?
      // 🚩 CORRECCIÓN: Saltar solo al Paso 3 (Perfil), no al final.
      if (org?.google_calendar_id) {
        console.log("✅ Calendario ya vinculado. Avanzando al Paso 3 (Perfil)...");
        router.push('/onboarding/perfil') 
        return 
      }

      // Si llegó aquí, es que no tiene calendario. Cargamos los datos.
      fetchRealGoogleCalendars()
    }

    gatekeeper()
  }, [supabase, router])


  // --- LÓGICA ORIGINAL (INTACTA) ---
  const fetchRealGoogleCalendars = async () => {
    setErrorStatus(null)
    setIsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 

    try {
      const { data, error } = await supabase.functions.invoke('get-google-calendars', {
        body: { userId: session.user.id }
      })

      if (error) throw error;

      if (data?.calendars) {
        setCalendars(data.calendars)
        const primary = data.calendars.find((c: any) => c.id.includes('@'))
        if (primary) setSelectedId(primary.id)
      } else {
        setErrorStatus("No se encontraron calendarios vinculados a esta cuenta.")
      }
    } catch (err: any) {
      console.error("❌ Error de Edge Function:", err)
      setErrorStatus(err.message || "Error al conectar con el servicio de Google.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCalendar = async () => {
    if (!selectedId) return
    setIsSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('organizations')
      .update({ google_calendar_id: selectedId })
      .eq('owner_id', user?.id)

    if (!error) {
      // Al guardar con éxito, seguimos al siguiente paso del perfil
      router.push('/onboarding/perfil');
    }
    setIsSaving(false)
  }

  // --- TU DISEÑO ORIGINAL (INTACTO) ---
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
      <OnboardingProgress currentStep={2} />

      <div className="w-full max-w-xl bg-white rounded-[40px] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-10 md:p-14 text-center border-b border-slate-50">
          <h1 className="text-3xl font-black text-rose-950 tracking-tighter leading-tight mb-3">
            Conectar Agenda <span className="text-rose-700">Real</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            VORA necesita saber en qué calendario anotar las citas.
          </p>
        </div>

        <div className="p-10 md:p-14">
          {isLoading ? (
            <div className="flex flex-col items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
              <p className="mt-6 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
                Sincronizando con Google...
              </p>
            </div>
          ) : errorStatus ? (
            <div className="text-center py-6 space-y-6">
               <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl">
                 <span className="text-4xl mb-4 block">⚠️</span>
                 <p className="text-rose-950 font-bold mb-2">Problema de Conexión</p>
                 <p className="text-rose-700 text-xs font-medium leading-relaxed">
                   {errorStatus}
                 </p>
               </div>
               <button 
                onClick={fetchRealGoogleCalendars}
                className="text-rose-700 font-black text-xs uppercase tracking-[0.2em] hover:underline"
               >
                 🔄 Reintentar Sincronización
               </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  ¿Cuál calendario usaremos?
                </label>
                <div className="relative group">
                    <select 
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {calendars.map(cal => (
                        <option key={cal.id} value={cal.id}>{cal.summary}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-rose-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveCalendar}
                  disabled={!selectedId || isSaving}
                  className="w-full bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-slate-200 hover:bg-rose-800 transition-all active:scale-95 disabled:opacity-30"
                >
                  {isSaving ? 'Vinculando...' : 'Continuar al Perfil 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
        Artemix S.A. • 2026
      </p>
    </div>
  )
}