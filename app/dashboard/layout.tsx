'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/dashboard/Sidebar'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const pathname = usePathname()
  const [isSidebarVisible, setIsSidebarVisible] = useState(false) // Solo para usuarios activos
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Control del menú móvil
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
        if (org?.subscription_status === 'active') setIsSidebarVisible(true)
      }
      setLoading(false)
    }
    checkAccess()
  }, [supabase])

  // Función para cerrar el menú (se usará en el Sidebar)
  const closeMenu = () => setIsMenuOpen(false)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="animate-spin h-10 w-10 border-b-2 border-emerald-600"></span>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR RESPONSIVO */}
      {isSidebarVisible && (
        <>
          {/* Overlay: Se cierra al tocar afuera */}
          {isMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
              onClick={closeMenu}
            />
          )}
          
          <div className={`
            fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out bg-white
            lg:relative lg:translate-x-0 lg:static w-72
            ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {/* Le pasamos la función closeMenu al componente Sidebar */}
            <Sidebar onNavigate={closeMenu} />
            
            <button 
              onClick={closeMenu}
              className="lg:hidden absolute top-6 right-4 p-2 text-slate-400 hover:text-emerald-600"
            >
              <X size={24} />
            </button>
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* TOP BAR MÓVIL (Solo se ve en móviles/tablets) */}
        {isSidebarVisible && (
          <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm">V</div>
              <span className="font-black text-slate-900 tracking-tighter">VORA</span>
            </div>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"
            >
              <Menu size={20} />
            </button>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div className={`flex-1 overflow-y-auto ${isSidebarVisible ? 'p-4 md:p-8 lg:p-12' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}