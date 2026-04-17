"use client"

import React, { useState, useEffect } from 'react'

/** * 🚩 RESTAURACIÓN DE CÁLCULO OFICIAL Y FIX DE REDONDEO:
 * Se ha cambiado Math.round por Math.floor en el cálculo del descuento 
 * para asegurar que el 20% de 19.99 sea 3.99 y no 4.00.
 */

// --- Mocks para el entorno de previsualización ---
const createClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: { id: 'user_123', email: 'erick.velasquez@artemix.com' } } }),
    getSession: async () => ({ data: { session: { access_token: 'mock_token' } } }),
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => {
          if (table === 'organizations') {
            const savedPlan = typeof window !== 'undefined' ? localStorage.getItem('vora_selected_plan') : 'starter';
            const savedCycle = typeof window !== 'undefined' ? localStorage.getItem('vora_billing_cycle') : 'monthly';
            return { data: { id: 'org_b4f55f27', subscription_tier: savedPlan || 'starter', billing_cycle: savedCycle || 'monthly' } };
          }
          return { data: null };
        },
        maybeSingle: async () => {
          if (table === 'coupons') return { data: { id: 'c_001', code: 'YOSHI2026', discount_percentage: 20, used_count: 0, max_redemptions: 100 } };
          return { data: null };
        }
      }),
      ilike: (column: string, value: string) => ({
        eq: () => ({
          maybeSingle: async () => {
            // 🚩 FIX DE VALIDACIÓN EN MOCK: Solo acepta YOSHI2026
            if (value.trim().toUpperCase() === 'YOSHI2026') {
              return {
                data: { id: 'c_001', code: 'YOSHI2026', discount_percentage: 20, used_count: 0, max_redemptions: 100 }
              };
            }
            return { data: null };
          }
        })
      })
    })
  })
});

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

