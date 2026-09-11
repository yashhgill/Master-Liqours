import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FaSearch, FaUpload, FaCheck, FaSpinner, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL || 'https://master-liqours.onrender.com';
const MKEY = 'warehouse2026fix';

export default function ImageTool() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Products
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bottle image
  const [sourceUrl, setSourceUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [bottleSize, setBottleSize] = useState(75);
  const [bottleY, setBottleY] = useState(50);
  const [hasPreview, setHasPreview] = useState(false);

  // Backdrop — stored as blob URL in state + ref
  const [backdrops, setBackdrops] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ml_backdrops') || '[]'); } catch { return []; }
  }); // [{ name, url }] — url is a blob: URL (session) or data: URL (persistent)
  const [activeBackdropIdx, setActiveBackdropIdx] = useState(null);
  const [loadingBackdrop, setLoadingBackdrop] = useState(false);

  // Description
  const [description, setDescription] = useState('');
  const [genDesc, setGenDesc] = useState(false);

  // remove.bg key
  const [removeBgKey, setRemoveBgKey] = useState(() => localStorage.getItem('removebg_key') || '');

  // Refs
  const canvasRef = useRef(null);
  const previewRef = useRef(null); // img element for display
  const bottleImgRef = useRef(null); // current processed bottle Image element
  const backdropImgRef = useRef(null); // current active backdrop Image element
  const fileRef = useRef(null);
  const backdropFileRef = useRef(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/products/all-names`, { withCredentials: true });
      setProducts(r.data || []);
    } catch { setStatus('Failed to load products'); }
    setLoading(false);
  };

  const hasImage = p => !!(p.image_url && p.image_url.startsWith('http'));
  const missingCount = products.filter(p => !hasImage(p)).length;
  const filtered = products.filter(p => {
    const m = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'missing') return m && !hasImage(p);
    if (filter === 'has') return m && hasImage(p);
    return m;
  });

  // ─── COMPOSITE ───────────────────────────────────────────────────────────
  // Uses refs (not state) so it always has latest values without stale closure
  const redraw = useCallback(() => {
    const bottle = bottleImgRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !bottle) return;

    const ctx = canvas.getContext('2d');
    const S = 800;
    canvas.width = S; canvas.height = S;

    const backdrop = backdropImgRef.current;
    if (backdrop) {
      // Photo backdrop — cover fit
      const bw = backdrop.naturalWidth || backdrop.width;
      const bh = backdrop.naturalHeight || backdrop.height;
      const scale = Math.max(S / bw, S / bh);
      const dw = bw * scale, dh = bh * scale;
      ctx.drawImage(backdrop, (S - dw) / 2, (S - dh) / 2, dw, dh);
      // Dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, S, S);
      // Subtle pink glow
      const g = ctx.createRadialGradient(S/2, S*0.7, 0, S/2, S*0.6, S*0.4);
      g.addColorStop(0, 'rgba(255,0,127,0.1)'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    } else {
      // Dark gradient fallback
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, S, S);
      const g = ctx.createRadialGradient(S/2, S*0.7, 0, S/2, S*0.6, S*0.55);
      g.addColorStop(0, 'rgba(255,0,127,0.18)'); g.addColorStop(0.6, 'rgba(120,0,60,0.07)'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = 'rgba(255,0,127,0.05)'; ctx.lineWidth = 1;
      for (let y = S*0.28; y < S; y += S*0.12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
      ctx.save(); ctx.font = `bold ${S*0.5}px serif`; ctx.fillStyle = 'rgba(255,0,127,0.03)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', S/2, S*0.52); ctx.restore();
    }

    // Bottle
    const maxH = S * (bottleSize / 100), maxW = S * 0.72;
    const scale = Math.min(maxW / bottle.naturalWidth, maxH / bottle.naturalHeight);
    const bW = bottle.naturalWidth * scale, bH = bottle.naturalHeight * scale;
    const bX = (S - bW) / 2, bY = S * (bottleY / 100) - bH / 2;

    ctx.save(); ctx.shadowColor = 'rgba(255,0,127,0.3)'; ctx.shadowBlur = 55; ctx.shadowOffsetY = 14;
    ctx.drawImage(bottle, bX, bY, bW, bH); ctx.restore();

    // Reflection
    const reflH = bH * 0.25, reflY = bY + bH;
    ctx.save(); ctx.transform(1, 0, 0, -1, 0, reflY * 2 + reflH); ctx.globalAlpha = 0.22;
    ctx.drawImage(bottle, bX, bY, bW, bH); ctx.restore();
    const fade = ctx.createLinearGradient(0, reflY, 0, reflY + reflH);
    fade.addColorStop(0, 'rgba(5,5,5,0.5)'); fade.addColorStop(1, 'rgba(5,5,5,1)');
    ctx.fillStyle = fade; ctx.fillRect(bX - 4, reflY, bW + 8, reflH);

    // Update preview img element
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      if (previewRef.current) {
        if (previewRef.current.src?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.src);
        previewRef.current.src = url;
      }
      setHasPreview(true);
    }, 'image/jpeg', 0.92);
  }, [bottleSize, bottleY]); // only depend on sliders — backdrop via ref

  // Redraw when sliders change
  useEffect(() => { if (bottleImgRef.current) redraw(); }, [bottleSize, bottleY, redraw]);

  // ─── BACKDROP ────────────────────────────────────────────────────────────
  const setBackdropActive = useCallback(async (idx) => {
    if (idx === null || idx === undefined) {
      backdropImgRef.current = null;
      setActiveBackdropIdx(null);
      if (bottleImgRef.current) redraw();
      return;
    }
    const bList = JSON.parse(localStorage.getItem('ml_backdrops') || '[]');
    const bd = bList[idx];
    if (!bd) return;
    setLoadingBackdrop(true);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = bd.dataUrl; });
      backdropImgRef.current = img;
      setActiveBackdropIdx(idx);
      if (bottleImgRef.current) redraw();
    } catch { setStatus('Failed to load backdrop'); }
    setLoadingBackdrop(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingBackdrop(true);
    try {
      // Convert to data URL for persistence across sessions
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = ev => res(ev.target.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 30);
      const newEntry = { name, dataUrl };
      const existing = JSON.parse(localStorage.getItem('ml_backdrops') || '[]');
      const updated = [...existing, newEntry];
      localStorage.setItem('ml_backdrops', JSON.stringify(updated));
      setBackdrops(updated);
      // Auto-activate the newly uploaded backdrop
      const newIdx = updated.length - 1;
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
      backdropImgRef.current = img;
      setActiveBackdropIdx(newIdx);
      if (bottleImgRef.current) redraw();
      setStatus('✅ Backdrop uploaded and applied!');
    } catch { setStatus('Failed to upload backdrop'); }
    setLoadingBackdrop(false);
    e.target.value = '';
  };

  const removeBackdrop = (idx) => {
    const updated = backdrops.filter((_, i) => i !== idx);
    localStorage.setItem('ml_backdrops', JSON.stringify(updated));
    setBackdrops(updated);
    if (activeBackdropIdx === idx) {
      backdropImgRef.current = null;
      setActiveBackdropIdx(null);
      if (bottleImgRef.current) redraw();
    } else if (activeBackdropIdx > idx) {
      setActiveBackdropIdx(prev => prev - 1);
    }
  };

  // ─── BOTTLE IMAGE ─────────────────────────────────────────────────────────
  const processBottle = async (source) => {
    setProcessing(true); setStatus('Processing...');
    try {
      let input = source;
      if (removeBgKey) {
        setStatus('Removing background...');
        const form = new FormData();
        form.append('size', 'auto');
        if (source instanceof Blob) form.append('image_file', source, 'img.png');
        else form.append('image_url', source);
        const r = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST', headers: { 'X-Api-Key': removeBgKey }, body: form,
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.errors?.[0]?.title || `remove.bg error`); }
        input = await r.blob();
      }
      setStatus('Compositing...');
      const objUrl = input instanceof Blob ? URL.createObjectURL(input) : input;
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = objUrl; });
      bottleImgRef.current = img;
      redraw();
      setStatus('Looking good! Adjust then save.');
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setProcessing(false);
  };

  // ─── SAVE ─────────────────────────────────────────────────────────────────
  const saveToProduct = async () => {
    if (!selected || !canvasRef.current || !hasPreview) return;
    setUploading(true); setStatus('Uploading...');
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/jpeg', 0.92));
      const form = new FormData();
      form.append('file', blob, `product-${selected.product_id}.jpg`);
      const up = await axios.post(`${API}/api/admin/upload`, form,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = up.data.url;
      await axios.patch(`${API}/api/admin/products/${selected.product_id}`,
        { name: selected.name, price: selected.price, category: selected.category || 'Whiskey', image_url: imageUrl, is_active: true },
        { withCredentials: true });
      setProducts(prev => prev.map(p => p.product_id === selected.product_id ? { ...p, image_url: imageUrl } : p));
      setSelected(s => ({ ...s, image_url: imageUrl }));
      setStatus('✅ Saved! Pick next product.');
      bottleImgRef.current = null; setHasPreview(false);
      if (previewRef.current) previewRef.current.src = '';
    } catch (e) { setStatus(`Failed: ${e.response?.data?.detail || e.message}`); }
    setUploading(false);
  };

  // ─── AI DESCRIPTION ───────────────────────────────────────────────────────
  const generateDescription = async () => {
    if (!selected) return;
    setGenDesc(true);
    try {
      const r = await fetch(`${API}/api/admin/generate-description?maintenance_key=${MKEY}&product_name=${encodeURIComponent(selected.name)}&category=${encodeURIComponent(selected.category || 'Spirits')}`, { method: 'POST' });
      const d = await r.json();
      if (d.description) setDescription(d.description);
    } catch {}
    setGenDesc(false);
  };

  const saveDescription = async () => {
    if (!selected || !description.trim()) return;
    try {
      await axios.patch(`${API}/api/admin/products/${selected.product_id}`,
        { name: selected.name, price: selected.price, category: selected.category || 'Whiskey', description: description.trim(), is_active: true },
        { withCredentials: true });
      setStatus(s => s.startsWith('✅') ? '✅ Image + description saved!' : '✅ Description saved!');
    } catch {}
  };

  if (!user || !['master_admin', 'super_admin'].includes(user.role))
    return <div className="min-h-screen flex items-center justify-center text-white/50">Admin only</div>;

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white p-1"><FaArrowLeft /></button>
        <div>
          <h1 className="font-display text-2xl neon-pink-text leading-none">IMAGE TOOL</h1>
          <p className="text-[10px] text-white/30">{products.length} products · <span className="text-[#ff007f]">{missingCount} missing</span></p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="password" placeholder="remove.bg key (optional)"
            value={removeBgKey}
            onChange={e => { setRemoveBgKey(e.target.value); localStorage.setItem('removebg_key', e.target.value); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff007f] w-56" />
          <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer" className="text-xs text-[#ff007f] hover:underline whitespace-nowrap">Get free key →</a>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT: product list ── */}
        <div className="w-64 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={11} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full bg-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#ff007f]" />
            </div>
            <div className="flex gap-1">
              {[['all','All'],['missing','Missing'],['has','Has img']].map(([f,l]) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${filter===f?'bg-[#ff007f] text-white':'bg-white/5 text-white/40 hover:bg-white/10'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex items-center justify-center h-32 text-white/20 text-xs">Loading...</div>
              : filtered.map(p => (
              <button key={p.product_id}
                onClick={() => { setSelected(p); setHasPreview(false); setStatus(''); setSourceUrl(''); setDescription(''); bottleImgRef.current = null; if (previewRef.current) previewRef.current.src = ''; }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 border-b border-white/5 text-left hover:bg-white/5 transition-all ${selected?.product_id===p.product_id?'bg-white/8 border-l-2 !border-l-[#ff007f]':''}`}>
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {hasImage(p)?<img src={p.image_url} alt="" className="w-full h-full object-cover"/>
                    :<div className="w-full h-full flex items-center justify-center text-white/15 text-[8px]">?</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-white/30 truncate">{p.category}</div>
                  <div className="text-[11px] font-semibold truncate leading-tight">{p.name}</div>
                </div>
                {hasImage(p)&&<div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] flex-shrink-0"/>}
              </button>
            ))}
            {!loading&&filtered.length===0&&<div className="text-center py-10 text-white/20 text-xs">No products</div>}
          </div>
        </div>

        {/* ── RIGHT: editor ── */}
        <div className="flex-1 overflow-auto p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-white/20">
              <div className="text-center"><div className="text-5xl mb-3">🍾</div><p className="text-sm">Select a product</p></div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto grid md:grid-cols-[300px_1fr] gap-8">

              {/* Preview + sliders */}
              <div className="space-y-4">
                <canvas ref={canvasRef} className="hidden" />
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <img ref={previewRef} alt="preview"
                    className={`w-full h-full object-cover ${hasPreview ? '' : 'hidden'}`} />
                  {!hasPreview && (
                    <div className="text-center text-white/20 p-6">
                      {selected.image_url
                        ? <img src={selected.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                        : <><div className="text-4xl mb-2">📷</div><p className="text-xs">Upload bottle image</p></>}
                    </div>
                  )}
                </div>

                {/* Sliders — only when bottle loaded */}
                {bottleImgRef.current && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-4">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Adjust bottle</p>
                    <div>
                      <div className="flex justify-between text-xs text-white/50 mb-2"><span>Size</span><span className="text-[#ff007f] font-bold">{bottleSize}%</span></div>
                      <input type="range" min={25} max={95} value={bottleSize} onChange={e => setBottleSize(+e.target.value)} className="w-full accent-[#ff007f]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-white/50 mb-2"><span>Position</span><span className="text-[#ff007f] font-bold">{bottleY}%</span></div>
                      <input type="range" min={15} max={85} value={bottleY} onChange={e => setBottleY(+e.target.value)} className="w-full accent-[#ff007f]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-5">
                <div>
                  <div className="text-xs text-[#ff007f] font-bold uppercase tracking-wider mb-0.5">{selected.category}</div>
                  <h2 className="font-display text-3xl uppercase leading-tight mb-1">{selected.name}</h2>
                  <div className="text-[#ffd700] font-bold text-lg">RM{selected.price?.toFixed(2)}</div>
                </div>

                {/* ── BACKDROP SECTION ── */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">Backdrop</p>
                    {activeBackdropIdx !== null && (
                      <button onClick={() => setBackdropActive(null)}
                        className="text-[10px] text-white/30 hover:text-[#ff007f] transition-colors">
                        Clear backdrop
                      </button>
                    )}
                  </div>

                  {backdrops.length === 0 ? (
                    <p className="text-xs text-white/25 text-center py-2">No backdrops yet — upload one below</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {backdrops.map((bd, i) => (
                        <div key={i} className="relative group">
                          <button onClick={() => setBackdropActive(i)}
                            className={`w-full aspect-video rounded-xl overflow-hidden border-2 transition-all block ${activeBackdropIdx===i?'border-[#ff007f] shadow-[0_0_12px_rgba(255,0,127,0.4)]':'border-white/10 hover:border-white/30'}`}>
                            <img src={bd.dataUrl} alt={bd.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-black/60 to-transparent">
                              <span className="text-[8px] font-bold text-white truncate px-1">{bd.name}</span>
                            </div>
                          </button>
                          <button onClick={() => removeBackdrop(i)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <FaTimes size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => backdropFileRef.current?.click()} disabled={loadingBackdrop}
                    className="w-full py-2.5 border-2 border-dashed border-white/15 rounded-xl text-xs text-white/40 hover:border-[#ff007f] hover:text-[#ff007f] transition-all flex items-center justify-center gap-2">
                    <FaUpload size={10} /> {loadingBackdrop ? 'Loading...' : 'Upload backdrop photo'}
                  </button>
                  <input ref={backdropFileRef} type="file" accept="image/*" onChange={handleBackdropFile} className="hidden" />
                  <p className="text-[10px] text-white/20">Upload a JPG/PNG — it appears in the grid above and behind the bottle. Works across all products.</p>
                </div>

                <div className="border-t border-white/5" />

                {/* Bottle image input */}
                <div className="space-y-3">
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(selected.name+' bottle PNG transparent')}&tbm=isch`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/70 hover:bg-white/10 transition-all">
                    <FaSearch size={12} /> Search Google Images for this bottle
                  </a>
                  <div className="flex gap-2">
                    <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && !processing && sourceUrl && processBottle(sourceUrl.trim())}
                      placeholder="Paste bottle image URL..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff007f]" />
                    <button onClick={() => processBottle(sourceUrl.trim())} disabled={processing||!sourceUrl}
                      className="px-5 py-2.5 bg-[#ff007f] rounded-2xl font-bold text-sm disabled:opacity-40 hover:brightness-110 transition-all">
                      {processing?<FaSpinner className="animate-spin"/>:'Go'}
                    </button>
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={processing}
                    className="w-full py-3 border-2 border-dashed border-white/15 rounded-2xl text-sm text-white/40 hover:border-[#ff007f] hover:text-[#ff007f] transition-all flex items-center justify-center gap-2">
                    <FaUpload size={12} /> Upload bottle image from computer
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f) processBottle(f); }} className="hidden" />
                </div>

                {/* Status */}
                {status && (
                  <div className={`px-4 py-3 rounded-2xl text-sm border ${status.startsWith('✅')?'bg-[#39ff14]/10 border-[#39ff14]/30 text-[#39ff14]':status.startsWith('Error')||status.startsWith('Failed')?'bg-red-500/10 border-red-500/30 text-red-400':'bg-white/5 border-white/10 text-white/60'}`}>
                    {status}
                  </div>
                )}

                {/* Save */}
                {hasPreview && (
                  <button onClick={saveToProduct} disabled={uploading}
                    className="w-full py-4 bg-gradient-to-r from-[#ff007f] to-[#c8005a] rounded-2xl font-bold hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {uploading?<><FaSpinner className="animate-spin"/>Saving...</>:<><FaCheck/>Save to product</>}
                  </button>
                )}

                {/* AI Description */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold">AI Description</p>
                    <button onClick={generateDescription} disabled={genDesc||!selected}
                      className="px-3 py-1.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-xl text-xs font-bold text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all disabled:opacity-40">
                      {genDesc?'✨ Writing...':'✨ Generate'}
                    </button>
                  </div>
                  <textarea value={description} onChange={e=>setDescription(e.target.value)}
                    placeholder="Click Generate or type your own description..."
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f0ff] resize-none" />
                  {description.trim()&&(
                    <button onClick={saveDescription}
                      className="w-full py-2 bg-[#00f0ff]/15 border border-[#00f0ff]/30 rounded-xl text-sm font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-all">
                      Save description
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
