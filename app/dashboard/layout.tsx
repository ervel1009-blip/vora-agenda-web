'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/dashboard/Sidebar'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const pathname = usePathname()
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('owner_id', session.user.id)
          .single()

        // 🚩 REGLA DE ORO: Solo mostramos el Sidebar si el usuario ya es cliente ACTIVO
        // Si está en onboarding, el layout se mantiene limpio y centrado.
        if (org?.subscription_status === 'active') {
          setIsSidebarVisible(true)
        } else {
          setIsSidebarVisible(false)
        }
      }
      setLoading(false)
    }

    checkAccess()
  }, [supabase, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-700"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* El Sidebar solo aparece para usuarios que ya terminaron el pago */}
      {isSidebarVisible && <Sidebar />}

      <main className={`flex-1 flex flex-col ${isSidebarVisible ? 'h-screen overflow-hidden' : ''}`}>
        <div className={`flex-1 ${isSidebarVisible ? 'overflow-y-auto p-4 md:p-8' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}