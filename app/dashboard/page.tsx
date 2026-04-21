'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Users, 
  Image as ImageIcon,
  Calendar,
  LayoutDashboard
} from 'lucide-react'

export default function DashboardHomePage() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [specialistsCount, setSpecialistsCount] = useState(0)
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 1. Datos operativos de la organización
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user?.id)
        .single()
      
      if (org) {
        setData(org)

        // 2. Conteo de especialistas activos
        const { count } = await supabase
          .from('specialists')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
        setSpecialistsCount(count || 0)

        // 3. FASE 1: Cargar Logs del Sistema (Observabilidad)
        const { data: systemLogs } = await supabase
          .from('system_logs')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
          .limit(4)
        setLogs(systemLogs || [])
      }
      setIsLoading(false)
    }
    fetchDashboardData()
  }, [supabase])

  if (isLoading || !data) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="animate-spin h-8 w-8 border-4 border-rose-700 border-t-transparent rounded-full"></span>
    </div>
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-slate-900">
      
      {/* HEADER: STATUS DE IA + SALUD DEL SISTEMA */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Command Center</h2>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <h1 className="text-3xl md:text-4xl font-black text-rose-950 tracking-tighter leading-tight">
              VORA está <span className="text-rose-700 italic">Operando</span>
            </h1>
          </div>
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="bg-rose-50 px-6 py-4 rounded-3xl border border-rose-100 flex-1 lg:flex-none">
             <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1 text-center lg:text-left">Link de Agenda</p>
             <p className="text-xs font-bold text-rose-950 opacity-60 break-all">vora.ai/{data.id.slice(0,8)}</p>
          </div>
        </div>
      </header>

      {/* BENTO GRID OPERATIVO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Ventas Fiscales (Mantenemos tu lógica de Artemix) */}
        <div className="md:col-span-2 bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-8 rounded-[40px] text-white shadow-xl shadow-slate-200 flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-4">Ventas Año Fiscal ({data.currency_symbol})</p>
            <h3 className="text-6xl font-black tracking-tighter italic">${data.fiscal_year_sales || '0.00'}</h3>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-white/20 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Facturas FEL Disponibles</span>
            <span className="text-2xl font-black tracking-tighter">{data.balance_invoices || '0'}</span>
          </div>
        </div>

        {/* Card 2: Equipo */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-slate-400">
              <Users size={20} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialistas</p>
            <h3 className="text-5xl font-black text-rose-950 tracking-tighter">{specialistsCount}</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-tighter italic">
            Plan {data.subscription_tier?.toUpperCase()}
          </p>
        </div>

        {/* Card 3: IA & Diseño */}
        <div className="bg-rose-950 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl min-h-[220px]">
          <div>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 text-rose-400">
              <ImageIcon size={20} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Diseños Disponibles</p>
            <h3 className="text-5xl font-black italic tracking-tighter">{data.design_credits || '0'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">IA Balance: {data.ai_images_balance || '0'}</span>
          </div>
        </div>

        {/* SECCIÓN DIVIDIDA: AGENDA VS LOGS DEL SISTEMA */}
        <div className="md:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Agenda de Hoy */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-rose-950 uppercase tracking-widest">Agenda de Hoy</h3>
              <Calendar size={18} className="text-slate-300" />
            </div>
            <div className="flex flex-col items-center py-12 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
              <p className="text-slate-400 font-bold text-xs">Sin citas para hoy.</p>
            </div>
          </div>

          {/* Logs del Sistema (Fase 1: Observabilidad) */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-rose-950 uppercase tracking-widest text-balance">Actividad de la IA</h3>
              <Activity size={18} className="text-rose-500" />
            </div>
            
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-xs font-bold italic uppercase tracking-widest">Esperando actividad...</p>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50 last:border-0">
                    {log.level === 'ERROR' ? <AlertCircle className="text-rose-500 w-5 h-5" /> : <CheckCircle2 className="text-green-500 w-5 h-5" />}
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{log.message}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded-md text-slate-500 uppercase">{log.module}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      <footer className="text-center pb-6">
        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">Artemix S.A. • Systems Engineering • 2026</p>
      </footer>
    </div>
  )
}