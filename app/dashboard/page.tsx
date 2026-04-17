'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardHomePage() {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [specialistsCount, setSpecialistsCount] = useState(0)

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
      }
    }
    fetchDashboardData()
  }, [supabase])

  if (!data) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="animate-spin h-8 w-8 border-4 border-rose-700 border-t-transparent rounded-full"></span>
    </div>
  )

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto text-slate-900">
      
      {/* HEADER: STATUS DE IA */}
      <header className="flex flex-col md:row justify-between items-start md:items-center gap-6 bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Estado del Sistema</h2>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <h1 className="text-3xl md:text-4xl font-black text-rose-950 tracking-tighter leading-tight">
              VORA está <span className="text-rose-700 italic">Agendando</span>
            </h1>
          </div>
        </div>
        <div className="bg-rose-50 px-6 py-4 rounded-3xl border border-rose-100 w-full md:w-auto">
           <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Tu Link de Venta (TikTok)</p>
           <p className="text-xs font-bold text-rose-950 opacity-60 break-all">vora.ai/agenda/{data.id.slice(0,8)}</p>
        </div>
      </header>

      {/* BENTO GRID OPERATIVO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Ventas Fiscales */}
        <div className="md:col-span-2 bg-rose-700 bg-gradient-to-br from-rose-700 to-rose-600 p-8 rounded-[40px] text-white shadow-xl shadow-slate-200 flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-4">Ventas Año Fiscal ({data.currency_symbol})</p>
            <h3 className="text-6xl font-black tracking-tighter italic">${data.fiscal_year_sales}</h3>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-white/20 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Facturas Disponibles (FEL)</span>
            <span className="text-2xl font-black tracking-tighter">{data.balance_invoices}</span>
          </div>
        </div>

        {/* Card 2: Equipo */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialistas</p>
            <h3 className="text-5xl font-black text-rose-950 tracking-tighter">{specialistsCount}</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-tighter italic">
            Plan {data.subscription_tier.toUpperCase()}
          </p>
        </div>

        {/* Card 3: IA & Diseño */}
        <div className="bg-rose-950 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl min-h-[220px]">
          <div>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Diseños Disponibles</p>
            <h3 className="text-5xl font-black italic tracking-tighter">{data.design_credits}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">IA Images: {data.ai_images_balance}</span>
          </div>
        </div>

        {/* Card 4: Agenda Placeholder */}
        <div className="md:col-span-4 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-rose-950 uppercase tracking-widest">Agenda de Hoy</h3>
              <button className="text-[10px] font-black text-rose-700 uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-full hover:bg-rose-100 transition-all">Ver Calendario Full</button>
           </div>
           <div className="flex flex-col items-center py-16 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y2="2" x2="16" y1="6"/><line x1="8" y2="2" x2="8" y1="6"/><line x1="3" y2="10" x2="21" y1="10"/></svg>
              </div>
              <p className="text-slate-400 font-bold text-sm">Esperando tu primera cita desde TikTok...</p>
           </div>
        </div>

      </div>

      <footer className="text-center pb-10">
        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">Artemix S.A. • Systems Engineering • 2026</p>
      </footer>
    </div>
  )
}