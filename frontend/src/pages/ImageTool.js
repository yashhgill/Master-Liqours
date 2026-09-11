import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FaSearch, FaUpload, FaMagic, FaCheck, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL || 'https://master-liqours.onrender.com';

export default function ImageTool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState('');
  const [bottleSize, setBottleSize] = useState(75);
  const [bottleY, setBottleY] = useState(50);
  const [removeBgKey, setRemoveBgKey] = useState(() => localStorage.getItem('removebg_key') || '');
  const [description, setDescription] = useState('');
  const [genDesc, setGenDesc] = useState(false);
  const [backdropImg, setBackdropImg] = useState(null);        // loaded Image element
  const [backdropName, setBackdropName] = useState(() => localStorage.getItem('backdrop_name') || 'Dark Gradient');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [loadingBackdrop, setLoadingBackdrop] = useState(false);
  const backdropFileRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const currentImgRef = useRef(null);

  // Preset backdrops — public CDN images that work cross-origin
  const PRESETS = [
    { name: 'Dark Gradient', url: null },
    { name: 'Dark Shelf', url: 'https://picsum.photos/seed/shelf/800/800' },
    { name: 'Bar Counter', url: 'https://picsum.photos/seed/bar/800/800' },
    { name: 'Marble', url: 'https://picsum.photos/seed/marble/800/800' },
    { name: 'Night Lights', url: 'https://picsum.photos/seed/night/800/800' },
    { name: 'Wood Table', url: 'https://picsum.photos/seed/wood/800/800' },
  ];

  useEffect(() => { loadProducts(); }, []);

  // Restore saved custom backdrop on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('backdrop_url');
    const savedName = localStorage.getItem('backdrop_name') || 'Dark Gradient';
    if (savedUrl) loadBackdrop(savedUrl, savedName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentImgRef.current) composite(currentImgRef.current);
  }, [bottleSize, bottleY, backdropImg]);

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
    const match = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'missing') return match && !hasImage(p);
    if (filter === 'has') return match && hasImage(p);
    return match;
  });

  const composite = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const S = 800;
    canvas.width = S; canvas.height = S;

    // === BACKDROP ===
    if (backdropImg) {
      // Draw photo backdrop — cover the full canvas
      const bw = backdropImg.naturalWidth || backdropImg.width;
      const bh = backdropImg.naturalHeight || backdropImg.height;
      const scale = Math.max(S / bw, S / bh);
      const dw = bw * scale, dh = bh * scale;
      const dx = (S - dw) / 2, dy = (S - dh) / 2;
      ctx.drawImage(backdropImg, dx, dy, dw, dh);

      // Dark overlay so bottle pops — semi-transparent
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, S, S);

      // Subtle pink glow still
      const glow = ctx.createRadialGradient(S/2, S*0.7, 0, S/2, S*0.6, S*0.45);
      glow.addColorStop(0, 'rgba(255,0,127,0.12)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, S, S);
    } else {
      // Generated gradient backdrop (original)
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, S, S);

      const glow = ctx.createRadialGradient(S/2, S*0.7, 0, S/2, S*0.6, S*0.55);
      glow.addColorStop(0, 'rgba(255,0,127,0.18)');
      glow.addColorStop(0.6, 'rgba(120,0,60,0.07)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, S, S);

      // Shelf lines
      ctx.strokeStyle = 'rgba(255,0,127,0.055)'; ctx.lineWidth = 1;
      for (let y = S*0.28; y < S; y += S*0.12) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
      }

      // M watermark
      ctx.save();
      ctx.font = `bold ${S*0.52}px serif`;
      ctx.fillStyle = 'rgba(255,0,127,0.03)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('M', S/2, S*0.52); ctx.restore();
    }

    // Bottle sizing
    const maxH = S * (bottleSize / 100);
    const maxW = S * 0.72;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const bW = img.naturalWidth * scale;
    const bH = img.naturalHeight * scale;
    const bX = (S - bW) / 2;
    const bY = S * (bottleY / 100) - bH / 2;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(255,0,127,0.3)';
    ctx.shadowBlur = 55; ctx.shadowOffsetY = 14;
    ctx.drawImage(img, bX, bY, bW, bH);
    ctx.restore();

    // Reflection
    const reflH = bH * 0.25;
    const reflY = bY + bH;
    ctx.save();
    ctx.transform(1, 0, 0, -1, 0, reflY * 2 + reflH);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(img, bX, bY, bW, bH);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, reflY, 0, reflY + reflH);
    fade.addColorStop(0, 'rgba(5,5,5,0.6)');
    fade.addColorStop(1, 'rgba(5,5,5,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(bX - 4, reflY, bW + 8, reflH);

    // Export preview
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return url; });
    }, 'image/jpeg', 0.92);
  }, [bottleSize, bottleY]);

  const loadBackdrop = useCallback(async (url, name) => {
    if (!url) {
      setBackdropImg(null);
      setBackdropName('Dark Gradient');
      localStorage.setItem('backdrop_name', 'Dark Gradient');
      localStorage.removeItem('backdrop_url');
      if (currentImgRef.current) composite(currentImgRef.current);
      return;
    }
    setLoadingBackdrop(true);
    try {
      // Fetch through backend proxy to bypass browser CORS restrictions
      let objectUrl;
      if (url.startsWith('blob:')) {
        // Already a local blob (file upload) — use directly
        objectUrl = url;
      } else {
        const proxyUrl = `${API}/api/admin/proxy-image?url=${encodeURIComponent(url)}&maintenance_key=warehouse2026fix`;
        const resp = await fetch(proxyUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
      }
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = objectUrl;
      });
      setBackdropImg(img);
      setBackdropName(name || 'Custom');
      localStorage.setItem('backdrop_name', name || 'Custom');
      if (!url.startsWith('blob:')) localStorage.setItem('backdrop_url', url);
    } catch (e) {
      setStatus(`Could not load backdrop: ${e.message} — try uploading a file instead`);
    }
    setLoadingBackdrop(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAndComposite = async (source) => {
    setProcessing(true);
    setStatus('Processing...');
    try {
      let input = source;

      if (removeBgKey) {
        setStatus('Removing background...');
        const form = new FormData();
        form.append('size', 'auto');
        if (source instanceof Blob) form.append('image_file', source, 'img.png');
        else form.append('image_url', source);
        const r = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': removeBgKey },
          body: form,
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e?.errors?.[0]?.title || `remove.bg error ${r.status}`);
        }
        input = await r.blob();
      }

      setStatus('Compositing...');
      const objUrl = input instanceof Blob ? URL.createObjectURL(input) : input;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = objUrl; });
      currentImgRef.current = img;
      composite(img);
      setStatus('Done! Adjust size/position then save.');
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
    setProcessing(false);
  };

  const saveToProduct = async () => {
    if (!selected || !canvasRef.current || !previewUrl) return;
    setUploading(true); setStatus('Uploading...');
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/jpeg', 0.92));
      const form = new FormData();
      form.append('file', blob, `product-${selected.product_id}.jpg`);
      const up = await axios.post(`${API}/api/admin/upload`, form,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = up.data.url;
      await axios.patch(`${API}/api/admin/products/${selected.product_id}`,
        { name: selected.name, price: selected.price, category: selected.category || 'Whiskey',
          image_url: imageUrl, is_active: true },
        { withCredentials: true });
      setProducts(prev => prev.map(p => p.product_id === selected.product_id ? { ...p, image_url: imageUrl } : p));
      setSelected(s => ({ ...s, image_url: imageUrl }));
      setStatus('✅ Saved! Pick the next product.');
      currentImgRef.current = null; setPreviewUrl(null);
    } catch (e) { setStatus(`Failed: ${e.response?.data?.detail || e.message}`); }
    setUploading(false);
  };

  const generateDescription = async () => {
    if (!selected) return;
    setGenDesc(true);
    try {
      const resp = await fetch(
        `${API}/api/admin/generate-description?maintenance_key=warehouse2026fix&product_name=${encodeURIComponent(selected.name)}&category=${encodeURIComponent(selected.category || 'Spirits')}`,
        { method: 'POST' }
      );
      const data = await resp.json();
      if (data.description) setDescription(data.description);
    } catch {}
    setGenDesc(false);
  };

  const saveDescription = async () => {
    if (!selected || !description.trim()) return;
    try {
      await axios.patch(`${API}/api/admin/products/${selected.product_id}`,
        { name: selected.name, price: selected.price, category: selected.category || 'Whiskey', description: description.trim(), is_active: true },
        { withCredentials: true });
      setStatus(prev => prev.startsWith('✅') ? '✅ Image + description saved!' : '✅ Description saved!');
    } catch {}
  };

  if (!user || !['master_admin', 'super_admin'].includes(user.role))
    return <div className="min-h-screen flex items-center justify-center text-white/50">Admin only</div>;

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors p-1">
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="font-display text-2xl neon-pink-text leading-none">IMAGE TOOL</h1>
          <p className="text-[10px] text-white/30">{products.length} products · <span className="text-[#ff007f]">{missingCount} missing images</span></p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="password" placeholder="remove.bg key (optional — auto BG removal)"
            value={removeBgKey}
            onChange={e => { setRemoveBgKey(e.target.value); localStorage.setItem('removebg_key', e.target.value); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff007f] w-64" />
          <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer" className="text-xs text-[#ff007f] hover:underline whitespace-nowrap">Get free key →</a>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT — product list */}
        <div className="w-64 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={11} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full bg-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#ff007f]" />
            </div>
            <div className="flex gap-1">
              {[['all','All'], ['missing','Missing'], ['has','Has img']].map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-[#ff007f] text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex items-center justify-center h-32 text-white/20 text-xs">Loading...</div>
              : filtered.map(p => (
              <button key={p.product_id}
                onClick={() => { setSelected(p); setPreviewUrl(null); setStatus(''); setSourceUrl(''); setDescription(''); currentImgRef.current = null; }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 border-b border-white/5 text-left hover:bg-white/5 transition-all ${selected?.product_id === p.product_id ? 'bg-white/8 border-l-2 !border-l-[#ff007f]' : ''}`}>
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {hasImage(p) ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white/15 text-[8px]">?</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-white/30 truncate">{p.category}</div>
                  <div className="text-[11px] font-semibold truncate leading-tight">{p.name}</div>
                </div>
                {hasImage(p) && <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] flex-shrink-0" />}
              </button>
            ))}
            {!loading && filtered.length === 0 && <div className="text-center py-10 text-white/20 text-xs">No products</div>}
          </div>
        </div>

        {/* RIGHT — editor */}
        <div className="flex-1 p-6 overflow-auto">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-white/20">
              <div className="text-center">
                <FaMagic size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a product from the list</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto grid md:grid-cols-[300px_1fr] gap-8">
              {/* Preview + sliders */}
              <div className="space-y-4">
                <canvas ref={canvasRef} className="hidden" />
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  {previewUrl
                    ? <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                    : selected.image_url
                    ? <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">No image yet</div>}
                </div>

                {/* Sliders — only show when image is loaded */}
                {currentImgRef.current && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-5">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Adjust bottle</p>
                    <div>
                      <div className="flex justify-between text-xs text-white/50 mb-2">
                        <span>Size</span>
                        <span className="text-[#ff007f] font-bold tabular-nums">{bottleSize}%</span>
                      </div>
                      <input type="range" min={25} max={95} value={bottleSize}
                        onChange={e => setBottleSize(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-[#ff007f] cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-white/20 mt-1">
                        <span>Small</span><span>Large</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-white/50 mb-2">
                        <span>Vertical position</span>
                        <span className="text-[#ff007f] font-bold tabular-nums">{bottleY}%</span>
                      </div>
                      <input type="range" min={15} max={85} value={bottleY}
                        onChange={e => setBottleY(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-[#ff007f] cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-white/20 mt-1">
                        <span>Higher</span><span>Lower</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/25">Preview updates live as you drag</p>
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

                {/* === BACKDROP PICKER === */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-bold">Backdrop</label>
                    <span className="text-xs text-[#ff007f] font-bold">{backdropName}</span>
                  </div>

                  {/* Preset grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map(p => (
                      <button key={p.name} onClick={() => loadBackdrop(p.url, p.name)}
                        title={p.name}
                        className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${backdropName === p.name ? 'border-[#ff007f] shadow-[0_0_12px_rgba(255,0,127,0.4)]' : 'border-white/10 hover:border-white/30'}`}>
                        {p.url
                          ? <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full" style={{ background: 'radial-gradient(circle at 50% 70%, rgba(255,0,127,0.3) 0%, #050505 70%)' }} />
                        }
                        <div className="absolute inset-0 flex items-end justify-center pb-1">
                          <span className="text-[8px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full">{p.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom backdrop — upload */}
                  <button onClick={() => backdropFileRef.current?.click()}
                    disabled={loadingBackdrop}
                    className="w-full py-2 border border-dashed border-white/15 rounded-xl text-xs text-white/40 hover:border-[#ff007f] hover:text-[#ff007f] transition-all flex items-center justify-center gap-2">
                    <FaUpload size={10} /> {loadingBackdrop ? 'Loading...' : 'Upload your own backdrop photo'}
                  </button>
                  <input ref={backdropFileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      loadBackdrop(url, 'Custom Upload');
                    }} />

                  {/* Custom backdrop — URL */}
                  <div className="flex gap-2">
                    <input type="text" value={backdropUrl} onChange={e => setBackdropUrl(e.target.value)}
                      placeholder="Or paste backdrop image URL..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff007f]" />
                    <button onClick={() => backdropUrl && loadBackdrop(backdropUrl, 'Custom URL')}
                      disabled={!backdropUrl || loadingBackdrop}
                      className="px-3 py-2 bg-white/10 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-white/20 transition-all">
                      Use
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/5" />

                {/* Google search */}
                <a href={`https://www.google.com/search?q=${encodeURIComponent(selected.name + ' bottle PNG transparent')}&tbm=isch`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/70 hover:bg-white/10 transition-all group">
                  <FaSearch size={13} className="group-hover:text-[#ff007f] transition-colors" />
                  <span>Search Google Images for <strong className="text-white">{selected.name}</strong></span>
                </a>

                {/* Paste URL */}
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-bold block">Paste image URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !processing && sourceUrl && loadAndComposite(sourceUrl.trim())}
                      placeholder="https://example.com/bottle.png"
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff007f]" />
                    <button onClick={() => loadAndComposite(sourceUrl.trim())} disabled={processing || !sourceUrl}
                      className="px-5 py-2.5 bg-[#ff007f] rounded-2xl font-bold text-sm disabled:opacity-40 hover:brightness-110 transition-all">
                      {processing ? <FaSpinner className="animate-spin" /> : 'Go'}
                    </button>
                  </div>
                </div>

                {/* File upload */}
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-bold block">Upload from computer</label>
                  <button onClick={() => fileRef.current?.click()} disabled={processing}
                    className="w-full py-4 border-2 border-dashed border-white/15 rounded-2xl text-sm text-white/40 hover:border-[#ff007f] hover:text-[#ff007f] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                    <FaUpload size={13} /> Choose file (PNG, JPG, WEBP)
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) loadAndComposite(f); }} className="hidden" />
                </div>

                {/* Status */}
                {status && (
                  <div className={`px-4 py-3 rounded-2xl text-sm border ${
                    status.startsWith('✅') ? 'bg-[#39ff14]/10 border-[#39ff14]/30 text-[#39ff14]' :
                    status.startsWith('Error') || status.startsWith('Failed') ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    'bg-white/5 border-white/10 text-white/60'}`}>
                    {status}
                  </div>
                )}

                {/* Save */}
                {previewUrl && (
                  <button onClick={saveToProduct} disabled={uploading}
                    className="w-full py-4 bg-gradient-to-r from-[#ff007f] to-[#c8005a] rounded-2xl font-bold hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-base">
                    {uploading ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaCheck /> Save to product</>}
                  </button>
                )}

                {/* AI Description Generator */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold">AI Description</p>
                    <button onClick={generateDescription} disabled={genDesc || !selected}
                      className="px-3 py-1.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-xl text-xs font-bold text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all disabled:opacity-40 flex items-center gap-1.5">
                      {genDesc ? '✨ Writing...' : '✨ Generate'}
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="AI will write a description here, or type your own..."
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f0ff] resize-none"
                  />
                  {description.trim() && (
                    <button onClick={saveDescription}
                      className="w-full py-2 bg-[#00f0ff]/15 border border-[#00f0ff]/30 rounded-xl text-sm font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 transition-all">
                      Save description to product
                    </button>
                  )}
                </div>

                <div className="text-xs text-white/20 leading-relaxed border border-white/5 rounded-xl p-3">
                  <p className="font-bold text-white/30 mb-1">Tips:</p>
                  <p>• Use PNG with transparent background for cleanest result</p>
                  <p>• With remove.bg key: any image works, background auto-removed</p>
                  <p>• After uploading, use sliders to resize and reposition the bottle</p>
                  <p>• Press <kbd className="bg-white/10 px-1 rounded text-[10px]">Enter</kbd> on the URL field to process quickly</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
