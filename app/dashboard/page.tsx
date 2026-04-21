'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Calendar, Scissors, CreditCard, 
  History, TrendingUp, LifeBuoy, LogOut, Settings 
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
    group: 'Negocio',
    items: [
      { name: 'Suscripción', href: '/dashboard/suscripcion', icon: TrendingUp },
      { name: 'Pagos', href: '/dashboard/suscripcion/tarjeta', icon: CreditCard },
      { name: 'Facturación', href: '/dashboard/suscripcion/historial', icon: History },
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
    <aside className="w-full lg:w-72 bg-white border-r border-slate-100 flex flex-col h-full">
      {/* Logo Area: Identidad VORA */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          {/* El cuadro de la V ahora es Indigo */}
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tighter">VORA</h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Artemix S.A.</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {MENU_ITEMS.map((group, idx) => (
          <div key={idx} className="mb-8">
            <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all group ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <button className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-indigo-600 transition-all">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}