'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'

const NICHES = [
  { id: 'beauty', icon: '💅', title: 'Belleza y Uñas', desc: 'Salones, spas, manicuristas.' },
  { id: 'health', icon: '🦷', title: 'Salud y Clínicas', desc: 'Dentistas, médicos, terapeutas.' },
  { id: 'veterinary', icon: '🐾', title: 'Veterinaria', desc: 'Clínicas para mascotas.' },
  { id: 'professional_services', icon: '🏢', title: 'Negocio General', desc: 'Asesorías, servicios profesionales.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)


// --- LÓGICA DEL PORTERO (Corregida para evitar el error de dependencias) ---
  useEffect(() => {
    const syncAndCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // 1. EL PORTERO: Verificamos si ya existe el giro de negocio
        const { data: org } = await supabase
          .from('organizations')
          .select('business_type')
          .eq('owner_id', session.user.id)
          .single()

        // Si ya tiene giro de negocio, lo mandamos al calendario
        if (org?.business_type) {
          console.log("🚀 Usuario con giro de negocio detectado. Redirigiendo...");
          router.push('/dashboard/calendario')
          return 
        }

        // 2. TU LÓGICA ORIGINAL (Sincronización de Token)
        const googleRefreshToken = session.provider_refresh_token;

        if (googleRefreshToken) {
          await supabase
            .from('organizations')
            .upsert({ 
              owner_id: session.user.id, 
              google_refresh_token: googleRefreshToken,
              owner_email: session.user.email,
              name: `VORA - ${session.user.user_metadata.full_name || 'Mi Negocio'}`
            }, { onConflict: 'owner_id' });
          
          console.log("✅ Google Refresh Token sincronizado.");
        }
      } else {
        // Si no hay sesión, al login
        router.push('/')
        return
      }
      setIsLoading(false)
    }
    
    syncAndCheck()
    // Dejamos las dependencias estables. 
    // Si usas [supabase, router] asegúrate de no cambiarlas después.
  }, [supabase, router])

  // --- TU FUNCIÓN handleSelectNiche (INTACTA) ---
  const handleSelectNiche = async (nicheId: string) => {
    setIsLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("No hay sesión activa");

        console.log("🔍 Buscando plantilla maestra para el nicho:", nicheId);

        const { data: masterPrompt, error: fetchError } = await supabase
          .from('ai_prompts')
          .select('system_prompt')
          .eq('business_type', nicheId)
          .eq('slug', 'main_assistant')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (fetchError) console.error("❌ Error de Supabase al traer prompt:", fetchError);

        const { error: upsertError } = await supabase
          .from('organizations')
          .upsert({
            owner_id: session.user.id,
            name: `VORA - ${nicheId.toUpperCase()}`, 
            owner_email: session.user.email,
            business_type: nicheId,
            subscription_tier: 'starter', 
            subscription_status: 'trialing', 
            tax_id: 'CF', 
            whatsapp_phone_id: '931581660032728', 
            allowed_modules: ['vora-clinica'], 
            google_refresh_token: session.provider_refresh_token, 
            chat_context: { 
              system_prompt: masterPrompt?.system_prompt || "Eres la asistente virtual de {{name}}. Ayudo a agendar citas. Mis servicios son: {{services}} en moneda {{currency}}. Atiendo en: {{hours}}.", 
              business_niche: nicheId 
            }
          }, { onConflict: 'owner_id' });

        if (upsertError) throw upsertError;

        console.log("✅ Organización creada con plantilla maestra. Navegando...");
        router.push('/dashboard/calendario'); 

    } catch (error: any) {
        console.error("❌ Error crítico en el flujo:", error.message);
        alert("Ocurrió un error: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  // --- TU DISEÑO (INTACTO) ---
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
      
      <OnboardingProgress currentStep={1} />

      <div className="w-full max-w-2xl bg-white rounded-[40px] p-10 md:p-14 shadow-xl shadow-slate-200 border border-slate-100">
        
        <header className="mb-12 text-center flex flex-col items-center">
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter leading-tight">
            <span className="text-rose-700">¿Cuál es tu Giro de Negocio?</span>
          </h1>
          <p className="text-slate-600 mt-3 font-medium text-lg max-w-sm">
            Configura el cerebro de tu asistente virtual en un clic.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {NICHES.map((niche) => (
            <button
              key={niche.id}
              onClick={() => handleSelectNiche(niche.id)}
              disabled={isLoading}
              className={`group flex flex-col items-center rounded-[32px] border-4 p-8 text-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                selected === niche.id 
                ? 'border-rose-700 bg-rose-50/50 shadow-lg shadow-slate-100' 
                : 'border-slate-50 bg-white hover:border-rose-100'
              }`}
            >
              <span className="mb-6 text-5xl transition-transform group-hover:rotate-12">{niche.icon}</span>
              <h3 className={`mb-2 font-black tracking-tight ${selected === niche.id ? 'text-rose-900' : 'text-slate-800'}`}>
                {niche.title}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {niche.desc}
              </p>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="animate-spin h-6 w-6 border-2 border-rose-700 border-t-transparent rounded-full"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-800 animate-pulse">
              Sincronizando con VORA... 🚀
            </p>
          </div>
        )}
      </div>

      <p className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        Artemix S.A. • 2026
      </p>
    </div>
  )
}