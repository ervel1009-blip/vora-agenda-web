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
    group: 'Finanzas',
    items: [
      { name: 'Suscripción', href: '/dashboard/suscripcion', icon: TrendingUp },
      { name: 'Métodos de Pago', href: '/dashboard/suscripcion/tarjeta', icon: CreditCard },
      { name: 'Facturas FEL', href: '/dashboard/suscripcion/historial', icon: History },
    ]
  },
  {
    group: 'Soporte',
    items: [
      { name: 'Asistente IA', href: '/dashboard/soporte', icon: LifeBuoy },
      { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-100 flex flex-col h-full">
      <div className="p-8">
        <div className="flex items-center gap-3">
          {/* La "V" ahora es Palo Rosa con sombra suave */}
          <div className="w-11 h-11 bg-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
            <span className="text-white font-black text-2xl">V</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tighter">VORA</h2>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Artemix S.A.</p>
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
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group ${
                      isActive 
                        ? 'bg-rose-50 text-rose-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-50">
        <button className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">
          <LogOut className="w-5 h-5" />
          Salir
        </button>
      </div>
    </aside>
  )
}