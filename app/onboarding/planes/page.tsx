'use client'

import React, { useState } from 'react'

/** * 🚩 NUEVA ESTRATEGIA: "SOFT TRIAL" vs "HARD TRIAL"
 * - Botón WhatsApp -> 7 Días Gratis (Sin Tarjeta)
 * - Botón Suscripción -> 30 Días Gratis (Con Tarjeta, $0.00 hoy)
 */

// --- SIMULADORES PARA VISTA PREVIA (BORRAR EN LOCAL) ---
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

const mockSupabase = {
  auth: {
    getUser: async () => ({ data: { user: { id: 'user_123', email: 'erick.velasquez@artemix.com' } } })
  },
  from: () => ({
    update: (data: any) => ({
      eq: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vora_selected_plan', data.subscription_tier);
          localStorage.setItem('vora_billing_cycle', data.billing_cycle);
        }
        return { error: null };
      }
    })
  })
};
// --- FIN SIMULADORES ---

const PLANS = [
  { 
    id: 'starter', 
    name: 'Starter', 
    monthlyPrice: 19.99, 
    yearlyPrice: 219.89, 
    desc: 'Ideal para independientes y pequeños salones.' 
  },
  { 
    id: 'business', 
    name: 'Business', 
    monthlyPrice: 39.99, 
    yearlyPrice: 455.89, 
    desc: 'Diseñado para clínicas y salones de belleza con staff de 1 a 3 especialistas.' 
  },
  { 
    id: 'premium', 
    name: 'Premium', 
    monthlyPrice: 69.99, 
    yearlyPrice: 797.89, 
    desc: 'Gestión total, IA avanzada y soporte prioritario. con staff de 1 a 7 especialistas.' 
  }
]

export default function App() {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const handleConfirmPlan = async (mode: 'trial_soft' | 'trial_hard') => {
    setLoading(true)
    try {
      const { data: { user } } = await mockSupabase.auth.getUser()
      const trialDays = mode === 'trial_soft' ? 7 : 30; // 7 días soft vs 30 días hard
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + trialDays);

      await mockSupabase.from().update({ 
        subscription_tier: selectedPlan,
        billing_cycle: billingCycle,
        subscription_plan: 'free_trial',
        subscription_status: 'active',
        subscription_expires_at: trialExpiry.toISOString(),
        updated_at: new Date().toISOString()
      }).eq();

      if (mode === 'trial_soft') {
        const waMsg = encodeURIComponent(`¡Hola VORA! Vengo de elegir el plan ${selectedPlan} (${billingCycle}). Mi correo es ${user?.email}. ¡Quiero empezar mis 7 días gratis sin tarjeta!`);
        window.location.assign(`https://wa.me/50251151814?text=${waMsg}`);
      } else {
        // Redirigir a la pantalla de pago seguro donde verán "$0.00 hoy"
        window.location.assign('/dashboard/suscripcion');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center font-sans">
        <OnboardingProgress currentStep={6} />

        <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            Selecciona tu <span className="text-rose-700">Plan</span>
          </h1>
          <p className="text-slate-600 mt-3 font-medium text-lg text-balance">
            Estás a un paso de revolucionar tu atención al cliente. Elige cómo quieres comenzar.
          </p>
        </header>

        <div className="flex justify-center mb-16">
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center shadow-sm">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-10 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest ${billingCycle === 'monthly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-950'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-10 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-950'}`}
            >
              Anual 
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${billingCycle === 'yearly' ? 'bg-rose-500 text-white' : 'bg-green-100 text-green-600'}`}>
                Ahorra más
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
          {PLANS.map(plan => {
            const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : (plan.yearlyPrice / 12).toFixed(2);
            const isSelected = selectedPlan === plan.id;

            return (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`group p-8 rounded-[40px] border-4 cursor-pointer transition-all flex flex-col justify-between h-full relative ${
                  isSelected 
                  ? 'border-rose-700 bg-white shadow-xl shadow-slate-200 scale-105 z-10' 
                  : 'border-white bg-white/60 hover:border-rose-100 shadow-sm'
                }`}
              >
                 <div>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${isSelected ? 'text-rose-700' : 'text-slate-400'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-5xl font-black text-rose-950 tracking-tighter">${displayPrice}</span>
                      <span className="text-slate-400 font-bold">/mes</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-rose-600 font-black mb-6 uppercase tracking-tight">
                        Facturado anualmente (${plan.yearlyPrice})
                      </p>
                    )}
                    <p className="text-slate-500 font-medium leading-relaxed mb-8 mt-4">
                      {plan.desc}
                    </p>
                 </div>
                 
                 <div className={`w-full py-4 rounded-2xl font-black text-center transition-all ${
                   isSelected 
                   ? 'bg-rose-700 text-white shadow-lg shadow-slate-200' 
                   : 'bg-slate-100 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-700'
                 }`}>
                   {isSelected ? 'Plan Seleccionado' : 'Elegir Plan'}
                 </div>
              </div>
            )
          })}
        </div>

        <div className="mt-20 flex flex-col items-center gap-5 w-full max-w-md">
          <button 
            onClick={() => handleConfirmPlan('trial_soft')}
            disabled={loading}
            className="w-full py-5 bg-white border-2 border-rose-200 text-rose-700 rounded-2xl font-black text-xl hover:bg-rose-50 transition-all active:scale-95 shadow-sm shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Activando...' : '🚀 Empezar Prueba de 7 Días'}
          </button>

          <button 
            onClick={() => handleConfirmPlan('trial_hard')}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-rose-700 to-rose-600 text-white rounded-2xl font-black transition-all hover:shadow-xl hover:shadow-rose-900/20 active:scale-95 flex flex-col items-center justify-center disabled:opacity-50 group relative overflow-hidden"
          >
            <span className="text-xl tracking-tight relative z-10">Desbloquear 30 Días Gratis 🎁</span>
            <span className="text-[10px] uppercase tracking-widest mt-1 text-rose-200 font-bold relative z-10">
              Registra tu tarjeta ahora. Primer cobro en 30 días.
            </span>
          </button>
        </div>

        <p className="mt-20 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] text-center">
          Artemix S.A. • 2026
        </p>
    </div>
  )
}