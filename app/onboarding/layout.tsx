'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkState = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return; // El middleware ya debería manejar esto

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()

      // 🚩 LÓGICA DE AUTO-UBICACIÓN
      // Si el usuario intenta entrar a la raíz de /onboarding 
      // pero ya tiene datos avanzados, lo movemos al lugar correcto.
      
      if (pathname === '/onboarding') {
        if (org?.google_calendar_id && (!org.public_phone || !org.address)) {
          router.push('/onboarding/perfil');
        } else if (org?.public_phone && org?.address) {
          // Si ya pasó perfil, mandarlo a horarios (que está en dashboard)
          router.push('/dashboard/horarios');
        }
      }
    }

    checkState()
  }, [pathname, supabase, router])

  return <>{children}</>
}