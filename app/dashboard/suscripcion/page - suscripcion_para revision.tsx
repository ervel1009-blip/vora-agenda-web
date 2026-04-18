"use client"

import React, { useState, useEffect } from 'react'
/**
 * NOTA PARA EL CANVA: El error de "Could not resolve" es normal en esta previsualización
 * ya que el entorno no tiene acceso a tus archivos locales. 
 * El alias '@/lib/supabase/client' es el correcto para tu proyecto en Vercel/GitHub.
 */
import { createClient } from '@/lib/supabase/client'

const OnboardingProgress = ({ currentStep }: { currentStep: number }) => (
  <div className="w-full max-w-5xl mb-8">
    <div className="flex justify-between mb-2">
      {[1, 2, 3, 4, 5, 6, 7].map((step) => (
        <div key={step} className={`h-2 flex-1 mx-1 rounded-full ${step <= currentStep ? 'bg-rose-600' : 'bg-slate-200'}`} />
      ))}
    </div>
    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
      <span>Paso {currentStep} de 7</span>
    </div>
  </div>
);

const PRICING: { [key: string]: { monthly: number, yearly: number, label: string } } = {
  starter: { monthly: 19.99, yearly: 219.89, label: 'Starter' },
  business: { monthly: 39.99, yearly: 455.89, label: 'Business' },
  premium: { monthly: 69.99, yearly: 797.89, label: 'Premium' }
}

