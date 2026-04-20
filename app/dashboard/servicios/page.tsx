'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

interface ServiceConfig {
  id: string
  service_name: string
  duration_minutes: number
  price: number
  description: string | null
  is_active: boolean
  buffer_after_minutes: number
}

export default function ServiciosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [services, setServices] = useState<ServiceConfig[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Para el Portero
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [orgData, setOrgData] = useState<any>(null)
  
  // 🚩 Nuevo: Control de visibilidad de precios
  const [showPricesOnChat, setShowPricesOnChat] = useState(true)

  // 🚩 Estado del formulario mejorado
  const [form, setForm] = useState({
    service_name: '',
    duration_hours: 1, // Separado para facilidad
    duration_mins: 0,  // Separado para facilidad
    price: '' as any,  // String para evitar el '0' pegajoso
    description: '',
    buffer_after_minutes: '' as any, // String para evitar el '0' pegajoso
    category: 'General'
  })

  // --- 🚪 EL PORTERO + CARGA ---
  useEffect(() => {
    const fetchAndCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()

      // Validar integridad del camino
      if (!org?.business_type) { router.push('/onboarding'); return; }
      if (!org?.google_calendar_id) { router.push('/onboarding/calendario'); return; }
      if (!org?.public_phone) { router.push('/onboarding/perfil'); return; }

      // Validar si hay horarios (Paso 4)
      const { count: hoursCount } = await supabase
        .from('operating_hours')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)

      if (!hoursCount || hoursCount === 0) {
        router.push('/onboarding/horarios')
        return
      }

      if (org) {
        setOrgData(org)
        // Cargar preferencia de precios si existe en chat_context
        if (org.chat_context?.show_prices !== undefined) {
          setShowPricesOnChat(org.chat_context.show_prices)
        }
        
        const { data } = await supabase
          .from('services_config')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })
        setServices(data || [])
      }
      setIsLoading(false)
    }
    fetchAndCheck()
  }, [supabase, router])

  const handleAddService = async () => {
    setIsLoadingAction(true)
    if (!orgData) return

    // 🚩 Cálculo matemático: Horas a Minutos
    const totalMinutes = (form.duration_hours * 60) + form.duration_mins;

    const { data, error } = await supabase
      .from('services_config')
      .insert([{
        organization_id: orgData.id,
        service_name: form.service_name,
        duration_minutes: totalMinutes,
        price: parseFloat(form.price) || 0,
        description: form.description,
        buffer_after_minutes: parseInt(form.buffer_after_minutes) || 0,
        category: form.category
      }])
      .select()

    if (!error && data) {
      setServices([data[0], ...services])
      setIsModalOpen(false)
      setForm({ service_name: '', duration_hours: 1, duration_mins: 0, price: '', description: '', buffer_after_minutes: '', category: 'General' })
    }
    setIsLoadingAction(false)
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return
    const { error } = await supabase.from('services_config').delete().eq('id', id)
    if (!error) setServices(services.filter(s => s.id !== id))
  }

  const handleContinue = async () => {
    if (!orgData || services.length === 0) return;
    setIsLoadingAction(true);

    try {
        // 🚩 PASO 1: Formatear catálogo respetando el Toggle de precios
        const servicesSummary = services
            .map(s => {
                const priceInfo = showPricesOnChat ? ` (${orgData.currency_symbol}${s.price})` : '';
                return `${s.service_name}${priceInfo}, Duración: ${s.duration_minutes} min`;
            })
            .join(', ');

        const fullAddress = [orgData.address, orgData.municipality, orgData.department].filter(Boolean).join(', ') || "Dirección no especificada";

        // 🚩 PASO 2: Traer plantilla y horarios
        const { data: templateData } = await supabase.from('ai_prompts').select('system_prompt').eq('business_type', orgData.business_type).eq('slug', 'main_assistant').eq('is_active', true).single();
        const { data: hoursData } = await supabase.from('operating_hours').select('*').eq('org_id', orgData.id);

        const scheduleSummary = hoursData.map(h => {
            const dayName = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][h.day_of_week];
            return `${dayName}: ${h.is_closed ? 'Cerrado' : `${h.open_time.substring(0,5)} a ${h.close_time.substring(0,5)}`}`;
        }).join(', ');

        // 🚩 PASO 3: Hidratación Final
        let finalPrompt = templateData?.system_prompt || "";
        finalPrompt = finalPrompt
            .replace(/{{name}}/g, orgData.name)
            .replace(/{{currency}}/g, orgData.currency_symbol)
            .replace(/{{address}}/g, fullAddress)
            .replace(/{{hours}}/g, scheduleSummary)
            .replace(/{{services}}/g, servicesSummary);

        // 🚩 PASO 4: Guardar con preferencia de visibilidad
        const { error: updateError } = await supabase
            .from('organizations')
            .update({
                chat_context: {
                    ...orgData.chat_context,
                    system_prompt: finalPrompt,
                    show_prices: showPricesOnChat // Guardamos la preferencia
                }
            })
            .eq('id', orgData.id);

        if (updateError) throw updateError;
        router.push('/onboarding/planes');

    } catch (error: any) {
        console.error("❌ Error:", error.message);
        alert("Error al finalizar: " + error.message);
    } finally {
        setIsLoadingAction(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12">
      <OnboardingProgress currentStep={5} />

      <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
        <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            <span className="text-rose-700">Tus Servicios</span>
        </h1>
        <p className="text-slate-600 mt-3 font-medium text-lg">Configura lo que VORA ofrecerá a tus clientes.</p>

        {/* 🚩 NUEVO: Toggle de Visibilidad de Precios */}
        <div className="mt-6 flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">¿Vora debe mostrar precios?</span>
            <button 
                onClick={() => setShowPricesOnChat(!showPricesOnChat)}
                className={`w-12 h-6 rounded-full transition-all relative ${showPricesOnChat ? 'bg-rose-600' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showPricesOnChat ? 'right-1' : 'left-1'}`}></div>
            </button>
            <span className="text-[10px] font-black uppercase text-rose-700">{showPricesOnChat ? 'SÍ' : 'NO'}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button onClick={() => setIsModalOpen(true)} className="bg-white text-rose-700 border-2 border-rose-100 px-6 py-3 rounded-2xl font-black hover:bg-rose-50 shadow-sm flex items-center gap-2">
            <span className="text-2xl">+</span> Nuevo Servicio
          </button>
          <button onClick={handleContinue} disabled={services.length === 0 || isLoadingAction} className="bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg disabled:opacity-50">
            {isLoadingAction ? 'Procesando...' : 'Continuar a Planes →'}
          </button>
        </div>
      </header>

      <div className="grid gap-6 w-full max-w-6xl md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 && (
          <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 rounded-[40px] bg-white/50">
            <p className="text-slate-400 font-bold text-lg px-10">Aún no hay servicios.</p>
          </div>
        )}
        
        {services.map(service => (
          <div key={service.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
            <div className="absolute top-4 right-4">
                <button onClick={() => handleDeleteService(service.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
            <div>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full mb-4 inline-block">
                    {service.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <h3 className="font-black text-2xl text-rose-950 mb-2">{service.service_name}</h3>
                <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6">{service.description || 'Sin descripción.'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Precio</span>
                <span className="text-base font-black text-rose-700">{orgData?.currency_symbol}{service.price}</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Tiempo</span>
                <span className="text-base font-bold text-slate-700">{service.duration_minutes}m</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Buffer</span>
                <span className="text-base font-bold text-orange-600">+{service.buffer_after_minutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-rose-950/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-lg w-full border border-rose-50 overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black text-rose-950 mb-6 tracking-tighter">Nuevo Servicio</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                <input className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold outline-none"
                  value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} placeholder="Ej. Manicura Completa" />
              </div>
              
              {/* 🚩 REDISEÑO: Horas y Minutos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas</label>
                    <select 
                        className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold"
                        value={form.duration_hours}
                        onChange={e => setForm({...form, duration_hours: parseInt(e.target.value)})}
                    >
                        {[0,1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} h</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minutos</label>
                    <select 
                        className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold"
                        value={form.duration_mins}
                        onChange={e => setForm({...form, duration_mins: parseInt(e.target.value)})}
                    >
                        {[0,15,30,45].map(m => <option key={m} value={m}>{m} min</option>)}
                    </select>
                </div>
              </div>

<div className="grid grid-cols-2 gap-4 items-end"> {/* 🚩 items-end mantiene los inputs alineados */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block leading-tight">
      Precio ({orgData?.currency_symbol || 'Q'})
    </label>
    <input 
      type="number" 
      className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-rose-700 font-black outline-none focus:border-rose-600 transition-all"
      value={form.price} 
      onChange={e => setForm({...form, price: e.target.value})} 
      placeholder="0.00" 
    />
  </div>

  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block leading-tight">
      Buffer / Limpieza <span className="text-rose-400/60">(min)</span>
    </label>
    <input 
      type="number" 
      className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-orange-600 font-bold outline-none focus:border-rose-600 transition-all"
      value={form.buffer_after_minutes} 
      onChange={e => setForm({...form, buffer_after_minutes: e.target.value})} 
      placeholder="0" 
    />
  </div>
</div>


              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-medium h-24 outline-none"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalles del servicio..." />
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400">Cancelar</button>
                <button onClick={handleAddService} disabled={isLoadingAction || !form.service_name} className="flex-1 bg-rose-700 text-white py-4 rounded-2xl font-black">
                  {isLoadingAction ? 'Guardando...' : 'Crear Servicio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}