'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Activity, AlertCircle, CheckCircle2, 
  Users, Calendar, ShieldCheck, TrendingUp, Clock
} from 'lucide-react'

export default function DashboardHomePage() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [specialistsCount, setSpecialistsCount] = useState(0)
  const [stats, setStats] = useState({ today: 0, month: 0 })
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user?.id).single()
      
      if (org) {
        setData(org)
        
        // 1. Conteo de Especialistas
        const { count: sCount } = await supabase.from('specialists').select('*', { count: 'exact', head: true }).eq('organization_id', org.id)
        setSpecialistsCount(sCount || 0)

        // 2. Métricas de Citas (Confirmadas)
        const today = new Date().toISOString().split('T')[0]
        const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

        const { count: countToday } = await supabase.from('appointments_v_nexus')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .gte('start_time', today)

        const { count: countMonth } = await supabase.from('appointments_v_nexus')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .gte('start_time', firstDayMonth)

        setStats({ today: countToday || 0, month: countMonth || 0 })

        // 3. Audit Logs
        const { data: systemLogs } = await supabase.from('system_logs').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(4)
        setLogs(systemLogs || [])
      }
      setIsLoading(false)
    }
    fetchDashboardData()
  }, [supabase])

  if (isLoading || !data) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></span>
    </div>
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-slate-900 pb-10 px-2">
      
      {/* HEADER: STATUS PROFESIONAL */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sistema Operativo VORA v1.0</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">
            Dashboard <span className="text-emerald-600 italic">{data.name.replace('VORA - ', '')}</span>
          </h1>
        </div>
        
        <div className="bg-white border border-slate-200 px-6 py-4 rounded-[32px] shadow-sm flex items-center gap-4">
           <div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Link de Agenda IA</p>
             <span className="text-sm font-bold text-emerald-600 italic tracking-tight underline cursor-pointer">
               vora.ai/{data.id.slice(0,8).toUpperCase()}
             </span>
           </div>
           <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
             <ShieldCheck size={20} strokeWidth={2.5} />
           </div>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card Ventas Principal */}
        <div className="md:col-span-2 bg-slate-950 p-10 rounded-[48px] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6 opacity-80">Ventas Acumuladas ({data.currency_symbol})</p>
            <h3 className="text-6xl font-black tracking-tighter italic">
              {data.currency_symbol} {Number(data.fiscal_year_sales || 0).toLocaleString()}
            </h3>
          </div>
          <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-10 relative z-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Plan Actual</span>
              <span className="text-sm font-black text-emerald-500 uppercase tracking-tighter">{data.subscription_tier}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Facturas Disponibles</span>
              <span className="text-2xl font-black text-white tracking-tighter">{data.balance_invoices || '0'}</span>
            </div>
          </div>
        </div>

        {/* Card Especialistas */}
        <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 border border-slate-50">
              <Users size={22} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialistas</p>
            <h3 className="text-5xl font-black text-slate-950 tracking-tighter">{specialistsCount}</h3>
          </div>
          <p className="text-[9px] font-black text-emerald-600 uppercase mt-4">Activos en plataforma</p>
        </div>

        {/* Card Citas Confirmadas (NUEVA) */}
        <div className="bg-emerald-600 p-8 rounded-[48px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white backdrop-blur-md">
              <Calendar size={22} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Citas Hoy</p>
            <h3 className="text-5xl font-black tracking-tighter">{stats.today}</h3>
          </div>
          <div className="pt-4 border-t border-white/20">
            <p className="text-[10px] font-black uppercase text-white/80 tracking-widest flex justify-between">
              <span>Este Mes:</span>
              <span className="text-white">{stats.month}</span>
            </p>
          </div>
        </div>

        {/* AGENDA Y LOGS */}
        <div className="md:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Agenda de Hoy */}
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Agenda de Hoy</h3>
               <Clock size={16} className="text-slate-300" />
            </div>
            {/* Aquí podrías mapear una lista corta de citas */}
            <div className="py-16 border border-dashed border-slate-100 rounded-[32px] bg-slate-50/40 flex flex-col items-center">
              <Calendar className="text-slate-200 mb-4" size={40} />
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sincronizado con Google Calendar</p>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">IA Audit Log</h3>
              <Activity size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-center py-10 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">Sin actividad reciente</p>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center p-4 hover:bg-slate-50 rounded-[28px] transition-all group">
                    <div className={`p-2.5 rounded-2xl ${log.level === 'ERROR' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {log.level === 'ERROR' ? <AlertCircle size={18} strokeWidth={3} /> : <CheckCircle2 size={18} strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900 leading-none mb-1.5">{log.message}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center pt-10">
        <div className="h-px w-20 bg-slate-100 mx-auto mb-6"></div>
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.6em]">Artemix S.A. • Guatemala • 2026</p>
      </footer>
    </div>
  )
}