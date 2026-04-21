'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import { 
  CheckCircle2, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  RefreshCw,
  Star
} from 'lucide-react'

const PRICING: { [key: string]: { monthly: number, yearly: number, label: string } } = {
  starter: { monthly: 19.99, yearly: 219.89, label: 'Starter' },
  business: { monthly: 39.99, yearly: 455.89, label: 'Business' },
  premium: { monthly: 69.99, yearly: 797.89, label: 'Premium' }
}

export default function SuscripcionPage() {
  const supabase = createClient()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(true) 
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { router.push('/'); return; }
        setUser(session.user)

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', session.user.id)
          .single()

        setOrg(orgData)
        
        if (orgData) {
          setPlanTier(orgData.subscription_tier?.toLowerCase() || 'starter')
          setBillingCycle(orgData.billing_cycle === 'yearly' ? 'yearly' : 'monthly')
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error en suscripción:", err)
      }
    }
    checkStatus()
  }, [supabase, router])

  const handleCheckout = async () => {
    if (isSaving || !user || !org?.id) return
    setIsSaving(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('create-recurrente-checkout', {
        body: {
          orgId: org.id,
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
      setIsSaving(false)
    }
  }

  const handleCancelSubscription = async () => {
    const confirm = window.confirm("¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso a las funciones avanzadas de VORA al finalizar tu periodo actual.")
    if (!confirm) return
    
    setIsSaving(true)
    try {
      // Aquí llamarías a tu Edge Function de cancelación
      alert("Solicitud de cancelación enviada. Procesando con Recurrente...");
      // router.refresh();
    } catch (err: any) {
      alert("Error al cancelar: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  )

  const currentPlan = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPlan.monthly : currentPlan.yearly

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6 font-sans">
      
      {/* Solo mostramos el progreso si NO es activo */}
      {org?.subscription_status !== 'active' && (
        <div className="w-full max-w-xl mb-12">
          <OnboardingProgress currentStep={7} />
        </div>
      )}

      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-50 rounded-full border border-fuchsia-100 text-fuchsia-600 mb-4 shadow-sm shadow-fuchsia-100/50">
          <Star size={12} className="fill-fuchsia-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Suscripción VORA</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter">
          {org?.subscription_status === 'active' ? 'Tu suscripción está ' : 'Finaliza tu '}
          <span className="text-emerald-600 italic">{org?.subscription_status === 'active' ? 'Activa' : 'Activación'}</span>
        </h1>
      </header>

      <div className="w-full max-w-5xl grid lg:grid-cols-3 gap-8 items-start">
        
        {/* DETALLES DEL PLAN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-600">
               <Zap size={120} strokeWidth={1} />
            </div>

            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Seleccionado</p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentPlan.label}</h2>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-2xl">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter">
                  {billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" /> 
                  Sincronización con Google
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" /> 
                  IA de agendamiento activa
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" /> 
                  Facturación FEL integrada
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                <div className="flex justify-between items-center text-slate-400 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">Precio Base</span>
                  <span className="font-bold line-through">${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest">Prueba Gratis (30d)</span>
                  <span className="font-black">-$ {basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                  <span className="text-sm font-black text-slate-950 uppercase tracking-widest">Total Hoy</span>
                  <span className="text-4xl font-black text-slate-950 tracking-tighter">$0.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* OPCIONES DE GESTIÓN (Solo si es activo) */}
          {org?.subscription_status === 'active' && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                  <Trash2 size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">¿Deseas cancelar?</p>
                  <p className="text-xs font-medium text-slate-400">Puedes cancelar tu suscripción en cualquier momento.</p>
                </div>
              </div>
              <button 
                onClick={handleCancelSubscription}
                className="w-full md:w-auto px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 border border-rose-100 transition-all"
              >
                Cancelar Suscripción
              </button>
            </div>
          )}
        </div>

        {/* COLUMNA DE ACCIÓN / CHECKOUT */}
        <div className="bg-slate-950 p-10 rounded-[48px] shadow-2xl text-white flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-fuchsia-500/10 transition-all duration-700"></div>
           
           <div className="relative z-10">
             <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-8">
               <ShieldCheck size={32} />
             </div>
             <h3 className="text-3xl font-black mb-4 tracking-tight leading-none italic">Secure <br/>Checkout</h3>
             <p className="text-slate-400 text-sm font-medium leading-relaxed">
               {org?.subscription_status === 'active' 
                ? 'Tu cuenta está protegida y activa. No se requieren acciones adicionales.' 
                : 'Se requiere una tarjeta para activar los 30 días de prueba. No se cobrará nada hoy.'}
             </p>
           </div>

           {org?.subscription_status !== 'active' && (
            <div className="relative z-10 space-y-4">
              <button 
                onClick={handleCheckout} 
                disabled={isSaving}
                className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl hover:bg-emerald-500 shadow-xl shadow-emerald-950/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isSaving ? <RefreshCw className="animate-spin" /> : 'Activar Trial 🚀'}
              </button>
              <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest">
                Procesado por Recurrente
              </p>
            </div>
           )}
        </div>

      </div>

      <footer className="mt-16 text-center">
         <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">Artemix S.A. • Systems Engineering • 2026</p>
      </footer>
    </div>
  )
}