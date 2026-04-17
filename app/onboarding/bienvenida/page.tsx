'use client'

import React, { useEffect, useState } from 'react'

// --- Mocks para el entorno de previsualización (Canvas) ---
const useRouter = () => ({
  push: (path: string) => {
    alert(`🚀 Redirigiendo a: ${path}`);
    console.log(`Navegando a: ${path}`);
  }
});

const createClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: { id: 'user_123', user_metadata: { full_name: 'Erick Velásquez' } } } })
  },
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (field: string, value: any) => ({
        single: async () => {
          // 🚩 Cambiado a 'starter' para simular la prueba que acabas de realizar
          return { data: { name: 'VORA AI', subscription_tier: 'starter' } };
        }
      })
    })
  })
});
// --- Fin Mocks ---

export default function BienvenidaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [tier, setTier] = useState('')
  const [displayTier, setDisplayTier] = useState('')

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return;
      
      // Obtenemos el nombre del dueño para un trato más personal (ej: "¡Bienvenido, Erick!")
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const firstName = fullName.split(' ')[0] || 'Emprendedor';
      setUserName(firstName);
      
      const { data } = await supabase
        .from('organizations')
        .select('name, subscription_tier')
        .eq('owner_id', user.id)
        .single()
      
      if (data) {
        setTier(data.subscription_tier)
        
        // 🚩 Normalización Dinámica y Robusta
        const rawTier = data.subscription_tier?.toLowerCase() || '';
        let normalized = 'Business'; // Fallback por defecto
        
        if (rawTier.includes('basic') || rawTier.includes('starter')) {
            normalized = 'Starter';
        } else if (rawTier.includes('standard') || rawTier.includes('business')) {
            normalized = 'Business';
        } else if (rawTier.includes('premium')) {
            normalized = 'Premium';
        } else if (rawTier) {
            // Si es un plan nuevo, solo capitalizamos la primera letra
            normalized = rawTier.charAt(0).toUpperCase() + rawTier.slice(1);
        }
        
        setDisplayTier(normalized)
      }
    }
    fetchOrg()
  }, [])

  // 🚩 LÓGICA DE REDIRECCIÓN CORREGIDA Y ROBUSTA
  const handleNavigation = () => {
    // Normalizamos a minúsculas por seguridad
    const currentTier = tier?.toLowerCase() || '';
    
    // Verificamos si es Business/Standard o Premium
    const isAdvancedPlan = currentTier.includes('business') || 
                           currentTier.includes('standard') || 
                           currentTier.includes('premium');

    if (isAdvancedPlan) {
      //router.push('/onboarding/equipo');
      window.location.assign('/onboarding/equipo');
    } else {
      //router.push('/dashboard/marketing');
      window.location.assign('/dashboard/marketing');

    }
  };

  const currentTier = tier?.toLowerCase() || '';
  const isAdvancedPlan = currentTier.includes('business') || 
                         currentTier.includes('standard') || 
                         currentTier.includes('premium');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative font-sans selection:bg-rose-100 selection:text-rose-900">
      
      {/* Animación de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-6 h-6 bg-rose-400 rounded-full animate-ping opacity-20" />
        <div className="absolute top-1/4 right-20 w-8 h-8 bg-rose-600 rounded-full animate-bounce opacity-10" />
        <div className="absolute bottom-20 left-1/3 w-4 h-4 bg-rose-200 rounded-full animate-pulse opacity-30" />
        <div className="absolute top-1/2 left-1/4 w-10 h-10 bg-rose-300 rounded-full animate-pulse opacity-10" />
      </div>
      
      {/* TARJETA MÁS ANCHA Y CON ESPACIADO PROPORCIONAL */}
      <div className="max-w-2xl w-full space-y-10 animate-in fade-in zoom-in duration-700 relative z-10 bg-white p-12 md:p-16 rounded-[48px] shadow-2xl shadow-rose-900/5 border border-rose-50">
        
        {/* Ícono más grande */}
        <div className="w-32 h-32 bg-gradient-to-br from-rose-100 to-rose-50 rounded-[40px] flex items-center justify-center mx-auto shadow-inner border border-rose-100">
           <span className="text-7xl">🎁</span>
        </div>

        <div className="space-y-6">
          {/* Badge más visible */}
          <div className="inline-flex items-center gap-3 bg-green-50 text-green-700 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border border-green-200 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Prueba de 30 días Activada
          </div>

          {/* Título más imponente, usando el nombre del usuario en masculino */}
          <h1 className="text-5xl md:text-6xl font-black text-rose-950 tracking-tighter leading-tight">
            ¡Bienvenido, <br/><span className="text-rose-700">{userName}</span>!
          </h1>
          
          {/* Subtítulo ajustado */}
          <p className="text-slate-500 font-medium text-xl md:text-2xl text-balance">
            Tu plan <span className="text-rose-700 font-black uppercase tracking-widest">{displayTier}</span> está listo para revolucionar tu negocio.
          </p>
        </div>

        {/* Caja de información más amplia y legible */}
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 text-base md:text-lg text-slate-500 font-medium leading-relaxed">
          <p>
            ✅ Tu método de pago fue validado exitosamente por <strong className="text-slate-800">$0.00</strong>.
          </p>
          <p className="mt-3">
            Disfruta de automatización total sin costo durante este primer mes. Has dado el paso más importante hacia tu libertad de tiempo.
          </p>
        </div>

        {/* Botón funcional de Next.js */}
        <button 
          onClick={handleNavigation}
          className="w-full bg-rose-700 bg-gradient-to-r from-rose-700 to-rose-600 text-white py-6 md:py-7 rounded-[28px] font-black text-2xl hover:bg-rose-800 transition-all shadow-2xl shadow-rose-900/20 active:scale-95 flex items-center justify-center gap-3"
        >
          {isAdvancedPlan ? 'Configurar mi Equipo 👥' : 'Ir a Marketing 🚀'}
        </button>
      </div>

      <p className="absolute bottom-8 text-[11px] text-slate-400 font-black uppercase tracking-[0.4em]">
        Artemix S.A. • Guatemala • 2026
      </p>
    </div>
  )
}