'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
// 🚩 Importación del componente global
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
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [orgData, setOrgData] = useState<{id: string, currency_symbol: string, country_code: string} | null>(null)

  const [form, setForm] = useState({
    service_name: '',
    duration_minutes: 60,
    price: 0,
    description: '',
    buffer_after_minutes: 0,
    category: 'General'
  })

  // --- LÓGICA (INTACTA) ---
  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, currency_symbol, country_code, address, municipality, department, business_type, chat_context') // 🚩 Agregamos los campos faltantes
      .eq('owner_id', user.id)
      .single()


    if (org) {
      setOrgData(org)
      const { data } = await supabase
        .from('services_config')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
      setServices(data || [])
    }
  }

  const handleAddService = async () => {
    setIsLoadingAction(true)
    if (!orgData) return

    const { data, error } = await supabase
      .from('services_config')
      .insert([{
        organization_id: orgData.id,
        service_name: form.service_name,
        duration_minutes: form.duration_minutes,
        price: form.price,
        description: form.description,
        buffer_after_minutes: form.buffer_after_minutes,
        category: form.category
      }])
      .select()

    if (!error && data) {
      setServices([data[0], ...services])
      setIsModalOpen(false)
      setForm({ service_name: '', duration_minutes: 60, price: 0, description: '', buffer_after_minutes: 0, category: 'General' })
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
        // 🚩 PASO 1: Formatear el catálogo de servicios para la IA
        // Creamos una lista clara: "Servicio (Precio, Duración)"
        const servicesSummary = services
            .map(s => `${s.service_name} (${orgData.currency_symbol}${s.price}, ${s.duration_minutes} min)`)
            .join(', ');

        // 🚩 PASO 2: Obtener los datos actuales de logística (Dirección)
        // Usamos los campos de dirección que ya están en tu tabla organizations
        //const fullAddress = `${orgData.address}, ${orgData.municipality}, ${orgData.department}`;
        
const fullAddress = [
    orgData.address, 
    orgData.municipality, 
    orgData.department
].filter(Boolean).join(', ') || "Dirección no especificada";


        // 🚩 PASO 3: Traer la plantilla maestra (Iron-Clad Logic)
        const { data: templateData } = await supabase
            .from('ai_prompts')
            .select('system_prompt')
            .eq('business_type', orgData.business_type)
            .eq('slug', 'main_assistant')
            .eq('is_active', true)
            .single();

        // 🚩 PASO 4: Obtener el resumen de horarios (lo que acabamos de hacer en el paso anterior)
        const { data: hoursData } = await supabase
            .from('operating_hours')
            .select('*')
            .eq('org_id', orgData.id);

        const scheduleSummary = hoursData
            .map(h => {
                const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][h.day_of_week];
                return `${dayName}: ${h.is_closed ? 'Cerrado' : `${h.open_time.substring(0,5)} a ${h.close_time.substring(0,5)}`}`;
            })
            .join(', ');

        // 🚩 PASO 5: Hidratación FINAL y TOTAL
        let finalPrompt = templateData?.system_prompt || "";

        finalPrompt = finalPrompt
            .replace(/{{name}}/g, orgData.name)
            .replace(/{{currency}}/g, orgData.currency_symbol)
            .replace(/{{address}}/g, fullAddress)
            .replace(/{{hours}}/g, scheduleSummary)
            .replace(/{{services}}/g, servicesSummary);

        // 🚩 PASO 6: Guardar el cerebro 100% operativo
        const { error: updateError } = await supabase
            .from('organizations')
            .update({
                chat_context: {
                    ...orgData.chat_context,
                    system_prompt: finalPrompt
                }
            })
            .eq('id', orgData.id);

        if (updateError) throw updateError;

        console.log("🚀 VORA está 100% hidratada y lista.");
        router.push('/onboarding/planes');

    } catch (error) {
        console.error("❌ Error en hidratación final:", error.message);
        alert("Error al finalizar configuración: " + error.message);
    } finally {
        setIsLoadingAction(false);
    }
}; 




  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12">
      
      {/* 🚩 NUEVA BARRA GLOBAL: Paso 5 de 7 */}
      <OnboardingProgress currentStep={5} />

      {/* Header Centrado */}
      <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
        <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            <span className="text-rose-700">Tus Servicios</span>
        </h1>
        <p className="text-slate-600 mt-3 font-medium text-lg">
          Configura lo que VORA ofrecerá a tus clientes.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-rose-700 border-2 border-rose-100 px-6 py-3 rounded-2xl font-black hover:bg-rose-50 transition-all shadow-sm flex items-center gap-2"
          >
            <span className="text-2xl leading-none">+</span> Nuevo Servicio
          </button>

<button 
    onClick={handleContinue} // 🚩 Cambio: de router.push a handleContinue
    disabled={services.length === 0 || isLoadingAction}
    className="bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-rose-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
  >
    {isLoadingAction ? 'Procesando...' : 'Continuar a Planes →'}
  </button>


        </div>
      </header>

      {/* Grid de Servicios */}
      <div className="grid gap-6 w-full max-w-6xl md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 && (
          <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 rounded-[40px] bg-white/50">
            <p className="text-slate-400 font-bold text-lg px-10">Aún no hay servicios. Dale clic a "Nuevo Servicio" para comenzar.</p>
          </div>
        )}
        
        {services.map(service => (
          <div key={service.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
            <div className="absolute top-4 right-4">
                <button onClick={() => handleDeleteService(service.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>

            <div>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full mb-4 inline-block">
                    {service.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <h3 className="font-black text-2xl text-rose-950 mb-2">{service.service_name}</h3>
                <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6">
                    {service.description || 'Sin descripción.'}
                </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Precio</span>
                <span className="text-base font-black text-rose-700">
                  {orgData?.currency_symbol}{service.price}
                </span>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-rose-950/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-lg w-full border border-rose-50 overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black text-rose-950 mb-6 tracking-tighter">Nuevo Servicio</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                <input className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none transition-all"
                  value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} placeholder="Ej. Manicura Completa" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-medium focus:border-rose-600 outline-none resize-none h-24 transition-all"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalles que el cliente debe saber..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duración (min)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none"
                    value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ({orgData?.currency_symbol || 'Q'})</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-rose-700 font-black focus:border-rose-600 outline-none"
                    value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buffer / Limpieza (min)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-orange-600 font-bold focus:border-rose-600 outline-none"
                  value={form.buffer_after_minutes} onChange={e => setForm({...form, buffer_after_minutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-rose-950 transition-colors">Cancelar</button>
                <button onClick={handleAddService} disabled={isLoadingAction || !form.service_name} className="flex-1 bg-rose-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-rose-800 transition-all active:scale-95">
                  {isLoadingAction ? 'Guardando...' : 'Crear Servicio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        Artemix S.A. • 2026
      </p>
    </div>
  )
}