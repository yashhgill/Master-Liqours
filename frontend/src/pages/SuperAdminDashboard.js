import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaPlus, FaTrash, FaBolt, FaImage, FaBoxOpen, FaWineGlassAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: 'banners', label: 'Hero Banners', icon: FaImage },
  { id: 'products', label: 'Products', icon: FaBoxOpen },
  { id: 'flash-sales', label: 'Flash Sales', icon: FaBolt },
  { id: 'brands', label: 'Brands', icon: FaWineGlassAlt },
];

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showBanner, setShowBanner] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);

  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', cta_text: '', cta_link: '', background_image: '', is_active: true, order_position: 0 });
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', category: '', image_url: '', is_active: true });
  const [flashForm, setFlashForm] = useState({ product_id: '', discount_percentage: 0, start_time: '', end_time: '' });
  const blankBrand = { name: '', short_name: '', subtitle: '', logo_url: '', color_hex: '#1a1a1a', search_term: '', is_active: true, order_position: 0 };
  const [brandForm, setBrandForm] = useState(blankBrand);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    try {
      if (tab === 'banners') {
        const r = await axios.get(`${API}/admin/hero-banners`, { withCredentials: true });
        setBanners(r.data);
      } else if (tab === 'products') {
        const r = await axios.get(`${API}/products`);
        setProducts(r.data);
      } else if (tab === 'flash-sales') {
        const r = await axios.get(`${API}/admin/flash-sales?include_expired=true`, { withCredentials: true });
        setFlashSales(r.data);
      } else if (tab === 'brands') {
        const r = await axios.get(`${API}/admin/brands`, { withCredentials: true });
        setBrands(r.data);
      }
    } catch (e) { console.error(e); }
  };

  const createBanner = async () => {
    try {
      await axios.post(`${API}/admin/hero-banners`, bannerForm, { withCredentials: true });
      setShowBanner(false); load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const createProduct = async () => {
    try {
      await axios.post(`${API}/admin/products`, productForm, { withCredentials: true });
      setShowProduct(false); load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const createFlash = async () => {
    try {
      // Convert datetime-local (browser local time, naive) → ISO with user's timezone offset
      const toIsoWithTZ = (localStr) => {
        if (!localStr) return null;
        const d = new Date(localStr); // browser parses as local time
        return d.toISOString(); // serialize as UTC ISO with Z
      };
      const payload = {
        ...flashForm,
        start_time: toIsoWithTZ(flashForm.start_time),
        end_time: toIsoWithTZ(flashForm.end_time),
      };
      if (!payload.start_time || !payload.end_time) {
        alert('Pick both start and end time lah boss');
        return;
      }
      await axios.post(`${API}/admin/flash-sales`, payload, { withCredentials: true });
      setShowFlash(false);
      setFlashForm({ product_id: '', discount_percentage: 0, start_time: '', end_time: '' });
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const delBanner = async (id) => {
    if (!window.confirm('Delete banner?')) return;
    await axios.delete(`${API}/admin/hero-banners/${id}`, { withCredentials: true });
    load();
  };

  // Brand CRUD
  const saveBrand = async () => {
    try {
      if (editingBrand) {
        await axios.put(`${API}/admin/brands/${editingBrand}`, brandForm, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/brands`, brandForm, { withCredentials: true });
      }
      setShowBrand(false);
      setEditingBrand(null);
      setBrandForm(blankBrand);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const editBrand = (b) => {
    setEditingBrand(b.brand_id);
    setBrandForm({
      name: b.name || '', short_name: b.short_name || '', subtitle: b.subtitle || '',
      logo_url: b.logo_url || '', color_hex: b.color_hex || '#1a1a1a',
      search_term: b.search_term || '', is_active: !!b.is_active, order_position: b.order_position || 0,
    });
    setShowBrand(true);
  };
  const delBrand = async (id) => {
    if (!window.confirm('Delete brand?')) return;
    await axios.delete(`${API}/admin/brands/${id}`, { withCredentials: true });
    load();
  };
  const moveBrand = async (b, delta) => {
    await axios.put(`${API}/admin/brands/${b.brand_id}`, {
      name: b.name, short_name: b.short_name, subtitle: b.subtitle, logo_url: b.logo_url,
      color_hex: b.color_hex, search_term: b.search_term, is_active: b.is_active,
      order_position: (b.order_position || 0) + delta,
    }, { withCredentials: true });
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Super Admin Console</div>
      <h1 className="display-xl mb-2">Manage <span className="neon-pink-text">Everything</span></h1>
      <p className="text-white/60 mb-10">Welcome {user?.name}, control banners, products & flash sales here lah.</p>

      <div className="flex flex-wrap gap-2 mb-10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
              tab === t.id ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'
            }`}
            data-testid={`admin-tab-${t.id}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'banners' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6">
            <h2 className="display-md">Hero Banners</h2>
            <button onClick={() => setShowBanner(!showBanner)} className="btn-pink" data-testid="admin-add-banner-btn"><FaPlus /> Add</button>
          </div>
          {showBanner && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
              {['title', 'subtitle', 'cta_text', 'cta_link', 'background_image'].map((f) => (
                <input key={f} placeholder={f.replace('_', ' ')} value={bannerForm[f]} onChange={(e) => setBannerForm({ ...bannerForm, [f]: e.target.value })} className="input-dark" />
              ))}
              <button onClick={createBanner} className="btn-lime">Create</button>
            </div>
          )}
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.banner_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between items-start">
                <div>
                  <h3 className="font-display text-xl uppercase">{b.title}</h3>
                  <p className="text-sm text-white/60">{b.subtitle}</p>
                  <span className={`text-xs uppercase font-bold ${b.is_active ? 'text-[#39ff14]' : 'text-white/30'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <button onClick={() => delBanner(b.banner_id)} className="text-[#ff007f] hover:scale-110 transition-transform"><FaTrash /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6">
            <h2 className="display-md">Products</h2>
            <button onClick={() => setShowProduct(!showProduct)} className="btn-pink"><FaPlus /> Add</button>
          </div>
          {showProduct && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-6 grid grid-cols-2 gap-3">
              <input placeholder="Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="input-dark" />
              <input type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} className="input-dark" />
              <input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="input-dark" />
              <input placeholder="Image URL" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} className="input-dark" />
              <textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="input-dark col-span-2" rows={3} />
              <button onClick={createProduct} className="btn-lime col-span-2">Create Product</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.product_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                {p.image_url && <img src={p.image_url} alt="" className="w-16 h-16 rounded-xl object-cover bg-white" />}
                <div className="flex-1">
                  <h3 className="font-display text-lg uppercase">{p.name}</h3>
                  <div className="text-xs text-white/50">{p.category}</div>
                </div>
                <div className="font-display text-xl neon-pink-text">RM{p.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'flash-sales' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6">
            <h2 className="display-md">Flash Sales</h2>
            <button onClick={() => setShowFlash(!showFlash)} className="btn-pink"><FaBolt /> Create</button>
          </div>
          {showFlash && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
              <select value={flashForm.product_id} onChange={(e) => setFlashForm({ ...flashForm, product_id: e.target.value })} className="input-dark" data-testid="flash-product-select">
                <option value="">Select Product</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Discount %" value={flashForm.discount_percentage} onChange={(e) => setFlashForm({ ...flashForm, discount_percentage: parseFloat(e.target.value) })} className="input-dark" data-testid="flash-discount-input" />
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1.5">Start (your local time · {Intl.DateTimeFormat().resolvedOptions().timeZone})</label>
                <input type="datetime-local" value={flashForm.start_time} onChange={(e) => setFlashForm({ ...flashForm, start_time: e.target.value })} className="input-dark" data-testid="flash-start-input" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1.5">End (your local time · {Intl.DateTimeFormat().resolvedOptions().timeZone})</label>
                <input type="datetime-local" value={flashForm.end_time} onChange={(e) => setFlashForm({ ...flashForm, end_time: e.target.value })} className="input-dark" data-testid="flash-end-input" />
              </div>
              {flashForm.start_time && flashForm.end_time && (
                <div className="text-xs text-white/50 bg-white/5 rounded-xl px-3 py-2">
                  Will run from <span className="text-[#39ff14] font-bold">{new Date(flashForm.start_time).toLocaleString()}</span> to <span className="text-[#ff007f] font-bold">{new Date(flashForm.end_time).toLocaleString()}</span> (stored in UTC).
                </div>
              )}
              <button onClick={createFlash} className="btn-lime" data-testid="flash-create-btn">Create Sale</button>
            </div>
          )}
          <div className="space-y-3">
            {flashSales.map((s) => (
              <div key={s.sale_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4">
                <div className="flex justify-between">
                  <div className="text-sm text-white/60">{s.product_id?.slice(0, 8)}</div>
                  <div className="font-display text-xl neon-pink-text">{s.discount_percentage}% OFF</div>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {new Date(s.start_time).toLocaleString()} → {new Date(s.end_time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'brands' && (
        <div className="surface p-6" data-testid="admin-brands-panel">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <h2 className="display-md">Brands ({brands.length})</h2>
            <button
              onClick={() => { setEditingBrand(null); setBrandForm(blankBrand); setShowBrand(!showBrand); }}
              className="btn-pink"
              data-testid="admin-add-brand-btn"
            >
              <FaPlus /> Add Brand
            </button>
          </div>

          {showBrand && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="admin-brand-form">
              <input placeholder="Name (e.g. Johnnie Walker)" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} className="input-dark" data-testid="brand-form-name" />
              <input placeholder="Short Name (e.g. Walker)" value={brandForm.short_name} onChange={(e) => setBrandForm({ ...brandForm, short_name: e.target.value })} className="input-dark" />
              <input placeholder="Subtitle (e.g. Striding Man)" value={brandForm.subtitle} onChange={(e) => setBrandForm({ ...brandForm, subtitle: e.target.value })} className="input-dark md:col-span-2" />
              <input placeholder="Logo URL (PNG/SVG)" value={brandForm.logo_url} onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })} className="input-dark md:col-span-2" />
              <div className="flex gap-3 items-center">
                <input type="color" value={brandForm.color_hex} onChange={(e) => setBrandForm({ ...brandForm, color_hex: e.target.value })} className="w-14 h-14 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
                <input placeholder="#hex" value={brandForm.color_hex} onChange={(e) => setBrandForm({ ...brandForm, color_hex: e.target.value })} className="input-dark flex-1" />
              </div>
              <input placeholder="Search Term (default = name)" value={brandForm.search_term} onChange={(e) => setBrandForm({ ...brandForm, search_term: e.target.value })} className="input-dark" />
              <input type="number" placeholder="Order Position" value={brandForm.order_position} onChange={(e) => setBrandForm({ ...brandForm, order_position: parseInt(e.target.value || '0') })} className="input-dark" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={brandForm.is_active} onChange={(e) => setBrandForm({ ...brandForm, is_active: e.target.checked })} />
                <span>Active (shown on home)</span>
              </label>

              {/* Live Preview */}
              <div className="md:col-span-2 mt-2">
                <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Live Preview</div>
                <div className="w-[220px] aspect-[4/5] rounded-3xl overflow-hidden relative">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandForm.color_hex} 0%, ${brandForm.color_hex}cc 60%, ${brandForm.color_hex}88 100%)` }} />
                  {brandForm.logo_url && (
                    <img src={brandForm.logo_url} alt="" className="absolute inset-0 w-full h-full object-contain p-8 opacity-90" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="relative h-full flex flex-col justify-between p-6">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">{brandForm.subtitle || 'Subtitle'}</div>
                    {!brandForm.logo_url && (
                      <div className="font-display text-4xl leading-[0.85] uppercase text-white">{brandForm.short_name || brandForm.name || 'Brand'}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button onClick={saveBrand} className="btn-lime" data-testid="brand-form-save">{editingBrand ? 'Update' : 'Create'}</button>
                <button onClick={() => { setShowBrand(false); setEditingBrand(null); setBrandForm(blankBrand); }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brands.map((b) => (
              <div key={b.brand_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4" data-testid={`admin-brand-${b.brand_id}`}>
                <div className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden" style={{ background: b.color_hex }}>
                  {b.logo_url && <img src={b.logo_url} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5" onError={(e) => { e.target.style.display = 'none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg uppercase truncate">{b.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 truncate">{b.subtitle || '—'} · pos {b.order_position}</div>
                  <div className={`text-[10px] uppercase font-bold ${b.is_active ? 'text-[#39ff14]' : 'text-white/30'}`}>{b.is_active ? 'Active' : 'Hidden'}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => moveBrand(b, -1)} className="w-8 h-8 rounded-full border border-white/10 hover:border-[#39ff14] flex items-center justify-center" title="Move up"><FaArrowUp size={10} /></button>
                  <button onClick={() => moveBrand(b, 1)} className="w-8 h-8 rounded-full border border-white/10 hover:border-[#39ff14] flex items-center justify-center" title="Move down"><FaArrowDown size={10} /></button>
                </div>
                <button onClick={() => editBrand(b)} className="text-[#00f0ff] hover:scale-110 transition-transform text-sm font-bold uppercase tracking-wider" data-testid={`admin-brand-edit-${b.brand_id}`}>Edit</button>
                <button onClick={() => delBrand(b.brand_id)} className="text-[#ff007f] hover:scale-110 transition-transform" data-testid={`admin-brand-del-${b.brand_id}`}><FaTrash /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
