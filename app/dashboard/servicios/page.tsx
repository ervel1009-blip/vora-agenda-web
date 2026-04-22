'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import { Edit3, Plus, Trash2, Zap, Save, CheckCircle2, XCircle } from 'lucide-react'

// ... (Interfaces se mantienen igual)

export default function ServiciosPage() {
  // ... (Estados y useEffect se mantienen igual)

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col items-center ${isManagementMode ? 'p-2' : 'p-6 md:p-12'}`}>
      
      {!isManagementMode && <OnboardingProgress currentStep={5} />}

      <header className="mb-12 text-center flex flex-col items-center max-w-4xl w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestión de Catálogo</span>
        </div>
        
        <h1 className="text-5xl font-black text-slate-950 tracking-tighter leading-tight">
            {isManagementMode ? 'Mis ' : 'Configurar '} <span className="text-rose-600">Servicios</span>
        </h1>
        <p className="text-slate-500 mt-4 font-medium text-lg max-w-xl">
          {isManagementMode ? 'Optimiza los tiempos y precios de tu oferta comercial.' : 'Define los servicios que VORA agendará automáticamente.'}
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-10 w-full">
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-[24px] font-bold hover:bg-slate-50 shadow-sm flex items-center gap-3 transition-all active:scale-95">
            <Plus size={20} className="text-rose-600" strokeWidth={3} /> Nuevo Servicio
          </button>
          
          <button onClick={handleSyncWithAI} disabled={services.length === 0 || isLoadingAction} className="bg-slate-950 text-white px-10 py-4 rounded-[24px] font-bold shadow-xl disabled:opacity-50 flex items-center gap-3 transition-all hover:bg-slate-900 active:scale-95">
            {isManagementMode ? <><Zap size={18} className="text-rose-500" /> Sincronizar con VORA</> : 'Continuar a Planes →'}
          </button>
        </div>
        
        {/* Toggle Precios Estilo Sigiloso */}
        <div className="mt-8 flex items-center gap-4 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-100 shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Mostrar precios en el chat</span>
            <button 
                onClick={() => setShowPricesOnChat(!showPricesOnChat)}
                className={`w-10 h-5 rounded-full transition-all relative ${showPricesOnChat ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${showPricesOnChat ? 'right-1' : 'left-1'}`}></div>
            </button>
            <span className={`text-[9px] font-black uppercase ${showPricesOnChat ? 'text-emerald-600' : 'text-slate-400'}`}>
              {showPricesOnChat ? 'Activado' : 'Oculto'}
            </span>
        </div>
      </header>

      {/* GRID DE SERVICIOS - BENTO STYLE */}
      <div className="grid gap-6 w-full max-w-7xl md:grid-cols-2 lg:grid-cols-3 pb-20">
        {services.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-[48px] bg-white/50">
            <p className="text-slate-400 font-bold text-lg">Tu catálogo está vacío.</p>
          </div>
        )}
        
        {services.map(service => (
          <div key={service.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-rose-100 transition-all relative flex flex-col justify-between group">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(service)} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                  <Edit3 size={18} />
                </button>
                <button onClick={() => handleDeleteService(service.id)} className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                  <Trash2 size={18} />
                </button>
            </div>
            <div>
                <div className="flex items-center gap-2 mb-6">
                  {service.is_active ? 
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                      <CheckCircle2 size={10} strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Activo</span>
                    </div>
                    : 
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full">
                      <XCircle size={10} strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Pausado</span>
                    </div>
                  }
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{service.category || 'General'}</span>
                </div>
                
                <h3 className="font-black text-3xl text-slate-900 mb-3 tracking-tighter leading-tight">{service.service_name}</h3>
                <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-8 leading-relaxed">{service.description || 'Sin descripción adicional.'}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Precio</span>
                <span className="text-xl font-black text-rose-600 italic">{orgData?.currency_symbol}{service.price}</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-4">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Tiempo</span>
                <span className="text-lg font-bold text-slate-900">{service.duration_minutes}m</span>
              </div>
              <div className="flex flex-col border-l border-slate-50 pl-4">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Buffer</span>
                <span className="text-lg font-bold text-emerald-500">+{service.buffer_after_minutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CON ESTILO "SIGILOSO" */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[56px] shadow-2xl p-12 max-w-xl w-full border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-1 bg-rose-500 rounded-full"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Editor de Servicios</span>
            </div>
            <h2 className="text-4xl font-black text-slate-950 mb-8 tracking-tighter">
              {editingServiceId ? 'Actualizar ' : 'Crear '} <span className="text-rose-600">Servicio</span>
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Servicio</label>
                <input className="w-full bg-slate-50 border-slate-100 border-2 rounded-[24px] p-5 text-slate-900 font-bold outline-none focus:border-rose-400 transition-all text-lg"
                  value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} placeholder="Ej. Manicura Gel" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duración Total</label>
                    <div className="flex gap-2">
                      <select className="flex-1 bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-slate-900 font-bold outline-none"
                          value={form.duration_hours} onChange={e => setForm({...form, duration_hours: parseInt(e.target.value)})}>
                          {[0,1,2,3,4,5].map(h => <option key={h} value={h}>{h} h</option>)}
                      </select>
                      <select className="flex-1 bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-slate-900 font-bold outline-none"
                          value={form.duration_mins} onChange={e => setForm({...form, duration_mins: parseInt(e.target.value)})}>
                          {[0,15,30,45].map(m => <option key={m} value={m}>{m} m</option>)}
                      </select>
                    </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ({orgData?.currency_symbol || 'Q'})</label>
                  <input type="number" className="w-full bg-slate-50 border-slate-100 border-2 rounded-[20px] p-4 text-rose-600 font-black outline-none focus:border-rose-400 transition-all text-lg"
                    value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción para la IA</label>
                <textarea className="w-full bg-slate-50 border border-slate-100 border-2 rounded-[24px] p-5 text-slate-900 font-medium h-32 outline-none focus:border-rose-400 resize-none"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe el servicio para que VORA pueda venderlo mejor..." />
              </div>

              <div className="flex gap-4 mt-10">
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest">Cerrar</button>
                <button onClick={handleSaveService} disabled={isLoadingAction || !form.service_name} className="flex-[2] bg-rose-600 text-white py-5 rounded-[24px] font-black shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-3">
                  <Save size={20} /> {isLoadingAction ? 'Guardando...' : (editingServiceId ? 'Guardar Cambios' : 'Confirmar Registro')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}