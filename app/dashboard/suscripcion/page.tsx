"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRICING: { [key: string]: { monthly: number, yearly: number } } = {
  starter: { monthly: 19.99, yearly: 219.89 },
  business: { monthly: 39.99, yearly: 455.89 },
  premium: { monthly: 69.99, yearly: 797.89 }
}

export default function SuscripcionPage() {
  const supabase = createClient()
  
  // Estados de la UI
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(false)
  
  // 🚩 El "Semáforo" de Control: Evita el error de Lock y duplicidad de peticiones
  const isMounted = useRef(false)
  const FREE_TRIAL_DAYS = 30

  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true

    const syncUserStats = async () => {
      try {
        // Obtenemos sesión rápida sin forzar refresh de token (evita el "Failed to fetch" inicial)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_tier, billing_cycle')
          .eq('owner_id', session.user.id)
          .single()
        
        if (org) {
          const tier = org.subscription_tier === 'standard' ? 'business' : 
                       org.subscription_tier === 'basic' ? 'starter' : 
                       org.subscription_tier;
          setPlanTier(tier || 'starter')
          if (org.billing_cycle) setBillingCycle(org.billing_cycle as 'monthly' | 'yearly')
        }
      } catch (err) {
        console.warn("Conexión inestable. Se usarán valores por defecto.")
      }
    }

    syncUserStats()
  }, [supabase])

  const handleCheckout = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesión expirada")

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (!org?.id) throw new Error("No se encontró UUID de organización")
      
      // Enviamos el cobro de $0.00 hoy para activar la prueba en Recurrente
      const { data, error } = await supabase.functions.invoke('create-recurrente-checkout', {
        body: { 
          orgId: org.id, 
          planTier, 
          billingCycle, 
          userEmail: user.email,
          strategy: "hard_trial_30_days" // Flag para tu Edge Function
        }
      })

      if (error) throw error
      if (data?.checkout_url) window.location.assign(data.checkout_url)

    } catch (err: any) {
      console.error("Error en checkout:", err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const currentPrices = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPrices.monthly : currentPrices.yearly

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 selection:bg-rose-100 selection:text-rose-900">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Lado Izquierdo: Resumen Dinámico */}
        <div className="space-y-6">
          <header className="mb-8">
            <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
              Activa tu <span className="text-rose-700">Prueba Gratis</span>
            </h1>
            <p className="text-slate-600 mt-2 font-medium">Plan {planTier.toUpperCase()} - Sin cargos por 30 días.</p>
          </header>

          <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
               <button onClick={() => setBillingCycle('monthly')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${billingCycle === 'monthly' ? 'bg-white shadow-md text-rose-700' : 'text-slate-400'}`}>Mensual</button>
               <button onClick={() => setBillingCycle('yearly')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${billingCycle === 'yearly' ? 'bg-white shadow-md text-rose-700' : 'text-slate-400'}`}>Anual</button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                 <span className="uppercase text-[10px] tracking-widest">Costo Regular</span>
                 <span className="line-through">${basePrice}</span>
              </div>
              <div className="flex justify-between items-center p-5 bg-green-50 rounded-[24px] border border-green-100">
                 <div className="flex flex-col">
                    <span className="text-green-700 font-black text-xs uppercase tracking-wider">Acceso Total VORA</span>
                    <span className="text-[10px] text-green-600 font-bold">Primeros 30 días</span>
                 </div>
                 <span className="text-2xl font-black text-green-700">FREE</span>
              </div>
              <div className="pt-6 border-t flex justify-between items-end">
                 <span className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Total hoy</span>
                 <span className="text-5xl font-black text-rose-700 tracking-tighter leading-none">$0.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Acción Principal */}
        <div className="bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-10 rounded-[44px] shadow-2xl shadow-rose-900/30 text-white flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-3xl font-black italic tracking-widest mb-1">RECURRENTE</h3>
            <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest">Socio de pagos de Artemix S.A.</p>
          </div>

          <div className="space-y-6">
            <button 
              onClick={handleCheckout} 
              disabled={isLoading} 
              className="w-full bg-white text-rose-700 py-6 rounded-2xl font-black text-2xl hover:scale-[1.02] transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {isLoading ? 'Conectando...' : 'Iniciar Suscripción'}
            </button>
            <p className="text-[11px] text-rose-200 leading-relaxed font-medium text-center">
              No se realizará ningún cobro hoy. Al finalizar los 30 días, se cargará automáticamente la suscripción elegida. Puedes cancelar en cualquier momento desde tu panel de Vora.
            </p>
          </div>
        </div>

      </div>
      <footer className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-widest">Artemix S.A. © 2026</footer>
    </div>
  )
}