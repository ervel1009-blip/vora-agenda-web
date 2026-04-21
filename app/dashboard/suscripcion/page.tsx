'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import { 
  CheckCircle2, CreditCard, ShieldCheck, 
  Zap, Trash2, RefreshCw, Star, AlertTriangle 
} from 'lucide-react'

const PRICING: { [key: string]: { monthly: number, yearly: number, label: string } } = {
  starter: { monthly: 19.99, yearly: 219.89, label: 'Starter' },
  business: { monthly: 39.99, yearly: 455.89, label: 'Business' },
  premium: { monthly: 69.99, yearly: 797.89, label: 'Premium' }
}

export default function SuscripcionPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true) 
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')

  // --- 🚪 EL PORTERO FINAL (Reintegrado y Mejorado) ---
  useEffect(() => {
    const checkFinalStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { router.push('/'); return; }
        setUser(session.user)

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', session.user.id)
          .single()

        if (!orgData) return;

        // 🛡️ VALIDACIONES DE INTEGRIDAD (Tu lógica original)
        if (!orgData.business_type) { router.push('/onboarding'); return; }
        if (!orgData.google_calendar_id) { router.push('/dashboard/calendario'); return; }
        
        // Validar Paso 4 (Horarios)
        const { count: hoursCount } = await supabase.from('operating_hours').select('*', { count: 'exact', head: true }).eq('org_id', orgData.id)
        if (!hoursCount) { router.push('/dashboard/horarios'); return; }

        // Validar Paso 5 (Servicios)
        const { count: servicesCount } = await supabase.from('services_config').select('*', { count: 'exact', head: true }).eq('organization_id', orgData.id)
        if (!servicesCount) { router.push('/dashboard/servicios'); return; }

        // Si ya es activo y NO viene del checkout, lo mandamos a trabajar
        if (orgData.subscription_status === 'active' && !window.location.search.includes('status=success')) {
            // Permitimos que se quede aquí si quiere gestionar su suscripción, 
            // pero si es onboarding puro, lo mandamos al calendario.
        }

        setOrg(orgData)
        setPlanTier(orgData.subscription_tier?.toLowerCase() || 'starter')
        setBillingCycle(orgData.billing_cycle === 'yearly' ? 'yearly' : 'monthly')
        setIsLoading(false)

      } catch (err) {
        console.error("Error en el portero:", err)
      }
    }
    checkFinalStatus()
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
      if (error) throw error
      if (data?.checkout_url) window.location.assign(data.checkout_url)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      setIsSaving(false)
    }
  }

  const handleCancelSubscription = async () => {
    const confirm = window.confirm("¿Estás seguro? Tu suscripción se cancelará al final del periodo pagado.")
    if (!confirm) return
    setIsSaving(true)
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { orgId: org.id, externalSubscriptionId: org.external_subscription_id }
      })
      if (error) throw error
      alert("Suscripción cancelada correctamente.")
      window.location.reload()
    } catch (err: any) {
      alert("Error: " + err.message)
      setIsSaving(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <RefreshCw className="animate-spin text-emerald-600" />
    </div>
  )

  const currentPlan = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPlan.monthly : currentPlan.yearly

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 md:py-12 px-4 font-sans">
      
      {org?.subscription_status !== 'active' && (
        <div className="w-full max-w-xl mb-8">
          <OnboardingProgress currentStep={7} />
        </div>
      )}

      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-50 rounded-full border border-fuchsia-100 text-fuchsia-600 mb-4">
          <Star size={12} className="fill-fuchsia-600" />
          <span className="text-[10px] font-black uppercase tracking-widest">Billing Engine</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter">
          {org?.subscription_status === 'active' ? 'Gestión de ' : 'Finaliza tu '}
          <span className="text-emerald-600 italic">Suscripción</span>
        </h1>
      </header>

      <div className="w-full max-w-6xl grid lg:grid-cols-12 gap-6 items-start">
        
        {/* PANEL IZQUIERDO: DETALLES (8 COLUMNAS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Actual</p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentPlan.label}</h2>
              </div>
              <div className="bg-emerald-50 px-4 py-2 rounded-2xl text-emerald-600 font-black text-xs uppercase">
                {billingCycle}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" /> WhatsApp Bot Activo
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500" /> Facturación FEL
                </div>
                {org?.card_last4 && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <CreditCard size={20} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{org.card_brand} •••• {org.card_last4}</span>
                    </div>
                )}
              </div>

              <div className="bg-slate-950 p-6 rounded-[32px] text-white">
                <div className="flex justify-between text-slate-400 text-[10px] font-black uppercase mb-2">
                  <span>Subtotal</span>
                  <span className="line-through">${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-[10px] font-black uppercase mb-6">
                  <span>Trial 30 Días</span>
                  <span>-$ {basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/10">
                  <span className="text-xs font-black uppercase">Total Hoy</span>
                  <span className="text-4xl font-black tracking-tighter text-emerald-400">$0.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACCIÓN DE CANCELACIÓN */}
          {org?.subscription_status === 'active' && !org?.cancel_at_period_end && (
            <button 
              onClick={handleCancelSubscription}
              disabled={isSaving}
              className="w-full flex items-center justify-between p-6 bg-white border border-rose-100 rounded-[32px] text-rose-500 hover:bg-rose-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 rounded-2xl"><Trash2 size={20} /></div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase tracking-tight">Cancelar Plan</p>
                  <p className="text-[10px] font-medium text-slate-400">Mantendrás acceso hasta el final del ciclo.</p>
                </div>
              </div>
              {isSaving ? <RefreshCw className="animate-spin" /> : <ChevronRight size={20} />}
            </button>
          )}
        </div>

        {/* PANEL DERECHO: CHECKOUT (4 COLUMNAS - Más pequeño en móvil) */}
        <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between h-full">
           <div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-black mb-3 text-slate-950 tracking-tight italic">Secure Node</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-8">
                Encriptación AES-256 activa. Tu información financiera nunca toca nuestros servidores.
              </p>
           </div>

           {org?.subscription_status !== 'active' ? (
             <button 
               onClick={handleCheckout} 
               disabled={isSaving}
               className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               {isSaving ? <RefreshCw className="animate-spin" size={18} /> : 'Activar VORA 🚀'}
             </button>
           ) : (
             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-700 uppercase text-center">Suscripción Protegida</p>
             </div>
           )}
        </div>

      </div>
    </div>
  )
}