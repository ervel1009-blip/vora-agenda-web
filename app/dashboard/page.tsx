'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Activity, AlertCircle, CheckCircle2, 
  Users, Image as ImageIcon, Calendar, Zap 
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
      <span className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></span>
    </div>
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-slate-900 pb-10 px-2">
      
      {/* HEADER: EL STATUS AHORA ES INDIGO/TEAL */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-transparent">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-indigo-500 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">System Monitoring</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">
            Bienvenido, <span className="text-indigo-600">{data.name.split(' ')[0]}</span>
          </h1>
        </div>
        
        <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Public Link</p>
           <div className="flex items-center gap-2">
             <span className="text-sm font-bold text-slate-900">vora.ai/{data.id.slice(0,8)}</span>
             <Zap size={14} className="text-indigo-500 fill-indigo-500" />
           </div>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Ventas (Slate-950 para máxima elegancia) */}
        <div className="md:col-span-2 bg-slate-950 p-10 rounded-[40px] text-white shadow-2xl flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6">Ventas Año Fiscal ({data.currency_symbol})</p>
            <h3 className="text-6xl font-black tracking-tighter italic">
              ${Number(data.fiscal_year_sales || 0).toLocaleString()}
            </h3>
          </div>
          <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-10">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Documentos FEL</span>
            <span className="text-2xl font-black text-indigo-500 tracking-tighter">{data.balance_invoices || '0'}</span>
          </div>
        </div>

        {/* Card 2: Especialistas */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
              <Users size={24} strokeWidth={3} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialistas</p>
            <h3 className="text-5xl font-black text-slate-950 tracking-tighter">{specialistsCount}</h3>
          </div>
          <div className="mt-4 inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase">
            Plan {data.subscription_tier}
          </div>
        </div>

        {/* Card 3: Créditos IA */}
        <div className="bg-indigo-600 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl shadow-indigo-100">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white backdrop-blur-md">
              <ImageIcon size={24} strokeWidth={3} />
            </div>
            <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Diseños Disponibles</p>
            <h3 className="text-5xl font-black tracking-tighter">{data.design_credits || '0'}</h3>
          </div>
          <p className="text-[9px] font-black uppercase text-white/70">
            IA Images: {data.ai_images_balance || '0'}
          </p>
        </div>

        {/* AGENDA Y LOGS */}
        <div className="md:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Agenda de Hoy</h3>
            <div className="py-14 border border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 flex flex-col items-center">
              <p className="text-slate-400 font-bold text-xs">Sin actividad para hoy</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">IA Activity Trail</h3>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-center py-12 text-slate-300 text-[10px] font-black uppercase italic tracking-widest">Awaiting bot activity...</p>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div className={`p-2 rounded-xl ${log.level === 'ERROR' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      {log.level === 'ERROR' ? <AlertCircle size={16} strokeWidth={3} /> : <CheckCircle2 size={16} strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800 leading-none mb-1">{log.message}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className="hidden md:block text-[8px] font-black bg-slate-100 px-2 py-1 rounded text-slate-400 uppercase tracking-widest">{log.module}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center pt-10">
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.5em]">Artemix S.A. • Systems Engineering • 2026</p>
      </footer>
    </div>
  )
}