'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const OnboardingProgress = ({ currentStep }: { currentStep: number }) => (
  <div className="w-full max-w-xl mb-8">
    <div className="flex justify-between mb-2">
      <span className="text-xs font-black text-rose-700 uppercase tracking-widest">Paso {currentStep} de 7</span>
      <span className="text-xs font-black text-rose-700 uppercase tracking-widest">{Math.round((currentStep/7)*100)}%</span>
    </div>
    <div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
      <div className="h-full bg-rose-700 transition-all duration-500" style={{ width: `${(currentStep/7)*100}%` }} />
    </div>
  </div>
);

const PLANS = [
  { id: 'starter', name: 'Starter', monthlyPrice: 19.99, yearlyPrice: 219.89, desc: 'Ideal para independientes y pequeños salones.' },
  { id: 'business', name: 'Business', monthlyPrice: 39.99, yearlyPrice: 455.89, desc: 'Diseñado para clínicas y salones de belleza con staff de 1 a 3 especialistas.' },
  { id: 'premium', name: 'Premium', monthlyPrice: 69.99, yearlyPrice: 797.89, desc: 'Gestión total, IA avanzada y soporte prioritario con staff de 1 a 7 especialistas.' }
]

export default function PlanesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // --- 🚪 EL PORTERO LINEAL (Paso 6/7) ---
  useEffect(() => {
    const checkOnboardingIntegrity = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()

      // 1. VALIDACIÓN HACIA ATRÁS (Cascada)
      if (!org?.business_type) { router.push('/onboarding'); return; }
      if (!org?.google_calendar_id) { router.push('/dashboard/calendario'); return; }
      if (!org?.public_phone || !org?.address) { router.push('/onboarding/perfil'); return; }

      // Validar Paso 4: Horarios
      const { count: hoursCount } = await supabase
        .from('operating_hours')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
      if (!hoursCount || hoursCount === 0) { router.push('/dashboard/horarios'); return; }

      // Validar Paso 5: Servicios
      const { count: servicesCount } = await supabase
        .from('services_config')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
      if (!servicesCount || servicesCount === 0) { router.push('/dashboard/servicios'); return; }

      // 2. VALIDACIÓN HACIA ADELANTE (Ruptura del bucle)
      // Si ya tiene un plan pendiente o activo, saltamos al Paso 7 (Suscripción/Checkout)
      if (org.subscription_status === 'pending_payment') {
        console.log("✅ Plan pendiente detectado. Avanzando al Checkout...");
        router.push('/dashboard/suscripcion'); 
        return;
      }

      if (org.subscription_status === 'active') {
        console.log("✅ Usuario ya activo. Redirigiendo al Dashboard...");
        router.push('/dashboard/calendario'); 
        return;
      }

      setLoading(false)
    }

    checkOnboardingIntegrity()
  }, [supabase, router])

  const handleConfirmPlan = async (mode: 'trial_soft' | 'trial_hard') => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesión activa")

      const trialDays = mode === 'trial_soft' ? 7 : 30
      const trialExpiry = new Date()
      trialExpiry.setDate(trialExpiry.getDate() + trialDays)

      // El estado 'pending_payment' permite que el paso 7 lo deje entrar
      const newStatus = mode === 'trial_soft' ? 'active' : 'pending_payment';

      const { error } = await supabase
        .from('organizations')
        .update({ 
          subscription_tier: selectedPlan,
          billing_cycle: billingCycle,
          subscription_plan: 'free_trial',
          subscription_status: newStatus,
          subscription_expires_at: trialExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user.id)

      if (error) throw error

      if (mode === 'trial_soft') {
        const waMsg = encodeURIComponent(`¡Hola VORA! Elegí el plan ${selectedPlan} (${billingCycle}). Mi correo es ${user.email}. ¡Quiero mis 7 días gratis!`);
        window.location.assign(`https://wa.me/50251151814?text=${waMsg}`);
      } else {
        // Redirección lineal al Paso 7 (Checkout de Tarjeta)
        router.push('/dashboard/suscripcion'); 
      }
    } catch (err: any) {
      console.error("Error al guardar plan:", err.message)
      alert("Error al actualizar el plan.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center font-sans">
        <OnboardingProgress currentStep={6} />

        <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight text-balance">
            Selecciona tu <span className="text-rose-700">Plan</span>
          </h1>
          <p className="text-slate-600 mt-3 font-medium text-lg text-balance">
            Elige cómo quieres comenzar tu experiencia con VORA.
          </p>
        </header>

        <div className="flex justify-center mb-16">
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center shadow-sm">
            <button onClick={() => setBillingCycle('monthly')} className={`px-10 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest ${billingCycle === 'monthly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400'}`}>Mensual</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-10 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400'}`}>
              Anual 
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${billingCycle === 'yearly' ? 'bg-rose-500 text-white' : 'bg-green-100 text-green-600'}`}>Ahorra más</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
          {PLANS.map(plan => {
            const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : (plan.yearlyPrice / 12).toFixed(2);
            const isSelected = selectedPlan === plan.id;
            return (
              <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`p-8 rounded-[40px] border-4 cursor-pointer transition-all flex flex-col justify-between h-full ${isSelected ? 'border-rose-700 bg-white shadow-xl scale-105' : 'border-white bg-white/60 shadow-sm'}`}>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${isSelected ? 'text-rose-700' : 'text-slate-400'}`}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-5xl font-black text-rose-950 tracking-tighter">${displayPrice}</span>
                      <span className="text-slate-400 font-bold">/mes</span>
                    </div>
                    {billingCycle === 'yearly' && <p className="text-xs text-rose-600 font-black mb-6 uppercase tracking-tight">Total anual: ${plan.yearlyPrice}</p>}
                    <p className="text-slate-500 font-medium leading-relaxed mb-8 mt-4">{plan.desc}</p>
                  </div>
                  <div className={`w-full py-4 rounded-2xl font-black text-center transition-all ${isSelected ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{isSelected ? 'Seleccionado' : 'Elegir'}</div>
              </div>
            )
          })}
        </div>

        <div className="mt-20 flex flex-col items-center gap-5 w-full max-w-md">
          <button onClick={() => handleConfirmPlan('trial_soft')} disabled={loading} className="w-full py-5 bg-white border-2 border-rose-200 text-rose-700 rounded-2xl font-black text-xl hover:bg-rose-50 shadow-sm disabled:opacity-50">
            🚀 Prueba de 7 Días (Sin tarjeta)
          </button>
          <button onClick={() => handleConfirmPlan('trial_hard')} disabled={loading} className="w-full py-5 bg-gradient-to-r from-rose-700 to-rose-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-50 flex flex-col items-center">
            <span className="text-xl tracking-tight">30 Días Gratis 🎁</span>
            <span className="text-[10px] uppercase tracking-widest mt-1 text-rose-200 font-bold">Requiere registro de tarjeta ($0.00 hoy)</span>
          </button>
        </div>
    </div>
  )
}