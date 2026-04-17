"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRICING: { [key: string]: { monthly: number, yearly: number, label: string } } = {
  starter: { monthly: 19.99, yearly: 219.89, label: 'Starter' },
  business: { monthly: 39.99, yearly: 455.89, label: 'Business' },
  premium: { monthly: 69.99, yearly: 797.89, label: 'Premium' }
}

export default function SuscripcionPage() {
  const supabase = createClient()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  const FREE_TRIAL_DAYS = 30; 

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        setUser(session.user)

        const { data: org } = await supabase
          .from('organizations')
          .select('id, subscription_tier, billing_cycle')
          .eq('owner_id', session.user.id)
          .single()
        
        if (org) {
          setOrgId(org.id)
          
          // Mapeo robusto de tiers
          const dbTier = org.subscription_tier?.toLowerCase() || 'starter'
          let finalTier = 'starter'
          if (dbTier === 'basic' || dbTier === 'starter') finalTier = 'starter'
          else if (dbTier === 'standard' || dbTier === 'business') finalTier = 'business'
          else if (dbTier === 'premium') finalTier = 'premium'

          setPlanTier(finalTier)
          setBillingCycle(org.billing_cycle === 'yearly' ? 'yearly' : 'monthly')
        }
      } catch (err) {
        console.error("Error sincronizando:", err)
      }
    }
    fetchOrgData()
  }, [supabase])

  const currentPlan = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPlan.monthly : currentPlan.yearly

  const handleCheckout = async () => {
    if (isLoading || !user || !orgId) return
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('create-recurrente-checkout', {
        body: {
          orgId,
          planTier,
          billingCycle,
          userEmail: user.email,
          strategy: "hard_trial_30_days"
        }
      })

      if (error) throw new Error(error.message)
      if (data?.checkout_url) window.location.assign(data.checkout_url)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 font-sans">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-rose-950 tracking-tighter">
          Tu Plan <span className="text-rose-700">{currentPlan.label}</span>
        </h1>
        <p className="text-slate-600 mt-4 font-medium text-lg italic">
          Facturación {billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
        </p>
      </header>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-stretch">
        <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 flex flex-col justify-between">
            <div className="space-y-6">
                <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold uppercase tracking-widest text-xs">Precio Regular</span>
                    <span className="font-black line-through text-xl">${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-green-50 p-6 rounded-3xl border border-green-100">
                    <span className="text-green-700 font-black text-sm uppercase">🎁 30 Días Gratis</span>
                    <span className="font-black text-green-700 text-2xl tracking-tighter">FREE</span>
                </div>
                <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                    <span className="text-xl font-black text-slate-400 uppercase">Total Hoy</span>
                    <span className="text-6xl font-black text-rose-700 tracking-tighter">$0.00</span>
                </div>
            </div>
        </div>

        <div className="bg-rose-700 p-12 rounded-[48px] shadow-2xl text-white text-center flex flex-col justify-center">
            <h3 className="text-3xl font-black mb-10 tracking-[0.3em]">CHECKOUT</h3>
            <button 
              onClick={handleCheckout} 
              disabled={isLoading || !user}
              className="w-full bg-white text-rose-700 py-6 rounded-2xl font-black text-2xl hover:bg-rose-50 shadow-xl disabled:opacity-50"
            >
              {isLoading ? 'Cargando...' : 'Iniciar Prueba Gratis'}
            </button>
            <p className="text-[11px] text-rose-200 mt-8 font-bold italic leading-relaxed">
              "No se realizará ningún cobro hoy. Podrás cancelar en cualquier momento."
            </p>
        </div>
      </div>
    </div>
  )
}