'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

export default function GestionEquipoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [orgData, setOrgData] = useState<any>(null)
  const [specialists, setSpecialists] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ 
    name: '', 
    phone: '', 
    calendarId: '', 
    role: 'especialista' 
   })

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (org) {
        setOrgData(org)
        const { data: staff } = await supabase
          .from('specialists')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: true })
        setSpecialists(staff || [])

        try {
          const { data: calData } = await supabase.functions.invoke('get-google-calendars', {
            body: { userId: user.id }
          })
          if (calData?.calendars) setCalendars(calData.calendars)
        } catch (err) {
          console.error("Error al traer calendarios:", err)
        }
      }
      setLoading(false)
    }
    initPage()
  }, [supabase])

  // --- LÓGICA DE FINALIZACIÓN ---
  const handleFinalize = async () => {
    if (!orgData) return
    setIsSaving(true)

    // Marcamos el onboarding como completado en la DB
    const { error } = await supabase
      .from('organizations')
      .update({ 
        onboarding_completed: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orgData.id)

    if (!error) {
      router.push('/dashboard')
    } else {
      console.error("Error al finalizar onboarding:", error.message)
      // Forzamos el acceso al dashboard para no bloquear al cliente pagado
      router.push('/dashboard')
    }
    setIsSaving(false)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('specialists')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (!error) {
      setSpecialists(specialists.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar especialista? Esta acción no se puede deshacer.")) return
    
    const { error } = await supabase
      .from('specialists')
      .delete()
      .eq('id', id)

    if (!error) {
      setSpecialists(specialists.filter(s => s.id !== id))
    }
  }

 const handleSaveSpecialist = async () => {
  if (!form.name || !form.phone || !form.calendarId || !orgData) return
  setIsSaving(true)


  try {
    // 1. Insertar en team_members_v_nexus (La Identidad)
    // Usamos el rol 'especialista' que definimos en el check constraint
    const { error: memberError } = await supabase
      .from('team_members_v_nexus')
      .upsert({
        organization_id: orgData.id,
        name: form.name,
        phone: form.phone,
        role: form.role, // 🚩 Usamos el rol dinámico
        is_active: true
      }, { onConflict: 'phone' });

    if (memberError) throw memberError;

    // 2. Insertar en specialists (La Agenda/Calendario)
    const { data, error: specialistError } = await supabase
      .from('specialists')
      .insert([{
        organization_id: orgData.id,
        name: form.name,
        phone: form.phone, // 🚩 Importante guardar el teléfono aquí también
        google_calendar_id: form.calendarId,
        is_active: true
      }])
      .select()

    if (specialistError) throw specialistError;

    if (data) {
      setSpecialists([...specialists, data[0]])
      setIsModalOpen(false)
      setForm({ name: '', phone: '', calendarId: '' })
    }

  } catch (error: any) {
    console.error("❌ Error al sincronizar equipo:", error.message)
    alert("Error: " + error.message)
  } finally {
    setIsSaving(false)
  }
}




  const planLimit = orgData?.subscription_tier === 'premium' ? 5 : 3;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-700"><span className="animate-spin h-10 w-10 border-4 border-rose-700 border-t-transparent rounded-full"></span></div>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12 text-slate-900">
      <OnboardingProgress currentStep={7} />

      <header className="mb-12 text-center flex flex-col items-center max-w-2xl mt-8">
        <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            Gestión de <span className="text-rose-700">Equipo</span>
        </h1>
        <p className="text-slate-600 mt-3 font-medium text-lg px-4">
          Controla la disponibilidad de tus especialistas para que VORA agende citas de forma inteligente.
        </p>

        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={specialists.length >= planLimit}
            className="bg-white text-rose-700 border-2 border-rose-100 px-6 py-3 rounded-2xl font-black hover:bg-rose-50 transition-all shadow-sm disabled:opacity-30"
          >
            + Añadir ({specialists.length}/{planLimit})
          </button>
          
          {/* BOTÓN FINALIZAR CON LÓGICA DE HANDSHAKE */}
          <button 
            onClick={handleFinalize} 
            disabled={isSaving}
            className="bg-rose-700 text-white px-10 py-3 rounded-2xl font-black hover:bg-rose-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Finalizar y Activar VORA →'}
          </button>
        </div>
      </header>

      {/* Grid de Especialistas */}
      <div className="grid gap-6 w-full max-w-5xl md:grid-cols-2 lg:grid-cols-3">
        {specialists.map(staff => (
          <div key={staff.id} className={`bg-white p-8 rounded-[40px] border transition-all ${staff.is_active ? 'border-slate-100 shadow-xl shadow-slate-200/50' : 'border-slate-200 opacity-60 grayscale'}`}>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${staff.is_active ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-rose-950 text-lg leading-tight">{staff.name}</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${staff.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                      {staff.is_active ? '● En línea' : '○ Inactivo'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(staff.id)} className="text-slate-300 hover:text-rose-600 transition-colors p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
             </div>
             
             <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="max-w-[120px]">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Google Calendar</p>
                  <p className="text-[10px] font-bold text-rose-700 truncate italic">{staff.google_calendar_id}</p>
                </div>
                <button 
                  onClick={() => handleToggleStatus(staff.id, staff.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${staff.is_active ? 'bg-rose-700' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${staff.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-rose-950/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full border border-rose-50 animate-in fade-in zoom-in duration-200">
            <h2 className="text-3xl font-black text-rose-950 mb-6 tracking-tighter">Nuevo Especialista</h2>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none transition-all placeholder:text-slate-300"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej. Dra. Ana Martínez" />
              </div>
              
<div className="space-y-1">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp del Especialista</label>
  <input 
    className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none transition-all placeholder:text-slate-300"
    value={form.phone} 
    onChange={e => setForm({...form, phone: e.target.value})} 
    placeholder="Ej. 502XXXXXXXX" 
  />
</div>

<div className="space-y-1">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol en el Equipo</label>
  <div className="relative">
    <select 
      className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none appearance-none cursor-pointer"
      value={form.role} 
      onChange={e => setForm({...form, role: e.target.value})}
    >
      <option value="especialista">Especialista (Tiene Agenda)</option>
      <option value="asistente">Asistente / Recepción</option>
      <option value="operador">Operador Logístico</option>
    </select>
    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-300">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
</div>

                <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Calendario</label>
                <div className="relative">
                  <select className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none appearance-none cursor-pointer"
                    value={form.calendarId} onChange={e => setForm({...form, calendarId: e.target.value})}>
                    <option value="">Selecciona un calendario...</option>
                    {calendars.map(cal => (<option key={cal.id} value={cal.id}>{cal.summary}</option>))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-rose-950 transition-colors">Cancelar</button>
                <button onClick={handleSaveSpecialist} disabled={isSaving || !form.name || !form.calendarId} className="flex-1 bg-rose-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 transition-all">
                  {isSaving ? '...' : 'Añadir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-20 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Artemix S.A. • 2026</p>
    </div>
  )
}