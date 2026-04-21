'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Activity, AlertCircle, CheckCircle2, 
  Users, Image as ImageIcon, Calendar, ShieldCheck 
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
      const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user?.id).single()
      
      if (org) {
        setData(org)
        const { count } = await supabase.from('specialists').select('*', { count: 'exact', head: true }).eq('organization_id', org.id)
        setSpecialistsCount(count || 0)
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
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">AI Live Monitoring</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">
            Dashboard <span className="text-emerald-600 italic">VORA</span>
          </h1>
        </div>
        
        <div className="bg-white border border-slate-200 px-6 py-4 rounded-[32px] shadow-sm flex items-center gap-4">
           <div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Enlace de Agenda</p>
             <span className="text-sm font-bold text-slate-900 italic tracking-tight">vora.ai/{data.id.slice(0,8)}</span>
           </div>
           <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
             <ShieldCheck size={20} strokeWidth={2.5} />
           </div>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card Dinero: Slate-950 (Elegancia pura) */}
        <div className="md:col-span-2 bg-slate-950 p-10 rounded-[48px] text-white shadow-2xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6 opacity-80">Ventas Año Fiscal ({data.currency_symbol})</p>
            <h3 className="text-6xl font-black tracking-tighter italic">
              ${Number(data.fiscal_year_sales || 0).toLocaleString()}
            </h3>
          </div>
          <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Saldo Facturas FEL</span>
            <span className="text-2xl font-black text-emerald-500 tracking-tighter">{data.balance_invoices || '0'}</span>
          </div>
        </div>

        {/* Card Especialistas */}
        <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 border border-slate-50">
              <Users size={22} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center md:text-left">Especialistas</p>
            <h3 className="text-5xl font-black text-slate-950 tracking-tighter text-center md:text-left">{specialistsCount}</h3>
          </div>
          <div className="mt-4 inline-flex items-center justify-center px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">
            {data.subscription_tier}
          </div>
        </div>

        {/* Card Créditos IA */}
        <div className="bg-emerald-600 p-8 rounded-[48px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white backdrop-blur-md">
              <ImageIcon size={22} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Créditos de Diseño</p>
            <h3 className="text-5xl font-black tracking-tighter">{data.design_credits || '0'}</h3>
          </div>
          <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">
            AI Balance: {data.ai_images_balance || '0'}
          </p>
        </div>

        {/* AGENDA Y LOGS */}
        <div className="md:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Agenda de Hoy</h3>
            <div className="py-16 border border-dashed border-slate-100 rounded-[32px] bg-slate-50/40 flex flex-col items-center">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Esperando citas...</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">IA Audit Log</h3>
              <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            </div>
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-center py-10 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">No hay registros</p>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center p-4 hover:bg-emerald-50/50 rounded-[28px] transition-all border border-transparent hover:border-emerald-50">
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
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.6em]">Artemix S.A. • Systems Engineering • 2026</p>
      </footer>
    </div>
  )
}