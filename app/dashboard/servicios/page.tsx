'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import { Edit3, Plus, Trash2, Zap, Save, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'

interface ServiceConfig {
  id: string
  service_name: string
  duration_minutes: number
  price: number
  description: string | null
  is_active: boolean
  buffer_after_minutes: number
  category: string
}

export default function ServiciosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [services, setServices] = useState<ServiceConfig[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true) 
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [orgData, setOrgData] = useState<any>(null)
  const [isManagementMode, setIsManagementMode] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [showPricesOnChat, setShowPricesOnChat] = useState(true)

  const [form, setForm] = useState({
    service_name: '',
    duration_hours: 1, 
    duration_mins: 0,  
    price: '' as any,  
    description: '',
    buffer_after_minutes: '' as any, 
    category: 'General'
  })

  // --- 🚪 PORTERO HÍBRIDO ---
  useEffect(() => {
    const fetchAndCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()

      if (org) {
        setOrgData(org)
        const active = org.subscription_status === 'active'
        setIsManagementMode(active)

        if (org.chat_context?.show_prices !== undefined) {
          setShowPricesOnChat(org.chat_context.show_prices)
        }

        const { data: servicesData } = await supabase
          .from('services_config')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })

        setServices(servicesData || [])

        if (!active && servicesData && servicesData.length > 0) {
          router.push('/onboarding/planes')
          return
        }
      }
      setIsLoading(false)
    }
    fetchAndCheck()
  }, [supabase, router])

  const resetForm = () => {
    setForm({ service_name: '', duration_hours: 1, duration_mins: 0, price: '', description: '', buffer_after_minutes: '', category: 'General' })
    setEditingServiceId(null)
  }

  const openEditModal = (service: ServiceConfig) => {
    setEditingServiceId(service.id)
    setForm({
      service_name: service.service_name,
      duration_hours: Math.floor(service.duration_minutes / 60),
      duration_mins: service.duration_minutes % 60,
      price: service.price.toString(),
      description: service.description || '',
      buffer_after_minutes: service.buffer_after_minutes.toString(),
      category: service.category || 'General'
    })
    setIsModalOpen(true)
  }

  const handleSaveService = async () => {
    setIsLoadingAction(true)
    if (!orgData) return

    const totalMinutes = (form.duration_hours * 60) + form.duration_mins;
    const servicePayload = {
      organization_id: orgData.id,
      service_name: form.service_name,
      duration_minutes: totalMinutes,
      price: parseFloat(form.price) || 0,
      description: form.description,
      buffer_after_minutes: parseInt(form.buffer_after_minutes) || 0,
      category: form.category
    }

    if (editingServiceId) {
      await supabase.from('services_config').update(servicePayload).eq('id', editingServiceId)
      setServices(services.map(s => s.id === editingServiceId ? { ...s, ...servicePayload } : s))
    } else {
      const { data } = await supabase.from('services_config').insert([servicePayload]).select()
      if (data) setServices([data[0], ...services])
    }

    setIsModalOpen(false)
    resetForm()
    setIsLoadingAction(false)
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return
    const { error } = await supabase.from('services_config').delete().eq('id', id)
    if (!error) setServices(services.filter(s => s.id !== id))
  }

  const handleSyncWithAI = async () => {
    if (!orgData || services.length === 0) return;
    setIsLoadingAction(true);

    try {
      const servicesSummary = services
        .map(s => `${s.service_name}${showPricesOnChat ? ` (${orgData.currency_symbol}${s.price})` : ''}, Duración: ${s.duration_minutes} min`)
        .join(', ');

      const { data: templateData } = await supabase.from('ai_prompts').select('system_prompt').eq('business_type', orgData.business_type).eq('slug', 'main_assistant').eq('is_active', true).single();
      const { data: hoursData } = await supabase.from('operating_hours').select('*').eq('org_id', orgData.id);

      const scheduleSummary = hoursData.map(h => {
        const dayName = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][h.day_of_week];
        return `${dayName}: ${h.is_closed ? 'Cerrado' : `${h.open_time.substring(0,5)} a ${h.close_time.substring(0,5)}`}`;
      }).join(', ');

      let finalPrompt = templateData?.system_prompt || "";
      finalPrompt = finalPrompt
        .replace(/{{name}}/g, orgData.name)
        .replace(/{{currency}}/g, orgData.currency_symbol)
        .replace(/{{address}}/g, orgData.address)
        .replace(/{{hours}}/g, scheduleSummary)
        .replace(/{{services}}/g, servicesSummary);

      await supabase.from('organizations').update({
        chat_context: { ...orgData.chat_context, system_prompt: finalPrompt, show_prices: showPricesOnChat }
      }).eq('id', orgData.id);

      if (isManagementMode) alert("✨ VORA sincronizada correctamente.");
      else router.push('/onboarding/planes');

    } catch (error) { console.error(error); } 
    finally { setIsLoadingAction(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="animate-spin h-10 w-10 border-b-2 border-emerald-600"></span>
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col items-center ${isManagementMode ? 'p-2' : 'p-6 md:p-12'}`}>
      
      {!isManagementMode && <OnboardingProgress currentStep={5} />}

      <header className="mb-12 text-center flex flex-col items-center max-w-4xl w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Catálogo de Servicios VORA</span>
        </div>
        
        <h1 className="text-4xl font-black text-slate-950 tracking-tighter leading-tight">
            {isManagementMode ? 'Mis ' : 'Configurar '} <span className="text-emerald-600 italic">Servicios</span>
        </h1>
        
        <p className="text-slate-500 mt-4 font-medium text-lg max-w-xl">
          {isManagementMode ? 'Administra tu oferta comercial y sincroniza con la IA.' : 'Define los servicios que VORA agendará automáticamente.'}
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-10 w-full">
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-[24px] font-bold hover:bg-slate-50 shadow-sm flex items-center gap-3 transition-all active:scale-95">
            <Plus size={20} className="text-emerald-600" strokeWidth={3} /> Nuevo Servicio
          </button>
          
          <button onClick={handleSyncWithAI} disabled={services.length === 0 || isLoadingAction} className="bg-slate-950 text-white px-10 py-4 rounded-[24px] font-bold shadow-xl disabled:opacity-50 flex items-center gap-3 transition-all hover:bg-slate-900 active:scale-95">
            {isManagementMode ? <><Zap size={18} className="text-rose-500" /> Sincronizar VORA</> : 'Continuar a Planes →'}
          </button>
        </div>
        
        {/* Toggle Estilo Sigiloso */}
        <div className="mt-8 flex items-center gap-4 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-100 shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Mostrar precios en chat</span>
            <button onClick={() => setShowPricesOnChat(!showPricesOnChat)} className={`w-10 h-5 rounded-full transition-all relative ${showPricesOnChat ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${showPricesOnChat ? 'right-1' : 'left-1'}`}></div>
            </button>
            <span className={`text-[9px] font-black uppercase ${showPricesOnChat ? 'text-emerald-600' : 'text-slate-400'}`}>{showPricesOnChat ? 'SÍ' : 'NO'}</span>
        </div>
      </header>

      {/* GRID BENTO STYLE */}
      <div className="grid gap-6 w-full max-w-7xl md:grid-cols-2 lg:grid-cols-3 pb-20">
        {services.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-[48px] bg-white/50">
            <p className="text-slate-400 font-bold text-lg">Carga tus servicios para comenzar.</p>
          </div>
        )}
        
        {services.map(service => (
          <div key={service.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-emerald-100 transition-all relative flex flex-col justify-between group">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(service)} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 transition-all"><Edit3 size={18} /></button>
                <button onClick={() => handleDeleteService(service.id)} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
            </div>
            <div>
                <div className="flex items-center gap-2 mb-6">
                  {service.is_active ? 
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full"><CheckCircle2 size={10} strokeWidth={3} /><span className="text-[9px] font-black uppercase tracking-widest">Activo</span></div>
                    : 
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full"><XCircle size={10} strokeWidth={3} /><span className="text-[9px] font-black uppercase tracking-widest">Pausado</span></div>
                  }
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{service.category || 'General'}</span>
                </div>
                <h3 className="font-black text-3xl text-slate-900 mb-3 tracking-tighter leading-tight">{service.service_name}</h3>
                <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-8 leading-relaxed">{service.description || 'Sin descripción.'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Precio</span>
                <span className="text-xl font-black text-rose-600 italic">{orgData?.currency_symbol}{service.price}</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-4">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Tiempo</span>
                <span className="text-lg font-bold text-slate-900">{service.duration_minutes}m</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-4">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Buffer</span>
                <span className="text-lg font-bold text-emerald-500">+{service.buffer_after_minutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL REFORMADO (Mejor espaciado) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[56px] shadow-2xl p-12 max-w-xl w-full border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-1 bg-emerald-500 rounded-full"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Editor de Servicios</span>
            </div>
            <h2 className="text-4xl font-black text-slate-950 mb-8 tracking-tighter">
              {editingServiceId ? 'Actualizar ' : 'Crear '} <span className="text-emerald-600 italic">Servicio</span>
            </h2>
            <div className="space-y-8"> {/* Mayor espaciado entre bloques */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Servicio</label>
                <input className="w-full bg-slate-50 border-slate-100 border-2 rounded-[24px] p-5 text-slate-900 font-bold outline-none focus:border-emerald-400 transition-all text-lg"
                  value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} placeholder="Ej. Manicura Gel" />
              </div>

              {/* GRID SEPARADO: Duración y Precio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> 
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duración Total</label>
                    <div className="flex gap-2">
                      <select className="flex-1 bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-slate-900 font-bold outline-none focus:border-emerald-400" value={form.duration_hours} onChange={e => setForm({...form, duration_hours: parseInt(e.target.value)})}>{[0,1,2,3,4,5].map(h => <option key={h} value={h}>{h} h</option>)}</select>
                      <select className="flex-1 bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-slate-900 font-bold outline-none focus:border-emerald-400" value={form.duration_mins} onChange={e => setForm({...form, duration_mins: parseInt(e.target.value)})}>{[0,15,30,45].map(m => <option key={m} value={m}>{m} m</option>)}</select>
                    </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ({orgData?.currency_symbol || 'Q'})</label>
                  <input type="number" className="w-full bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-rose-600 font-black outline-none focus:border-rose-400 transition-all text-lg" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción para VORA</label>
                <textarea className="w-full bg-slate-50 border border-slate-100 border-2 rounded-[24px] p-5 text-slate-900 font-medium h-32 outline-none focus:border-emerald-400 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe el servicio..." />
              </div>

              <div className="flex gap-4 mt-10">
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest">Cerrar</button>
                <button onClick={handleSaveService} disabled={isLoadingAction || !form.service_name} className="flex-[2] bg-slate-950 text-white py-5 rounded-[24px] font-black shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"><Save size={20} /> {isLoadingAction ? 'Guardando...' : (editingServiceId ? 'Actualizar' : 'Confirmar')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}