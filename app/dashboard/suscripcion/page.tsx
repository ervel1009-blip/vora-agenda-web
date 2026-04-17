"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'

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

const PRICING: { [key: string]: { monthly: number, yearly: number } } = {
  starter: { monthly: 19.99, yearly: 219.89 },
  business: { monthly: 39.99, yearly: 455.89 },
  premium: { monthly: 69.99, yearly: 797.89 }
}

export default function SuscripcionPage() {
  const supabase = createClient();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const FREE_TRIAL_DAYS = 30; 

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: activeUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !activeUser) {
          console.warn("Sesión no detectada en este dominio.");
          return;
        }
        
        setUser(activeUser)

        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_tier, billing_cycle')
          .eq('owner_id', activeUser.id)
          .single()
        
        if (org) {
          const tier = org.subscription_tier === 'standard' ? 'business' : 
                       org.subscription_tier === 'basic' ? 'starter' : 
                       org.subscription_tier;
          if (tier) setPlanTier(tier)
          if (org.billing_cycle) setBillingCycle(org.billing_cycle as 'monthly' | 'yearly')
        }
      } catch (err) {
        console.error("Error al verificar autenticación:", err)
      }
    }
    checkAuth()
  }, [supabase])

  const currentPrices = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPrices.monthly : currentPrices.yearly

  const getFirstChargeDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + FREE_TRIAL_DAYS);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const handleCheckout = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    try {
      if (!user) {
        // En lugar de un error fatal, guiamos al usuario al login
        const loginConfirm = confirm("Tu sesión no está activa en este dominio. ¿Deseas ir al login para activar tu prueba?");
        if (loginConfirm) window.location.assign('/login');
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (orgError || !org?.id) throw new Error("No se encontró la organización activa vinculada a tu cuenta.");
      
      const { data, error } = await supabase.functions.invoke('create-recurrente-checkout', {
        body: {
          orgId: org.id,
          planTier: planTier,
          billingCycle: billingCycle,
          userEmail: user.email,
          strategy: "hard_trial_30_days"
        }
      })

      if (error) throw new Error(error.message || "Error al conectar con la pasarela");

      if (data?.checkout_url) {
        window.location.assign(data.checkout_url)
      } else {
        throw new Error("La pasarela de pagos no devolvió una URL válida.")
      }
    } catch (err: any) {
      console.error("Error en checkout:", err.message)
      alert(`⚠️ Problema técnico: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-rose-100 selection:text-rose-900">
      <OnboardingProgress currentStep={7} />
      
      {!user && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold flex items-center gap-3 animate-pulse">
           <span>⚠️ Sesión inactiva. Inicia sesión para activar tus 30 días de prueba.</span>
           <button onClick={() => window.location.assign('/login')} className="bg-amber-600 text-white px-4 py-1.5 rounded-xl text-xs hover:bg-amber-700 transition-colors">Iniciar Sesión</button>
        </div>
      )}

      <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
        <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight text-balance">
          Activa tu <span className="text-rose-700">Suscripción</span>
        </h1>
        <p className="text-slate-600 mt-3 font-medium text-lg text-pretty">
          Tu cuenta está casi lista. Comienza con 30 días de acceso total sin cargos iniciales.
        </p>
      </header>

      <div className="flex justify-center mb-10">
        <div className="bg-white border border-slate-200 p-1 rounded-2xl flex items-center shadow-sm">
          <button 
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Mensual
          </button>
          <button 
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Anual <span className={`ml-1 text-[9px] px-2 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-rose-500 text-white' : 'bg-green-100 text-green-600'}`}>Ahorra 5%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start w-full max-w-5xl">
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-black text-rose-950 mb-8 uppercase tracking-widest">Detalle de Suscripción</h2>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-600 font-bold uppercase tracking-wider">Membresía VORA {planTier.toUpperCase()}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Renovación {billingCycle === 'monthly' ? 'mensual' : 'anual'}</span>
                </div>
                <span className="font-black text-slate-400 line-through text-lg">${basePrice.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center bg-green-50 p-5 rounded-2xl border border-green-100">
                <div className="flex flex-col">
                  <span className="text-green-700 font-black text-xs uppercase tracking-wider">🎉 30 Días de Prueba Hard Trial</span>
                  <span className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Acceso completo sin restricciones</span>
                </div>
                <span className="font-black text-green-700 text-xl tracking-tighter">FREE</span>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                <span className="text-lg font-black text-slate-400 uppercase tracking-widest">Importe a pagar hoy</span>
                <span className="text-5xl font-black text-rose-700 tracking-tighter">$0.00</span>
              </div>
              
              <div className="flex justify-center mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100">
                      Próximo cobro el {getFirstChargeDate()} por ${basePrice.toFixed(2)}
                  </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-10 rounded-[40px] shadow-2xl shadow-rose-900/20 text-white text-center">
            <p className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Pagos Protegidos</p>
            <h3 className="text-2xl font-black mb-10 italic tracking-[0.3em]">RECURRENTE</h3>
            
            <button 
              onClick={handleCheckout} 
              disabled={isLoading} 
              className="w-full bg-white text-rose-700 py-5 rounded-2xl font-black text-xl hover:bg-rose-50 transition-all active:scale-95 shadow-lg shadow-rose-900/30 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                 <span className="animate-spin h-6 w-6 border-2 border-rose-700 border-t-transparent rounded-full"></span>
              ) : (
                'Activar 30 Días Gratis'
              )}
            </button>
            
            <div className="mt-8 space-y-4">
              <p className="text-[10px] text-rose-200 leading-relaxed font-bold text-pretty opacity-80">
                Al activar, autorizas a ARTEMIX S.A. a gestionar tu suscripción mediante Recurrente. No se hará ningún cargo hoy. Recibirás un recordatorio antes de que termine tu prueba.
              </p>
              <div className="flex justify-center gap-2">
                <div className="h-1 w-8 bg-rose-500 rounded-full opacity-30"></div>
                <div className="h-1 w-8 bg-rose-500 rounded-full opacity-30"></div>
                <div className="h-1 w-8 bg-rose-500 rounded-full opacity-30"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center px-4">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Infraestructura VORA v2.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}