export default function SuscripcionPage() {
  const supabase = createClient();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  const FREE_TRIAL_DAYS = 30; 

  useEffect(() => {
    const syncPlanData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return;
        setUser(session.user)

        // 🔍 Obtenemos los datos actualizados de la organización
        const { data: org } = await supabase
          .from('organizations')
          .select('id, subscription_tier, billing_cycle')
          .eq('owner_id', session.user.id)
          .single()
        
        if (org) {
          setOrgId(org.id);
          
          /**
           * 🚩 MAPEO DINÁMICO MEJORADO:
           * Mapeamos tanto nombres antiguos (basic/standard) como nuevos (starter/business)
           * para que el estado de la interfaz coincida con lo que elegiste.
           */
          const dbTier = org.subscription_tier?.toLowerCase() || 'starter';
          let finalTier = 'starter';

          if (dbTier === 'basic' || dbTier === 'starter') {
            finalTier = 'starter';
          } else if (dbTier === 'standard' || dbTier === 'business') {
            finalTier = 'business';
          } else if (dbTier === 'premium') {
            finalTier = 'premium';
          }

          setPlanTier(finalTier);

          if (org.billing_cycle === 'yearly') {
            setBillingCycle('yearly');
          } else {
            setBillingCycle('monthly');
          }
        }
      } catch (err) {
        console.error("Error sincronizando plan:", err)
      }
    }
    syncPlanData()
  }, [supabase])

  const currentPlan = PRICING[planTier] || PRICING.starter;
  const basePrice = billingCycle === 'monthly' ? currentPlan.monthly : currentPlan.yearly;

  const getFirstChargeDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + FREE_TRIAL_DAYS);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const handleCheckout = async () => {
    if (isLoading || !user || !orgId) return
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('create-recurrente-checkout', {
        body: {
          orgId: orgId,
          planTier: planTier,
          billingCycle: billingCycle,
          userEmail: user.email,
          strategy: "hard_trial_30_days"
        }
      })

      if (error) throw new Error(error.message);

      if (data?.checkout_url) {
        window.location.assign(data.checkout_url)
      } else {
        throw new Error("No se recibió la URL de pago.")
      }
    } catch (err: any) {
      alert(`⚠️ Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-rose-100 selection:text-rose-900">
      <OnboardingProgress currentStep={7} />
      
      {!user && (
        <div className="mb-8 p-4 bg-white border-2 border-amber-200 rounded-3xl shadow-lg text-amber-900 text-sm font-bold flex items-center gap-4 animate-pulse">
           <span>🔐 Sesión inactiva en este dominio. Por favor, inicia sesión.</span>
           <button onClick={() => window.location.assign('/login')} className="bg-rose-700 text-white px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest">Login</button>
        </div>
      )}

      <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-black text-rose-950 tracking-tighter leading-tight">
          Tu Plan <span className="text-rose-700">{currentPlan.label}</span>
        </h1>
        <p className="text-slate-600 mt-4 font-medium text-lg">
          Disfruta de 30 días de acceso total sin cargos hoy. Tu primer cobro será el {getFirstChargeDate()}.
        </p>
      </header>

      <div className="flex justify-center mb-10">
        <div className="bg-white border border-slate-200 p-1.5 rounded-[22px] flex items-center shadow-sm">
          <button 
            type="button"
            onClick={() => setBillingCycle('monthly')} 
            className={`px-10 py-3 rounded-[18px] font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-rose-700 text-white shadow-lg' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Mensual
          </button>
          <button 
            type="button"
            onClick={() => setBillingCycle('yearly')} 
            className={`px-10 py-3 rounded-[18px] font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-rose-700 text-white shadow-lg' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Anual
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 items-start w-full max-w-6xl">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 md:p-12 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/60">
            <h2 className="text-xl font-black text-rose-950 mb-10 uppercase tracking-widest flex items-center gap-3">
              <span className="w-8 h-8 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs">✓</span>
              Resumen de la Suscripción
            </h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-700 font-bold text-lg">Membresía VORA {currentPlan.label}</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Renovación automática {billingCycle === 'monthly' ? 'mensual' : 'anual'}</span>
                </div>
                <span className="font-black text-slate-300 line-through text-xl">${basePrice.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center bg-green-50 p-6 rounded-3xl border border-green-100">
                <div className="flex flex-col">
                  <span className="text-green-700 font-black text-sm uppercase tracking-wider">🚀 Hard Trial: 30 Días de Cortesía</span>
                  <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Acceso ilimitado a todas las funciones</span>
                </div>
                <span className="font-black text-green-700 text-2xl tracking-tighter italic">FREE</span>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                <span className="text-xl font-black text-slate-400 uppercase tracking-widest">Total hoy</span>
                <span className="text-6xl font-black text-rose-700 tracking-tighter leading-none">$0.00</span>
              </div>
              
              <div className="flex justify-center pt-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-2">
                      <span className="text-rose-500">📅</span>
                      Primer cobro por ${basePrice.toFixed(2)} el {getFirstChargeDate()}
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-12 rounded-[48px] shadow-2xl shadow-rose-900/30 text-white text-center flex flex-col justify-between min-h-[450px]">
            <div>
              <p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Seguridad Bancaria</p>
              <h3 className="text-3xl font-black mb-12 italic tracking-[0.4em]">RECURRENTE</h3>
              
              <button 
                onClick={handleCheckout} 
                disabled={isLoading || !user} 
                className="w-full bg-white text-rose-700 py-6 rounded-2xl font-black text-2xl hover:bg-rose-50 transition-all active:scale-95 shadow-xl shadow-rose-900/40 disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {isLoading ? (
                   <span className="animate-spin h-8 w-8 border-4 border-rose-700 border-t-transparent rounded-full"></span>
                ) : (
                  'Confirmar y Pagar $0.00'
                )}
              </button>
            </div>
            
            <div className="mt-10">
              <p className="text-[11px] text-rose-100/80 leading-relaxed font-bold text-pretty italic opacity-90">
                "No se realizará ningún cargo a tu tarjeta el día de hoy. Podrás cancelar esta suscripción en cualquier momento desde tu panel de configuración."
              </p>
            </div>
          </div>
          <div className="text-center opacity-30">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Artemix S.A. Infrastructure v2.1</span>
          </div>
        </div>
      </div>
    </div>
  )
}