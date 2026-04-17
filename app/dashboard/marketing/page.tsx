'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Download, QrCode, Trash2, RotateCcw, History, LayoutGrid } from 'lucide-react'

export default function MarketingPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [slugs, setSlugs] = useState<any[]>([])
  const [showInactive, setShowInactive] = useState(false)
  
  const [form, setForm] = useState({
    slug: '',
    channel_type: 'general',
    vora_number: '50251151814',
    custom_welcome: '' 
  })

  // 🛡️ Memorizamos fetchSlugs para evitar re-renders innecesarios
  const fetchSlugs = useCallback(async (id: string, viewInactive: boolean) => {
    const { data } = await supabase
      .from('tenant_slugs')
      .select('*')
      .eq('organization_id', id)
      .eq('is_active', !viewInactive) // Si viewInactive es false, trae is_active: true
      .order('created_at', { ascending: false })
    
    if (data) setSlugs(data)
  }, [supabase])

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .single()
        if (org) {
          setOrgId(org.id)
          fetchSlugs(org.id, showInactive)
        }
      }
    }
    fetchOrg()
  }, [fetchSlugs, showInactive])

  const handleCreateSlug = async () => {
    if (!form.slug || !orgId) return
    setLoading(true)

    const cleanSlug = form.slug.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()

    try {
      const { data: existing } = await supabase
        .from('tenant_slugs')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle()

      if (existing) {
        alert("Este hashtag ya está siendo usado. Prueba uno diferente. 💡")
        return
      }

      const { error } = await supabase
        .from('tenant_slugs')
        .insert([{
          organization_id: orgId,
          slug: cleanSlug,
          channel_type: form.channel_type,
          custom_welcome: form.custom_welcome,
          campaign_metadata: { created_via: 'web_dashboard' }
        }])

      if (error) throw error

      setForm({ ...form, slug: '', custom_welcome: '' })
      fetchSlugs(orgId, false)
      setShowInactive(false) // Volvemos a la vista de activos tras crear
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateWaLink = (slug: string) => {
    const baseText = `¡Hola! Necesito mas informacion `; 
    const fullText = `${baseText} #${slug}`;
    return `https://wa.me/${form.vora_number}?text=${encodeURIComponent(fullText)}`;
  }

  const handleDownloadQR = (slug: string, id: string) => {
    const svgElement = document.getElementById(id);
    if (!svgElement) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `VORA_QR_${slug.toUpperCase()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const handleDeleteSlug = async (id: string) => {
    if (!window.confirm("¿Desactivar esta promoción? Los QRs dejarán de funcionar.")) return;
    try {
      const { error } = await supabase
        .from('tenant_slugs')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      setSlugs(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleRestoreSlug = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tenant_slugs')
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
      setSlugs(prev => prev.filter(s => s.id !== id)); // Removemos de la vista de historial
      alert("¡Promoción reactivada! 🚀");
    } catch (err: any) {
      console.error(err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 min-h-screen">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-rose-950 tracking-tighter">
            Marketing <span className="text-rose-700">& QR</span>
          </h1>
          <p className="text-slate-500 font-medium">Genera puertas de entrada automáticas para tus clientes.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div className="md:col-span-1 bg-white p-8 rounded-[35px] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6 h-fit">
          <h2 className="text-xl font-black text-rose-950 flex items-center gap-2">
            <QrCode className="text-rose-700" /> Nuevo Hashtag
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Slug (Hashtag)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-700 font-bold">#</span>
                <input 
                  className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 pl-8 text-slate-900 font-bold focus:border-rose-600 outline-none transition-all"
                  placeholder="ej-promo-abril"
                  value={form.slug}
                  onChange={(e) => setForm({...form, slug: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Canal de Origen</label>
              <select 
                className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-bold focus:border-rose-600 outline-none appearance-none"
                value={form.channel_type}
                onChange={(e) => setForm({...form, channel_type: e.target.value})}
              >
                <option value="general">General</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="qr_fisico">QR Impreso (Recepción)</option>
              </select>
            </div>
               
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensaje de Bienvenida</label>
              <textarea 
                className="w-full bg-slate-50 border-slate-200 border rounded-2xl p-4 text-slate-900 font-medium focus:border-rose-600 outline-none transition-all resize-none h-24 text-sm"
                placeholder="¡Bienvenido! ¿En qué podemos ayudarte?"
                value={form.custom_welcome}
                onChange={(e) => setForm({...form, custom_welcome: e.target.value})}
              />
            </div>

            <button 
              onClick={handleCreateSlug}
              disabled={loading || !form.slug}
              className="w-full bg-rose-700 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-rose-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Procesando...' : 'Generar Link & QR'}
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: LISTADO */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-black text-rose-950">
              {showInactive ? 'Historial / Inactivos' : 'Tus Puertas de Enlace'}
            </h2>
            <button 
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${
                showInactive ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showInactive ? <LayoutGrid size={14} /> : <History size={14} />}
              {showInactive ? 'VER ACTIVOS' : 'VER HISTORIAL'}
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {slugs.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No hay promociones {showInactive ? 'en el historial' : 'activas'}.</p>
              </div>
            )}
            
            {slugs.map((s) => {
              const qrId = `qr-code-${s.id}`;
              const waLink = generateWaLink(s.slug);
              
              return (
                <div key={s.id} className={`bg-white p-6 rounded-[35px] border border-slate-100 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all group relative ${!s.is_active && 'opacity-75'}`}>
                  
                  {/* ACCIÓN SEGÚN ESTADO */}
                  <button 
                    onClick={() => s.is_active ? handleDeleteSlug(s.id) : handleRestoreSlug(s.id)}
                    className={`absolute top-5 right-5 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                      s.is_active ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50' : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                    }`}
                    title={s.is_active ? "Desactivar" : "Reactivar"}
                  >
                    {s.is_active ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                  </button>

                  <div className={`bg-slate-50 p-5 rounded-[30px] transition-transform ${s.is_active && 'group-hover:scale-105'}`}>
                    <QRCodeSVG id={qrId} value={waLink} size={130} level="H" includeMargin />
                  </div>
                  
                  <div>
                    <h3 className="font-black text-rose-950 text-lg uppercase tracking-tighter">#{s.slug}</h3>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{s.channel_type}</p>
                  </div>

                  <div className="flex flex-col gap-2 w-full pt-4 border-t border-slate-50">
                    {s.is_active ? (
                      <>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(waLink);
                            alert("¡Link copiado! 📋");
                          }}
                          className="flex items-center justify-center gap-2 text-xs font-black text-rose-700 hover:text-rose-900 py-1 transition-colors"
                        >
                          <Copy size={14} /> COPIAR LINK WA
                        </button>
                        <button 
                          onClick={() => handleDownloadQR(s.slug, qrId)}
                          className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                        >
                          <Download size={14} /> DESCARGAR QR (.SVG)
                        </button>
                      </>
                    ) : (
                      <div className="py-2 text-[10px] font-black text-rose-700 bg-rose-50 rounded-xl uppercase tracking-widest">
                        Promoción Inactiva
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}