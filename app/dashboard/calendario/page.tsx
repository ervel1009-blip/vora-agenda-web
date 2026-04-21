'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2,
  RefreshCw,
  Plus,
  Zap
} from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // --- ESTADOS ORIGINALES (ONBOARDING) ---
  const [calendars, setCalendars] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)

  // --- NUEVOS ESTADOS (OPERATIVO) ---
  const [viewMode, setViewMode] = useState<'loading' | 'onboarding' | 'active'>('loading')
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())

  // --- 🚪 EL PORTERO DUAL (Soporta Onboarding y Dashboard) ---
  useEffect(() => {
    const gatekeeper = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('business_type, google_calendar_id, subscription_status, id')
        .eq('owner_id', session.user.id)
        .single()

      // CASO A: USUARIO ACTIVO (Dashboard Full)
      if (org?.subscription_status === 'active') {
        setViewMode('active')
        fetchAppointments(org.id)
        setIsLoading(false)
        return
      }

      // CASO B: USUARIO EN ONBOARDING
      if (!org?.business_type) {
        router.push('/onboarding')
        return
      }

      // Si ya tiene calendario pero NO es activo, sigue su camino al Perfil
      if (org?.google_calendar_id) {
        router.push('/onboarding/perfil')
        return
      }

      // Si llegó aquí, es el Paso 2 puro: Conectar calendario
      setViewMode('onboarding')
      fetchRealGoogleCalendars()
    }

    gatekeeper()
  }, [supabase, router, selectedDate])

  // --- LÓGICA DE SINCRONIZACIÓN (ONBOARDING) ---
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
        setErrorStatus("No se encontraron calendarios vinculados.")
      }
    } catch (err: any) {
      setErrorStatus(err.message || "Error al conectar con Google.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- LÓGICA DE CARGA DE CITAS (OPERATIVO) ---
  const fetchAppointments = async (orgId: string) => {
    const startOfDay = new Date(selectedDate.setHours(0,0,0,0)).toISOString()
    const endOfDay = new Date(selectedDate.setHours(23,59,59,999)).toISOString()

    const { data } = await supabase
      .from('appointments_v_nexus')
      .select(`
        *,
        patient:patients_v_nexus(name, phone),
        specialist:specialists(name)
      `)
      .eq('organization_id', orgId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: true })

    setAppointments(data || [])
  }

  const handleSaveCalendar = async () => {
    if (!selectedId) return
    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('organizations')
        .update({ google_calendar_id: selectedId, updated_at: new Date().toISOString() })
        .eq('owner_id', session?.user.id)
      if (error) throw error;
      router.push('/onboarding/perfil');
    } catch (err: any) {
      alert("Error al vincular: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (viewMode === 'loading' || (viewMode === 'onboarding' && isLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600"></div>
        <p className="mt-6 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando VORA...</p>
      </div>
    )
  }

  // ==========================================
  // VISTA 1: MODO ONBOARDING (PASO 2)
  // ==========================================
  if (viewMode === 'onboarding') {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
        <OnboardingProgress currentStep={2} />

        <div className="w-full max-w-xl bg-white rounded-[48px] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-10 md:p-14 text-center border-b border-slate-50">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6">
              <CalendarIcon size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter leading-tight mb-3">
              Conectar Agenda <span className="text-emerald-600 italic">Real</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              VORA necesita saber dónde anotar tus citas.
            </p>
          </div>

          <div className="p-10 md:p-14">
            {errorStatus ? (
              <div className="text-center py-6 space-y-6">
                 <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl">
                   <p className="text-rose-950 font-bold mb-2">Error de Sincronización</p>
                   <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorStatus}</p>
                 </div>
                 <button onClick={fetchRealGoogleCalendars} className="text-emerald-600 font-black text-xs uppercase tracking-[0.2em] hover:underline">
                   🔄 Reintentar
                 </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Calendario de Destino</label>
                  <div className="relative">
                    <select 
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold focus:border-emerald-600 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {calendars.map(cal => (
                        <option key={cal.id} value={cal.id}>{cal.summary}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                        <ChevronRight size={20} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveCalendar}
                  disabled={!selectedId || isSaving}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-30"
                >
                  {isSaving ? 'Vinculando...' : 'Continuar al Perfil 🚀'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VISTA 2: MODO OPERATIVO (AGENDA DASHBOARD)
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">Agenda <span className="text-emerald-600 italic">Operativa</span></h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin-slow text-emerald-500" /> Sincronización en tiempo real
          </p>
        </div>
        
        {/* Selector de Fecha */}
        <div className="flex items-center bg-white border border-slate-100 p-2 rounded-[24px] shadow-sm">
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 text-center min-w-[150px]">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">{selectedDate.toLocaleDateString('es-GT', { weekday: 'long' })}</p>
            <p className="text-sm font-bold text-slate-900">{selectedDate.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <section className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[48px] py-24 flex flex-col items-center justify-center text-slate-300">
             <Clock size={50} strokeWidth={1.5} className="mb-4 opacity-30" />
             <p className="font-bold text-xs uppercase tracking-[0.2em]">No hay citas para este día</p>
          </div>
        ) : (
          appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-7 rounded-[40px] border border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center gap-8 hover:border-emerald-100 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-center md:flex-col md:items-start gap-4 md:gap-1 min-w-[110px] border-b md:border-b-0 md:border-r border-slate-50 pb-4 md:pb-0">
                <p className="text-3xl font-black text-slate-950 tracking-tighter">
                  {new Date(apt.start_time).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
                <div className="px-2 py-0.5 bg-emerald-50 rounded text-[9px] font-black text-emerald-600 uppercase">Confirmada</div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{apt.patient?.name}</h3>
                </div>
                <div className="flex flex-wrap gap-5">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <User size={14} className="text-emerald-500" /> {apt.specialist?.name}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <Phone size={14} className="text-emerald-500" /> {apt.patient?.phone}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4 md:mt-0">
                <button className="flex-1 md:flex-none bg-slate-950 text-white p-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-100 group-hover:scale-105">
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <button className="fixed bottom-10 right-10 w-16 h-16 bg-emerald-600 text-white rounded-[24px] shadow-2xl shadow-emerald-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all lg:hidden z-50">
        <Plus size={32} strokeWidth={3} />
      </button>
    </div>
  )
}