export default function App() {
  const supabase = createClient()
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planTier, setPlanTier] = useState('starter')
  const [isLoading, setIsLoading] = useState(false)
  
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState<{id: string, code: string, discount: number} | null>(null)
  const [couponError, setCouponError] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    const fetchOrgPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier, billing_cycle')
        .eq('owner_id', user.id)
        .single()
      
      if (org) {
        const tier = org.subscription_tier === 'standard' ? 'business' : 
                     org.subscription_tier === 'basic' ? 'starter' : 
                     org.subscription_tier;
        if (tier) setPlanTier(tier)
        // @ts-ignore
        if (org.billing_cycle) setBillingCycle(org.billing_cycle as 'monthly' | 'yearly')
      }
    }
    fetchOrgPlan()
  }, [])

  const currentPrices = PRICING[planTier] || PRICING.starter
  const basePrice = billingCycle === 'monthly' ? currentPrices.monthly : currentPrices.yearly
  const effectiveInstallment = billingCycle === 'monthly' ? currentPrices.monthly : (currentPrices.yearly / 12);
  
  /**
   * 🛠️ LÓGICA DE PRECIOS ORIGINAL VORA (CORREGIDA):
   * Utilizamos Math.floor para el descuento para evitar que 3.998 suba a 4.00.
   * Esto garantiza que el descuento sea exactamente 3.99 sobre la base de 19.99.
   */
  const discountAmount = (couponData && billingCycle === 'monthly') 
    ? Math.floor((effectiveInstallment * (couponData.discount / 100)) * 100) / 100 
    : 0;
    
  const finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;

  const validateCoupon = async () => {
    if (!couponCode) return
    setIsValidating(true)
    setCouponError('')

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', couponCode.trim())
      // @ts-ignore
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      setCouponError('Cupón no válido o expirado')
      setCouponData(null)
    } else {
      // @ts-ignore
      if (data.used_count >= data.max_redemptions) {
        setCouponError('Este cupón ya alcanzó su límite de usos')
        setCouponData(null)
      } else {
        // @ts-ignore
        setCouponData({ id: data.id, code: data.code, discount: data.discount_percentage })
      }
    }
    setIsValidating(false)
  }

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user?.id).single()
      
      const cleanCoupon = (couponData?.code && billingCycle === 'monthly') 
        ? couponData.code.trim().toUpperCase() 
        : undefined;

      const response = await fetch(
        'https://yhxkpuweofzaixoqmlhp.supabase.co/functions/v1/create-recurrente-checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            orgId: org?.id,
            planTier: planTier,
            billingCycle: billingCycle,
            userEmail: user?.email,
            couponCode: cleanCoupon
          })
        }
      )

      const result = await response.json()
      if (result.checkout_url) {
        window.location.assign(result.checkout_url)
      } else {
        throw new Error(result.error || "Error al generar pago")
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-rose-100 selection:text-rose-900">
      <OnboardingProgress currentStep={7} />
      
      <header className="mb-12 text-center flex flex-col items-center max-w-2xl">
        <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight text-balance">
          Activa tu <span className="text-rose-700">Suscripción</span>
        </h1>
        <p className="text-slate-600 mt-3 font-medium text-lg text-pretty">
          Tu prueba de 7 días está activa. Asegura tu acceso a VORA hoy.
        </p>
      </header>

      <div className="flex justify-center mb-10">
        <div className="bg-white border border-slate-200 p-1 rounded-2xl flex items-center shadow-sm">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Mensual
          </button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-rose-700 text-white shadow-md' : 'text-slate-400 hover:text-rose-600'}`}
          >
            Anual <span className={`ml-1 text-[9px] px-2 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-rose-500 text-white' : 'bg-green-100 text-green-600'}`}>-5%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start w-full max-w-5xl">
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-black text-rose-950 mb-8 uppercase tracking-widest">Resumen de cuenta</h2>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-slate-600 font-bold uppercase tracking-wider">Plan VORA {planTier.toUpperCase()}</span>
                  {billingCycle === 'yearly' && (
                    <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Pago único anual</span>
                  )}
                </div>
                <span className="font-black text-rose-950 text-xl">${basePrice.toFixed(2)}</span>
              </div>

              {couponData && billingCycle === 'monthly' && (
                <div className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <div className="flex flex-col">
                    <span className="text-rose-700 font-black text-xs uppercase tracking-wider">Cupón Influencer ({couponData.discount}%)</span>
                    <span className="text-[9px] text-rose-400 font-bold">Aplicado sobre el primer pago</span>
                  </div>
                  <span className="font-black text-rose-700">-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                <span className="text-lg font-black text-slate-400 uppercase tracking-widest">Total a pagar hoy</span>
                <span className="text-5xl font-black text-rose-700 tracking-tighter">${finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* BLOQUE DE CUPÓN DINÁMICO */}
          {billingCycle === 'monthly' && (
            <div className="bg-white p-6 rounded-[30px] border border-dashed border-slate-200">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">¿Tienes un código?</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="yoshi2026" 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all uppercase font-bold text-rose-950"
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)} 
                />
                <button 
                  onClick={validateCoupon} 
                  disabled={isValidating || !couponCode} 
                  className="bg-rose-950 text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all disabled:opacity-30 active:scale-95"
                >
                  {isValidating ? '...' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="text-red-500 text-xs mt-3 font-bold ml-1">{couponError}</p>}
              {couponData && <p className="text-rose-600 text-xs mt-3 font-black ml-1 uppercase tracking-wider text-pretty">¡Cupón activado! 🚀</p>}
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-10 rounded-[40px] shadow-2xl shadow-slate-200 text-white text-center">
            <p className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-pretty">Procesamiento Seguro</p>
            <h3 className="text-2xl font-black mb-8 italic tracking-[0.3em]">RECURRENTE</h3>
            <button 
              onClick={handleCheckout} 
              disabled={isLoading} 
              className="w-full bg-white text-rose-700 py-5 rounded-2xl font-black text-xl hover:bg-rose-50 transition-all active:scale-95 shadow-lg shadow-rose-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                 <span className="animate-spin h-6 w-6 border-2 border-rose-700 border-t-transparent rounded-full"></span>
              ) : (
                'Pagar y Activar'
              )}
            </button>
            <p className="text-[10px] text-rose-200 mt-8 leading-relaxed font-medium text-balance">
              Cobro automático según ciclo seleccionado. Tu banco aplicará el tipo de cambio local. Cancela cuando quieras desde tu panel.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-slate-300">
             <span className="text-[9px] font-black uppercase tracking-widest text-center">Artemix S.A. 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}