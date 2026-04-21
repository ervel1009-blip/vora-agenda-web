'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Calendar, 
  Scissors, 
  CreditCard, 
  History, 
  TrendingUp, 
  LifeBuoy, 
  LogOut,
  Settings
} from 'lucide-react'

const MENU_ITEMS = [
  {
    group: 'Operación',
    items: [
      { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Agenda', href: '/dashboard/calendario', icon: Calendar },
      { name: 'Servicios', href: '/dashboard/servicios', icon: Scissors },
    ]
  },
  {
    group: 'Negocio y Pagos',
    items: [
      { name: 'Mi Plan / Upgrade', href: '/dashboard/suscripcion', icon: TrendingUp },
      { name: 'Método de Pago', href: '/dashboard/suscripcion/tarjeta', icon: CreditCard },
      { name: 'Historial de Pagos', href: '/dashboard/suscripcion/historial', icon: History },
    ]
  },
  {
    group: 'Crecimiento',
    items: [
      { name: 'Marketing', href: '/dashboard/marketing', icon: TrendingUp },
    ]
  },
  {
    group: 'Asistencia',
    items: [
      { name: 'Soporte IA', href: '/dashboard/soporte', icon: LifeBuoy },
      { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      {/* Logo Area */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-700 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter">VORA</h2>
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Artemix S.A.</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {MENU_ITEMS.map((group, idx) => (
          <div key={idx} className="mb-8">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group ${
                      isActive 
                        ? 'bg-rose-50 text-rose-700 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-rose-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-slate-50">
        <button className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl text-slate-400 font-bold text-sm hover:bg-rose-50 hover:text-rose-700 transition-all">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}