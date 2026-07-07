import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import {
  FaPlus, FaTrash, FaBolt, FaImage, FaBoxOpen, FaWineGlass,
  FaArrowUp, FaArrowDown, FaPen, FaFileCsv, FaDownload, FaSpinner,
  FaUsers, FaKey, FaCopy, FaWhatsapp, FaChartLine, FaTrophy, FaRandom, FaClock, FaToggleOff, FaTruck,
  FaRobot, FaPaperPlane, FaTimes as FaXIcon, FaTag,
} from 'react-icons/fa';
import ImageUploader from '../components/ImageUploader';
import { resolveImageUrl } from '../lib/imageUrl';
import OverviewTab from './admin/OverviewTab';
import StaffPerfTab from './admin/StaffPerfTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: 'overview', label: 'Overview', icon: FaChartLine },
  { id: 'banners', label: 'Hero Banners', icon: FaImage },
  { id: 'products', label: 'Products', icon: FaBoxOpen },
  { id: 'flash-sales', label: 'Flash Sales', icon: FaBolt },
  { id: 'brands', label: 'Brands', icon: FaWineGlass },
  { id: 'staff', label: 'Staff', icon: FaUsers },
  { id: 'staff-perf', label: 'Staff Performance', icon: FaTrophy },
  { id: 'mystery-drop', label: 'Mystery Drop', icon: FaWineGlass },
  { id: 'suppliers', label: 'Suppliers', icon: FaTruck },
  { id: 'discount-codes', label: 'Promo Codes', icon: FaTag },
  { id: 'staff-mode', label: 'My Sales', icon: FaBoxOpen },
];

const CATEGORIES = ['Whiskey', 'Vodka', 'Gin', 'Rum', 'Cognac', 'Brandy', 'Tequila', 'Liqueur', 'Wine', 'Champagne', 'Beer', 'Sake'];

const blankProduct = { name: '', price: '', description: '', category: '', image_url: '', is_active: true, is_preorder: false, discount_price: '', discount_days: 0, discount_hours: 0, discount_minutes: 0 };
const blankBanner = { title: '', subtitle: '', cta_text: '', cta_link: '', background_image: '', is_active: true, order_position: 0 };
const blankBrand = { name: '', short_name: '', subtitle: '', logo_url: '', color_hex: '#1a1a1a', search_term: '', is_active: true, order_position: 0 };
const blankFlash = { product_id: '', discount_percentage: 10, start_time: '', end_time: '' };
const blankStaff = { name: '', email: '', whatsapp_number: '', referral_code: '', warehouse_name: '' };

// ── Supplier Tab ────────────────────────────────────────────────────
const SupplierTab = ({ API, active }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [addingProduct, setAddingProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productForm, setProductForm] = useState({ product_id: '', cost_price: '', selling_price: '', stock_qty: 0 });

  const selectedSupplier = suppliers.find(s => s.supplier_id === expanded) || null;

  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const sr = await axios.get(`${API}/admin/suppliers`, { withCredentials: true });
      setSuppliers(sr.data || []);
    } catch (e) {
      setLoadError(e.response?.data?.detail || e.message || 'Cannot load suppliers');
    } finally { setLoading(false); }
  };

  const loadProducts = async () => {
    if (allProducts.length > 0) return;
    try {
      const r = await axios.get(`${API}/products`);
      setAllProducts(r.data || []);
    } catch(e) {}
  };

  useEffect(() => { if (active) load(); }, [active]);

  const save = async () => {
    if (!form.name.trim()) { alert('Supplier name required'); return; }
    setSaving(true);
    try {
      if (editId) await axios.put(`${API}/admin/suppliers/${editId}`, form, { withCredentials: true });
      else await axios.post(`${API}/admin/suppliers`, form, { withCredentials: true });
      setShowForm(false); setEditId(null); setForm({ name: '', contact: '', notes: '' });
      await load();
    } catch (e) { alert(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`${API}/admin/suppliers/${id}`, { withCredentials: true });
      if (expanded === id) setExpanded(null);
      await load();
    } catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
  };

  const addProduct = async (supplierId) => {
    if (!productForm.product_id) { alert('Select a product first'); return; }
    if (!productForm.cost_price || !productForm.selling_price) { alert('Enter cost and selling price'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/suppliers/${supplierId}/products`, {
        product_id: productForm.product_id,
        cost_price: parseFloat(productForm.cost_price),
        selling_price: parseFloat(productForm.selling_price),
        stock_qty: parseInt(productForm.stock_qty) || 0,
      }, { withCredentials: true });
      setAddingProduct(null);
      setProductForm({ product_id: '', cost_price: '', selling_price: '', stock_qty: 0 });
      setProductSearch('');
      await load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to add product'); }
    finally { setSaving(false); }
  };

  const delProduct = async (supplierId, spId) => {
    if (!window.confirm('Remove this product from supplier?')) return;
    try {
      await axios.delete(`${API}/admin/suppliers/${supplierId}/products/${spId}`, { withCredentials: true });
      await load();
    } catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
  };

  const filteredProducts = allProducts.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
    !selectedSupplier?.products?.find(sp => sp.product_id === p.product_id)
  );

  if (loading) return <div className="text-center py-20 text-white/40">Loading suppliers...</div>;

  if (loadError) return (
    <div className="flex flex-col items-center py-20 gap-4 text-center">
      <div className="text-[#ff007f] font-bold text-lg">{loadError}</div>
      <div className="text-white/40 text-sm max-w-xs">
        The backend may be waking up from sleep. This usually takes 10–30 seconds.
      </div>
      <button onClick={load} className="btn-lime px-8">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{minHeight:'60vh'}}>
      {/* LEFT: supplier list */}
      <div className="lg:w-64 xl:w-72 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:'0.05em'}}>Suppliers</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2}}>Boss-only · {suppliers.length} total</div>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setExpanded(null); setForm({name:'',contact:'',notes:''}); }}
            style={{width:36,height:36,borderRadius:'50%',background:'#ff007f',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',color:'#fff',flexShrink:0}}>
            <FaPlus size={13} />
          </button>
        </div>
        {suppliers.length === 0 ? (
          <div style={{padding:'20px 16px',color:'rgba(255,255,255,0.25)',fontSize:13,textAlign:'center'}}>No suppliers yet</div>
        ) : suppliers.map(s => (
          <button key={s.supplier_id}
            onClick={() => { setExpanded(expanded === s.supplier_id ? null : s.supplier_id); setShowForm(false); setAddingProduct(null); }}
            style={{width:'100%',textAlign:'left',padding:'12px 16px',background:expanded===s.supplier_id?'rgba(255,0,127,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${expanded===s.supplier_id?'rgba(255,0,127,0.4)':'rgba(255,255,255,0.06)'}`,borderRadius:12,marginBottom:6,cursor:'pointer',transition:'all 0.2s'}}>
            <div style={{fontWeight:700,fontSize:14,color:expanded===s.supplier_id?'#fff':'rgba(255,255,255,0.8)'}}>{s.name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>{s.products?.length||0} products · RM{(s.products?.reduce((sum,p)=>sum+(p.selling_price*p.stock_qty),0)||0).toFixed(0)} stock value</div>
          </button>
        ))}
      </div>

      {/* RIGHT: detail panel */}
      <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
        {showForm ? (
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,marginBottom:16}}>{editId?'Edit Supplier':'New Supplier'}</div>
            <div className="grid gap-3 mb-4">
              <input className="input-dark" placeholder="Supplier name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              <input className="input-dark" placeholder="Contact (phone / email)" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} />
              <textarea className="input-dark" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-pink disabled:opacity-50">{saving?'Saving...':(editId?'Update':'Add Supplier')}</button>
              <button onClick={()=>{setShowForm(false);setEditId(null);}} className="btn-ghost">Cancel</button>
            </div>
          </div>
        ) : !selectedSupplier ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30" style={{minHeight:300}}>
            <FaTruck size={48} style={{marginBottom:16,opacity:0.2}} />
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,marginBottom:8}}>Select a Supplier</div>
            <div style={{fontSize:13}}>Click a supplier on the left to view their products</div>
          </div>
        ) : (
          <div>
            {/* Supplier header */}
            <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:'0.05em'}}>{selectedSupplier.name}</div>
                {selectedSupplier.contact && <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>{selectedSupplier.contact}</div>}
                {selectedSupplier.notes && <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4}}>{selectedSupplier.notes}</div>}
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                <button onClick={()=>{setEditId(selectedSupplier.supplier_id);setForm({name:selectedSupplier.name,contact:selectedSupplier.contact||'',notes:selectedSupplier.notes||''});setShowForm(true);}} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1"><FaPen size={11}/> Edit</button>
                <button onClick={()=>del(selectedSupplier.supplier_id)} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1" style={{borderColor:'rgba(255,0,127,0.4)',color:'#ff007f'}}><FaTrash size={11}/> Delete</button>
                <button onClick={()=>{if(addingProduct===selectedSupplier.supplier_id){setAddingProduct(null);}else{setAddingProduct(selectedSupplier.supplier_id);loadProducts();}}} className="btn-pink text-xs px-4 py-2 flex items-center gap-2"><FaPlus size={11}/>{addingProduct===selectedSupplier.supplier_id?'Cancel':'Add Product'}</button>
              </div>
            </div>

            {/* Add product form */}
            {addingProduct === selectedSupplier.supplier_id && (
              <div className="bg-black/40 border border-[#ff007f]/30 rounded-xl p-4 mb-5">
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'#ff007f',marginBottom:12}}>Link Product from Catalog</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="sm:col-span-2">
                    <input className="input-dark mb-2" placeholder={`Search from ${allProducts.length} products in catalog...`} value={productSearch} onChange={e=>setProductSearch(e.target.value)} />
                    <select className="input-dark" value={productForm.product_id} onChange={e=>setProductForm({...productForm,product_id:e.target.value})}>
                      <option value="">— select product —</option>
                      {filteredProducts.slice(0,200).map(p=>(
                        <option key={p.product_id} value={p.product_id}>{p.name} ({p.category}) — RM{parseFloat(p.price||0).toFixed(2)}</option>
                      ))}
                    </select>
                    {productSearch && filteredProducts.length===0 && <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4}}>No matching products for "{productSearch}"</div>}
                    {!productSearch && allProducts.length===0 && <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4}}>Loading product catalog...</div>}
                  </div>
                  <div>
                    <label style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:4}}>Cost Price (RM)</label>
                    <input type="number" min="0" step="0.01" className="input-dark" placeholder="0.00" value={productForm.cost_price} onChange={e=>setProductForm({...productForm,cost_price:e.target.value})} />
                  </div>
                  <div>
                    <label style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:4}}>Selling Price (RM)</label>
                    <input type="number" min="0" step="0.01" className="input-dark" placeholder="0.00" value={productForm.selling_price} onChange={e=>setProductForm({...productForm,selling_price:e.target.value})} />
                  </div>
                  <div>
                    <label style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:4}}>Stock Qty</label>
                    <input type="number" min="0" className="input-dark" placeholder="0" value={productForm.stock_qty} onChange={e=>setProductForm({...productForm,stock_qty:e.target.value})} />
                  </div>
                  <div className="flex items-end">
                    <button onClick={()=>addProduct(selectedSupplier.supplier_id)} disabled={saving} className="btn-lime disabled:opacity-50 w-full">{saving?'Adding...':'Add to Supplier'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Products table */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',marginBottom:12}}>Products from this supplier ({selectedSupplier.products?.length||0})</div>
            {(!selectedSupplier.products || selectedSupplier.products.length === 0) ? (
              <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.25)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:12,fontSize:13}}>
                No products linked yet. Click "Add Product" to link from your {allProducts.length||'product'} catalog.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                      {['Product','Cat','Cost','Sell','Margin','Qty',''].map(h=>(
                        <th key={h} style={{textAlign:h===''||h==='Cost'||h==='Sell'||h==='Margin'||h==='Qty'?'right':'left',padding:'8px 8px 8px 0',fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)',fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplier.products.map(sp=>(
                      <tr key={sp.sp_id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'10px 8px 10px 0',fontWeight:600,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp.product_name}</td>
                        <td style={{padding:'10px 8px 10px 0',fontSize:11,color:'rgba(255,255,255,0.4)',whiteSpace:'nowrap'}}>{sp.category}</td>
                        <td style={{padding:'10px 8px 10px 0',textAlign:'right',color:'rgba(255,255,255,0.6)',whiteSpace:'nowrap'}}>RM{(sp.cost_price||0).toFixed(2)}</td>
                        <td style={{padding:'10px 8px 10px 0',textAlign:'right',whiteSpace:'nowrap'}}>RM{(sp.selling_price||0).toFixed(2)}</td>
                        <td style={{padding:'10px 8px 10px 0',textAlign:'right'}}>
                          <span style={{fontSize:11,fontWeight:700,color:(sp.margin_pct||0)>20?'#39ff14':(sp.margin_pct||0)>0?'#ffd700':'#ff007f'}}>
                            {(sp.margin_pct||0).toFixed(1)}%
                          </span>
                        </td>
                        <td style={{padding:'10px 8px 10px 0',textAlign:'right',color:'rgba(255,255,255,0.6)'}}>{sp.stock_qty}</td>
                        <td style={{padding:'10px 0',textAlign:'right'}}>
                          <button onClick={()=>delProduct(selectedSupplier.supplier_id,sp.sp_id)} style={{color:'rgba(255,255,255,0.25)',background:'none',border:'none',cursor:'pointer',padding:4}} onMouseEnter={e=>e.currentTarget.style.color='#ff007f'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
                            <FaTrash size={10}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [showAI, setShowAI] = useState(false);

  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [editingFlash, setEditingFlash] = useState(null);
  const [mysteryDrops, setMysteryDrops] = useState([]);
  const [showMysteryForm, setShowMysteryForm] = useState(false);
  const [editingDrop, setEditingDrop] = useState(null);
  const [dropForm, setDropForm] = useState({ product_id: '', discount_pct: 20, label: 'Mystery Drop', is_active: true });
  const [brands, setBrands] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const blankDiscount = { code: '', discount_type: 'percentage', discount_value: 10, min_order_value: 0, max_uses: '', active: true, is_first_order_only: false };
  const [discountForm, setDiscountForm] = useState(blankDiscount);

  // Forms
  const [bannerForm, setBannerForm] = useState(blankBanner);
  const [productForm, setProductForm] = useState(blankProduct);
  const [brandForm, setBrandForm] = useState(blankBrand);
  const [flashForm, setFlashForm] = useState(blankFlash);
  const [staffForm, setStaffForm] = useState(blankStaff);
  const [showStaff, setShowStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffSecret, setStaffSecret] = useState(null); // {email, password}

  // Visibility & edit state
  const [showBanner, setShowBanner] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const csvRef = useRef(null);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    try {
      if (tab === 'banners') {
        const r = await axios.get(`${API}/admin/hero-banners`, { withCredentials: true });
        setBanners(r.data);
      } else if (tab === 'products') {
        const r = await axios.get(`${API}/products`);
        setProducts(r.data);
      } else if (tab === 'mystery-drop') {
        try {
          const [dropsRes, prodsRes] = await Promise.all([
            axios.get(`${API}/admin/mystery-drops`, { withCredentials: true }),
            products.length ? Promise.resolve({data: products}) : axios.get(`${API}/products`, { withCredentials: true }),
          ]);
          setMysteryDrops(dropsRes.data || []);
          if (!products.length) setProducts(prodsRes.data?.products || prodsRes.data || []);
        } catch(e) {}
      } else if (tab === 'flash-sales') {
        const [r, p] = await Promise.all([
          axios.get(`${API}/admin/flash-sales?include_expired=true`, { withCredentials: true }),
          axios.get(`${API}/products`),
        ]);
        setFlashSales(r.data); setProducts(p.data);
      } else if (tab === 'brands') {
        const r = await axios.get(`${API}/admin/brands`, { withCredentials: true });
        setBrands(r.data);
      } else if (tab === 'discount-codes') {
        const r = await axios.get(`${API}/admin/discount-codes`, { withCredentials: true });
        setDiscountCodes(r.data);
      } else if (tab === 'staff') {
        const r = await axios.get(`${API}/admin/staff`, { withCredentials: true });
        setStaff(r.data);
      }
      // 'overview' and 'staff-perf' tabs handle their own fetches (OverviewTab/StaffPerfTab)
    } catch (e) { console.error(e); }
  };

  // === BANNERS ===
  const saveBanner = async () => {
    try {
      if (editingBanner) {
        await axios.patch(`${API}/admin/hero-banners/${editingBanner}`, bannerForm, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/hero-banners`, bannerForm, { withCredentials: true });
      }
      setShowBanner(false); setEditingBanner(null); setBannerForm(blankBanner);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const editBanner = (b) => {
    setEditingBanner(b.banner_id);
    setBannerForm({
      title: b.title || '', subtitle: b.subtitle || '', cta_text: b.cta_text || '',
      cta_link: b.cta_link || '', background_image: b.background_image || '',
      is_active: !!b.is_active, order_position: b.order_position || 0,
    });
    setShowBanner(true);
  };
  const delBanner = async (id) => {
    if (!window.confirm('Delete banner ni?')) return;
    await axios.delete(`${API}/admin/hero-banners/${id}`, { withCredentials: true });
    load();
  };

  // === PRODUCTS ===
  const saveProduct = async () => {
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price) || 0,
        discount_price: productForm.discount_price !== '' && productForm.discount_price != null ? parseFloat(productForm.discount_price) : null,
        discount_days: parseInt(productForm.discount_days) || 0,
        discount_hours: parseInt(productForm.discount_hours) || 0,
        discount_minutes: parseInt(productForm.discount_minutes) || 0,
      };
      if (editingProduct) {
        await axios.patch(`${API}/admin/products/${editingProduct}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/products`, payload, { withCredentials: true });
      }
      setShowProduct(false); setEditingProduct(null); setProductForm(blankProduct);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const editProduct = (p) => {
    setEditingProduct(p.product_id);
    setProductForm({
      name: p.name || '', price: p.original_price || p.price || 0, description: p.description || '',
      category: p.category || '', image_url: p.image_url || '', is_active: !!p.is_active,
      is_preorder: !!p.is_preorder,
      discount_price: p.original_price ? p.price : '',
      discount_days: 0, discount_hours: 0, discount_minutes: 0,
    });
    setShowProduct(true);
  };
  const duplicateProduct = (p) => {
    // Pre-fill form with the source product's data but as a NEW record
    setEditingProduct(null);
    setProductForm({
      name: `${p.name} (Copy)`,
      price: p.original_price || p.price || 0,
      description: p.description || '',
      category: p.category || '',
      image_url: p.image_url || '',
      is_active: !!p.is_active,
      is_preorder: !!p.is_preorder,
      discount_price: '', discount_days: 0, discount_hours: 0, discount_minutes: 0,
    });
    setShowProduct(true);
  };
  const delProduct = async (id) => {
    if (!window.confirm('Delete product? This cannot be undone lah.')) return;
    try {
      await axios.delete(`${API}/admin/products/${id}`, { withCredentials: true });
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Delete failed'); }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.product_id));
    }
  };

  const bulkDeleteProducts = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Delete ${selectedProducts.length} selected product(s)? This cannot be undone lah.`)) return;
    setBulkDeleting(true);
    try {
      await axios.post(`${API}/admin/products/bulk-delete`, { product_ids: selectedProducts }, { withCredentials: true });
      setSelectedProducts([]);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Bulk delete failed'); }
    finally { setBulkDeleting(false); }
  };

  const csvUpload = async (file) => {
    if (!file) return;
    setCsvBusy(true); setCsvResult(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await axios.post(`${API}/admin/products/bulk-import`, fd, {
        withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(res.data);
      load();
    } catch (e) {
      setCsvResult({ error: e.response?.data?.detail || 'Import failed' });
    } finally { setCsvBusy(false); }
  };

  const downloadSampleCsv = () => {
    const csv = 'name,price,category,description,image_url\nChardonnay White Wine,110,Wine,Smooth white wine,\nLager Beer Premium,18,Beer,Local favorite,\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // === BRANDS ===
  const saveBrand = async () => {
    try {
      if (editingBrand) await axios.put(`${API}/admin/brands/${editingBrand}`, brandForm, { withCredentials: true });
      else await axios.post(`${API}/admin/brands`, brandForm, { withCredentials: true });
      setShowBrand(false); setEditingBrand(null); setBrandForm(blankBrand);
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
      ...b, order_position: (b.order_position || 0) + delta,
    }, { withCredentials: true });
    load();
  };

  // === STAFF ===
  const saveStaff = async () => {
    try {
      if (editingStaff) {
        await axios.put(`${API}/admin/staff/${editingStaff}`, {
          name: staffForm.name,
          whatsapp_number: staffForm.whatsapp_number || null,
          referral_code: staffForm.referral_code || null,
          warehouse_name: staffForm.warehouse_name || '',
        }, { withCredentials: true });
      } else {
        const res = await axios.post(`${API}/admin/staff`, staffForm, { withCredentials: true });
        setStaffSecret({ email: res.data.email, password: res.data.temp_password, name: res.data.name, referral: res.data.referral_code });
      }
      setShowStaff(false); setEditingStaff(null); setStaffForm(blankStaff);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const editStaff = (s) => {
    setEditingStaff(s.staff_id);
    setStaffForm({ name: s.name || '', email: s.email || '', whatsapp_number: s.whatsapp_number || '', referral_code: s.referral_code || '', warehouse_name: s.warehouse_name || '' });
    setShowStaff(true);
  };
  const delStaff = async (id) => {
    if (!window.confirm('Delete this staff? Orders will be unassigned.')) return;
    await axios.delete(`${API}/admin/staff/${id}`, { withCredentials: true });
    load();
  };
  const resetStaffPw = async (id) => {
    try {
      const res = await axios.post(`${API}/admin/staff/${id}/reset-password`, {}, { withCredentials: true });
      const s = staff.find((x) => x.staff_id === id);
      setStaffSecret({ email: s?.email, password: res.data.temp_password, name: s?.name, referral: s?.referral_code });
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
  };

  // === FLASH SALES ===
  const deleteFlashSale = async (saleId) => {
    if (!window.confirm('Delete this flash sale?')) return;
    try {
      await axios.delete(`${API}/admin/flash-sales/${saleId}`, { withCredentials: true });
      setFlashSales(fs => fs.filter(s => s.sale_id !== saleId));
    } catch(e) { alert(e.response?.data?.detail || 'Delete failed'); }
  };

  const saveDrop = async () => {
    if (!dropForm.product_id) { alert('Select a product lah'); return; }
    try {
      if (editingDrop) {
        const r = await axios.patch(`${API}/admin/mystery-drops/${editingDrop}`, dropForm, { withCredentials: true });
        setMysteryDrops(ds => ds.map(d => d.drop_id === editingDrop ? r.data : d));
      } else {
        const r = await axios.post(`${API}/admin/mystery-drops`, dropForm, { withCredentials: true });
        // re-fetch to get enriched data
        const all = await axios.get(`${API}/admin/mystery-drops`, { withCredentials: true });
        setMysteryDrops(all.data || []);
      }
      setShowMysteryForm(false); setEditingDrop(null);
    } catch(e) { alert(e.response?.data?.detail || 'Save failed'); }
  };

  const toggleDrop = async (dropId) => {
    try {
      const r = await axios.patch(`${API}/admin/mystery-drops/${dropId}/toggle`, {}, { withCredentials: true });
      setMysteryDrops(ds => ds.map(d => d.drop_id === dropId ? {...d, is_active: r.data.is_active} : d));
    } catch(e) { alert('Toggle failed'); }
  };

  const deleteDrop = async (dropId) => {
    if (!window.confirm('Delete this mystery drop?')) return;
    try {
      await axios.delete(`${API}/admin/mystery-drops/${dropId}`, { withCredentials: true });
      setMysteryDrops(ds => ds.filter(d => d.drop_id !== dropId));
    } catch(e) { alert('Delete failed'); }
  };

  // saveMysteryConfig replaced by saveDrop/toggleDrop/deleteDrop above

  const saveFlash = async () => {
    try {
      const toIso = (s) => s ? new Date(s).toISOString() : null;
      const payload = { ...flashForm, start_time: toIso(flashForm.start_time), end_time: toIso(flashForm.end_time) };
      if (!payload.start_time || !payload.end_time) { alert('Pick both times lah'); return; }
      if (editingFlash) {
        await axios.patch(`${API}/admin/flash-sales/${editingFlash.sale_id}`, payload, { withCredentials: true });
        setEditingFlash(null);
      } else {
        await axios.post(`${API}/admin/flash-sales`, payload, { withCredentials: true });
      }
      setShowFlash(false); setFlashForm(blankFlash);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };


  // === DISCOUNT CODES ===
  const saveDiscount = async () => {
    try {
      const payload = {
        ...discountForm,
        discount_value: parseFloat(discountForm.discount_value) || 0,
        min_order_value: parseFloat(discountForm.min_order_value) || 0,
        max_uses: discountForm.max_uses !== '' ? parseInt(discountForm.max_uses) : null,
      };
      if (!payload.code.trim()) { alert('Enter a promo code lah'); return; }
      if (editingDiscount) {
        await axios.patch(`${API}/admin/discount-codes/${editingDiscount}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/discount-codes`, payload, { withCredentials: true });
      }
      setShowDiscountForm(false); setEditingDiscount(null); setDiscountForm(blankDiscount);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const editDiscountCode = (c) => {
    setEditingDiscount(c.code_id);
    setDiscountForm({
      code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
      min_order_value: c.min_order_value || 0, max_uses: c.max_uses ?? '',
      active: !!c.active, is_first_order_only: !!c.is_first_order_only,
    });
    setShowDiscountForm(true);
  };
  const delDiscountCode = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    await axios.delete(`${API}/admin/discount-codes/${id}`, { withCredentials: true });
    load();
  };
  const toggleDiscountCode = async (id, current) => {
    await axios.patch(`${API}/admin/discount-codes/${id}`, { active: !current }, { withCredentials: true });
    load();
  };

    const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <div style={{minHeight:'100vh',background:'#030303'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">

      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(255,215,0,0.7)',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
          <span style={{width:20,height:1,background:'#ffd700',display:'inline-block'}} /> Super Admin Console
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(36px,5vw,64px)',letterSpacing:'0.02em',lineHeight:1,marginBottom:8}}>
          Manage <span style={{color:'#ff007f',textShadow:'0 0 30px rgba(255,0,127,0.4)'}}>Everything</span>
        </h1>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Welcome {user?.name}. Drag-drop images, bulk import via CSV, edit anything boss.</p>
      </div>

      {/* Main layout: sidebar nav + content + AI */}
      <div className="flex flex-col lg:flex-row" style={{gap:0,minHeight:'70vh',background:'rgba(255,255,255,0.01)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:24,overflow:'hidden',marginBottom:40}}>

        {/* LEFT NAV — Tab list */}
        <div className="w-full lg:w-[200px] overflow-x-auto lg:overflow-visible flex-shrink-0 flex flex-row lg:flex-col gap-1 lg:gap-0" style={{flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.07)',padding:'12px 0',gap:2}}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',background:tab===t.id?'rgba(255,0,127,0.1)':'transparent',borderLeft:tab===t.id?'2px solid #ff007f':'2px solid transparent',border:'none',cursor:'pointer',textAlign:'left',transition:'all 0.2s',width:'100%'}}>
                <Icon size={13} style={{color:tab===t.id?'#ff007f':'rgba(255,255,255,0.35)',flexShrink:0}} />
                <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.05em',color:tab===t.id?'#fff':'rgba(255,255,255,0.5)',textTransform:'uppercase',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.label}</span>
              </button>
            );
          })}
          <div style={{flex:1}} />
          {/* AI Toggle */}
          <button onClick={() => setShowAI(v => !v)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',background:showAI?'rgba(255,0,127,0.1)':'transparent',borderLeft:showAI?'2px solid #ff007f':'2px solid transparent',border:'none',cursor:'pointer',width:'100%',marginTop:'auto'}}>
            <FaRobot size={13} style={{color:showAI?'#ff007f':'rgba(255,255,255,0.35)'}} />
            <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.05em',color:showAI?'#fff':'rgba(255,255,255,0.5)',textTransform:'uppercase'}}>AI Chat</span>
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,padding:'24px',minWidth:0,overflowX:'hidden'}}>
        <div className="flex flex-wrap gap-2 mb-8" style={{display:'none'}}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',borderRadius:50,fontSize:11,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',border:'none',transition:'all 0.25s'}}
            className={`px-5 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${tab === t.id ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'}`}
            data-testid={`admin-tab-${t.id}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW === */}
      {tab === 'overview' && <OverviewTab />}

      {/* === STAFF PERFORMANCE === */}
      {tab === 'staff-perf' && <StaffPerfTab />}

      {/* === PRODUCTS === */}
      {tab === 'products' && (
        <div className="surface p-6" data-testid="admin-products-panel">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
            <div>
              <h2 className="display-md">Products ({filteredProducts.length})</h2>
              <p className="text-xs text-white/50 mt-1">Click any card to edit · drag image to replace</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={downloadSampleCsv} className="btn-ghost text-xs px-4 py-2.5" data-testid="csv-sample-btn">
                <FaDownload size={11} /> Sample CSV
              </button>
              <button onClick={() => csvRef.current?.click()} className="btn-ghost text-xs px-4 py-2.5" data-testid="csv-import-btn" disabled={csvBusy}>
                {csvBusy ? <FaSpinner className="animate-spin" size={11} /> : <FaFileCsv size={11} />} Bulk Import
              </button>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={(e) => csvUpload(e.target.files?.[0])} />
              <button onClick={() => { setEditingProduct(null); setProductForm(blankProduct); setShowProduct(!showProduct); }} className="btn-pink" data-testid="admin-add-product-btn">
                <FaPlus /> Add Product
              </button>
            </div>
          </div>

          {csvResult && (
            <div className={`mb-6 px-5 py-4 rounded-2xl border ${csvResult.error ? 'border-[#ff007f]/40 bg-[#ff007f]/10 text-[#ff007f]' : 'border-[#39ff14]/40 bg-[#39ff14]/10 text-[#39ff14]'}`} data-testid="csv-result">
              {csvResult.error ? `❌ ${csvResult.error}` : `✓ Created ${csvResult.created} · Skipped ${csvResult.skipped}${csvResult.errors?.length ? ` · ${csvResult.errors.length} errors` : ''}`}
            </div>
          )}

          <div className="relative mb-4">
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products lah..."
              className="input-dark"
              data-testid="admin-products-search"
            />
          </div>

          {/* Bulk select bar */}
          <div className="flex items-center justify-between mb-4 px-1">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox"
                checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                onChange={toggleSelectAll} />
              <span>{selectedProducts.length > 0 ? `${selectedProducts.length} selected` : 'Select all'}</span>
            </label>
            {selectedProducts.length > 0 && (
              <button onClick={bulkDeleteProducts} disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff007f] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                <FaTrash size={11} /> {bulkDeleting ? 'Deleting...' : `Delete ${selectedProducts.length}`}
              </button>
            )}
          </div>

          {showProduct && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6" data-testid="admin-product-form">
              <ImageUploader
                value={productForm.image_url}
                onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                label="Product Image"
                aspect="square"
                testid="product-image-uploader"
              />
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Name</label>
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="input-dark" data-testid="product-form-name" placeholder="e.g. Chardonnay White Wine" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Price (RM)</label>
                    <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="input-dark" data-testid="product-form-price" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Category</label>
                    <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="input-dark" data-testid="product-form-category">
                      <option value="">Pick one</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Description</label>
                  <textarea rows={4} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="input-dark resize-none" placeholder="What makes this bottle special?" />
                </div>
                {/* Discount / Flash Sale section */}
                <div className="bg-[#ff007f08] border border-[#ff007f20] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#ff007f] font-bold">
                    <FaBolt size={12} /> Discount → Auto Flash Sale
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Discounted Price (RM) — leave blank for no discount</label>
                    <input type="number" step="0.01" value={productForm.discount_price}
                      onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                      className="input-dark" placeholder={`e.g. ${(parseFloat(productForm.price || 0) * 0.8).toFixed(2)}`} data-testid="product-form-discount-price" />
                    {productForm.discount_price && parseFloat(productForm.price) > 0 && (
                      <p className="text-xs text-[#39ff14] mt-1">
                        {Math.round((1 - parseFloat(productForm.discount_price) / parseFloat(productForm.price)) * 100)}% off — saves RM{(parseFloat(productForm.price) - parseFloat(productForm.discount_price)).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {productForm.discount_price && (
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Sale Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input type="number" min="0" value={productForm.discount_days}
                            onChange={(e) => setProductForm({ ...productForm, discount_days: e.target.value })}
                            className="input-dark text-center" placeholder="0" />
                          <div className="text-[10px] text-white/40 text-center mt-1">Days</div>
                        </div>
                        <div>
                          <input type="number" min="0" max="23" value={productForm.discount_hours}
                            onChange={(e) => setProductForm({ ...productForm, discount_hours: e.target.value })}
                            className="input-dark text-center" placeholder="0" />
                          <div className="text-[10px] text-white/40 text-center mt-1">Hours</div>
                        </div>
                        <div>
                          <input type="number" min="0" max="59" value={productForm.discount_minutes}
                            onChange={(e) => setProductForm({ ...productForm, discount_minutes: e.target.value })}
                            className="input-dark text-center" placeholder="0" />
                          <div className="text-[10px] text-white/40 text-center mt-1">Minutes</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">Leave all at 0 for a 24-hour default sale.</p>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} />
                  <span>Active (shown to customers)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_preorder} onChange={(e) => setProductForm({ ...productForm, is_preorder: e.target.checked })} />
                  <span>Pre-order (Check Boss First)</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveProduct} className="btn-lime" data-testid="product-form-save">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                  <button onClick={() => { setShowProduct(false); setEditingProduct(null); setProductForm(blankProduct); }} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProducts.map((p) => (
              <div key={p.product_id} className={`bg-[#0a0a0a] border rounded-2xl p-4 flex items-center gap-4 group transition-all ${selectedProducts.includes(p.product_id) ? 'border-[#ff007f]/50 bg-[#ff007f08]' : 'border-white/5'}`} data-testid={`admin-product-${p.product_id}`}>
                <input type="checkbox" className="shrink-0 w-4 h-4"
                  checked={selectedProducts.includes(p.product_id)}
                  onChange={() => toggleSelectProduct(p.product_id)} />
                <div className="w-20 h-20 rounded-xl shrink-0 bg-white overflow-hidden relative">
                  {p.image_url ? (
                    <img src={resolveImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><FaImage size={20} /></div>
                  )}
                  {p.original_price && (
                    <div className="absolute top-0 right-0 bg-[#ff007f] text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5">
                      <FaBolt size={8} /> SALE
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg uppercase truncate">{p.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-2">
                    {p.category}
                    {p.is_preorder && <span className="text-[#ffd700]">· Pre-order</span>}
                  </div>
                  {p.original_price ? (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-white/40 line-through">RM{p.original_price.toFixed(2)}</span>
                      <span className="font-display text-xl neon-pink-text">RM{(p.price || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-[#39ff14] font-bold">-{Math.round((1 - p.price / p.original_price) * 100)}%</span>
                    </div>
                  ) : (
                    <div className="font-display text-xl neon-pink-text mt-1">RM{(p.price || 0).toFixed(2)}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => duplicateProduct(p)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ffd700] hover:text-[#ffd700] flex items-center justify-center transition-all" title="Duplicate" data-testid={`admin-product-dup-${p.product_id}`}>
                    <FaCopy size={11} />
                  </button>
                  <button onClick={() => editProduct(p)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] flex items-center justify-center transition-all" title="Edit" data-testid={`admin-product-edit-${p.product_id}`}>
                    <FaPen size={11} />
                  </button>
                  <button onClick={() => delProduct(p.product_id)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" title="Delete" data-testid={`admin-product-del-${p.product_id}`}>
                    <FaTrash size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === BANNERS === */}
      {tab === 'banners' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <h2 className="display-md">Hero Banners ({banners.length})</h2>
            <button onClick={() => { setEditingBanner(null); setBannerForm(blankBanner); setShowBanner(!showBanner); }} className="btn-pink" data-testid="admin-add-banner-btn">
              <FaPlus /> Add Banner
            </button>
          </div>

          {showBanner && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
              <ImageUploader
                value={bannerForm.background_image}
                onChange={(url) => setBannerForm({ ...bannerForm, background_image: url })}
                label="Background Image"
                aspect="16/9"
                testid="banner-image-uploader"
              />
              <div className="space-y-3">
                <input placeholder="Title (e.g. Spend & Win the Night)" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="input-dark" />
                <input placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} className="input-dark" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="CTA Text (Shop Now Lah)" value={bannerForm.cta_text} onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })} className="input-dark" />
                  <input placeholder="CTA Link (/products)" value={bannerForm.cta_link} onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })} className="input-dark" />
                </div>
                <input type="number" placeholder="Order" value={bannerForm.order_position} onChange={(e) => setBannerForm({ ...bannerForm, order_position: parseInt(e.target.value || '0') })} className="input-dark" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bannerForm.is_active} onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })} /> Active
                </label>
                <div className="flex gap-2">
                  <button onClick={saveBanner} className="btn-lime">{editingBanner ? 'Update' : 'Create'}</button>
                  <button onClick={() => { setShowBanner(false); setEditingBanner(null); setBannerForm(blankBanner); }} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.banner_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-32 h-20 rounded-xl bg-black overflow-hidden shrink-0">
                  {b.background_image && <img src={resolveImageUrl(b.background_image)} alt="" className="w-full h-full object-cover opacity-60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg uppercase truncate">{b.title}</div>
                  <div className="text-xs text-white/50 truncate">{b.subtitle}</div>
                  <span className={`text-[10px] uppercase font-bold ${b.is_active ? 'text-[#39ff14]' : 'text-white/30'}`}>{b.is_active ? 'Active' : 'Hidden'} · pos {b.order_position}</span>
                </div>
                <button onClick={() => editBanner(b)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] flex items-center justify-center"><FaPen size={11} /></button>
                <button onClick={() => delBanner(b.banner_id)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center"><FaTrash size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === FLASH SALES === */}
      {tab === 'flash-sales' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <h2 className="display-md">{editingFlash ? "Edit Flash Sale" : `Flash Sales (${flashSales.length})`}</h2>
            <div className="flex gap-2">
            {editingFlash && <button onClick={() => { setEditingFlash(null); setShowFlash(false); }} className="btn-outline text-xs">Cancel Edit</button>}
            <button onClick={() => { if (!editingFlash) setFlashForm({ product_id: '', discount_percentage: 20, start_time: '', end_time: '' }); setShowFlash(!showFlash); }} className="btn-pink" data-testid="admin-add-flash-btn"><FaBolt /> {editingFlash ? 'Edit Sale' : 'Create Sale'}</button>
          </div>
          </div>
          {showFlash && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
              <select value={flashForm.product_id} onChange={(e) => setFlashForm({ ...flashForm, product_id: e.target.value })} className="input-dark">
                <option value="">Select Product</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name} — RM{p.price}</option>)}
              </select>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Discount %</label>
                <input type="number" min="1" max="90" value={flashForm.discount_percentage} onChange={(e) => setFlashForm({ ...flashForm, discount_percentage: parseFloat(e.target.value || '0') })} className="input-dark" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Start ({Intl.DateTimeFormat().resolvedOptions().timeZone})</label>
                <input type="datetime-local" value={flashForm.start_time} onChange={(e) => setFlashForm({ ...flashForm, start_time: e.target.value })} className="input-dark" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">End ({Intl.DateTimeFormat().resolvedOptions().timeZone})</label>
                <input type="datetime-local" value={flashForm.end_time} onChange={(e) => setFlashForm({ ...flashForm, end_time: e.target.value })} className="input-dark" />
              </div>
              {flashForm.start_time && flashForm.end_time && (
                <div className="text-xs text-white/50 bg-white/5 rounded-xl px-3 py-2">
                  From <span className="text-[#39ff14] font-bold">{new Date(flashForm.start_time).toLocaleString()}</span> to <span className="text-[#ff007f] font-bold">{new Date(flashForm.end_time).toLocaleString()}</span> (UTC stored)
                </div>
              )}
              <button onClick={saveFlash} className="btn-lime">Create Sale</button>
            </div>
          )}
          <div className="space-y-3">
            {flashSales.map((s) => {
              const prod = products.find((p) => p.product_id === s.product_id);
              return (
                <div key={s.sale_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0">
                    {prod?.image_url && <img src={resolveImageUrl(prod.image_url)} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{prod?.name || s.product_id?.slice(0, 8)}</div>
                    <div className="text-xs text-white/40">{new Date(s.start_time).toLocaleString()} → {new Date(s.end_time).toLocaleString()}</div>
                  </div>
                  <div className="font-display text-xl neon-pink-text">{s.discount_percentage}% OFF</div>
                  <div className="flex flex-col gap-1 ml-2">
                    <button onClick={() => { setEditingFlash(s); setFlashForm({ product_id: s.product_id, discount_percentage: s.discount_percentage, start_time: new Date(s.start_time).toISOString().slice(0,16), end_time: new Date(s.end_time).toISOString().slice(0,16) }); setShowFlash(true); }}
                      className="text-xs px-2 py-1 rounded-lg border border-white/15 text-white/60 hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all">Edit</button>
                    <button onClick={() => deleteFlashSale(s.sale_id)}
                      className="text-xs px-2 py-1 rounded-lg border border-white/15 text-white/60 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* === MYSTERY DROP === */}
      {tab === 'mystery-drop' && (
        <div className="space-y-6">
          <div className="surface p-6">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
              <div>
                <h2 className="display-md">Mystery Drops</h2>
                <p className="text-white/50 text-sm mt-1">Create multiple drops — each with its own product, discount and on/off switch.</p>
              </div>
              <button onClick={() => { setShowMysteryForm(true); setEditingDrop(null); setDropForm({ product_id: '', discount_pct: 20, label: 'Mystery Drop', is_active: true }); }}
                className="btn-pink flex items-center gap-2"><FaPlus size={12} /> New Drop</button>
            </div>

            {showMysteryForm && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
                <h3 className="font-display text-xl">{editingDrop ? 'Edit Drop' : 'New Drop'}</h3>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Product <span className="text-[#ff007f]">*</span></label>
                  <select className="input-dark" value={dropForm.product_id} onChange={e => setDropForm(f => ({...f, product_id: e.target.value}))}>
                    <option value="">Select product</option>
                    {products.filter(p => p.is_active).map(p => <option key={p.product_id} value={p.product_id}>{p.name} — RM{p.price}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Discount %</label>
                    <input type="number" min="1" max="90" className="input-dark" value={dropForm.discount_pct}
                      onChange={e => setDropForm(f => ({...f, discount_pct: parseInt(e.target.value)||10}))} />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Label</label>
                    <input className="input-dark" value={dropForm.label}
                      onChange={e => setDropForm(f => ({...f, label: e.target.value}))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDropForm(f => ({...f, is_active: !f.is_active}))}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${dropForm.is_active ? 'bg-[#39ff14] text-black' : 'border border-white/20 text-white/40'}`}>
                    {dropForm.is_active ? '● Active' : '○ Off'}
                  </button>
                  <span className="text-xs text-white/40">Toggle to show/hide on homepage</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveDrop} className="btn-pink">Save Drop</button>
                  <button onClick={() => setShowMysteryForm(false)} className="btn-ghost text-sm">Cancel</button>
                </div>
              </div>
            )}

            {mysteryDrops.length === 0 ? (
              <div className="text-center py-10 text-white/40">No mystery drops yet. Create your first one!</div>
            ) : (
              <div className="space-y-3">
                {mysteryDrops.map(drop => (
                  <div key={drop.drop_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${drop.is_active ? 'bg-[#39ff14]' : 'bg-white/20'}`} />
                      <div>
                        <div className="font-bold">{drop.product_name}</div>
                        <div className="text-xs text-white/40 mt-0.5">{drop.label} · {drop.discount_pct}% off · RM{drop.product_price}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleDrop(drop.drop_id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${drop.is_active ? 'border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-black' : 'border-white/15 text-white/40 hover:border-white/40'}`}>
                        {drop.is_active ? 'Live' : 'Off'}
                      </button>
                      <button onClick={() => { setEditingDrop(drop.drop_id); setDropForm({ product_id: drop.product_id, discount_pct: drop.discount_pct, label: drop.label, is_active: drop.is_active }); setShowMysteryForm(true); }}
                        className="px-3 py-1.5 rounded-full text-xs border border-white/15 text-white/60 hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all">Edit</button>
                      <button onClick={() => deleteDrop(drop.drop_id)}
                        className="px-3 py-1.5 rounded-full text-xs border border-white/15 text-white/60 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SUPPLIERS (Master Admin only) === */}
      {tab === 'suppliers' && (
        <SupplierTab API={API} active={tab === 'suppliers'} />
      )}

      {/* === DISCOUNT CODES === */}
      {tab === 'discount-codes' && (
        <div className="surface p-6">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="display-md">Promo Codes ({discountCodes.length})</h2>
              <p className="text-xs text-white/50 mt-1">Create discount codes for customers. Toggle to activate/deactivate.</p>
            </div>
            <button onClick={() => { setEditingDiscount(null); setDiscountForm(blankDiscount); setShowDiscountForm(!showDiscountForm); }} className="btn-pink">
              <FaPlus /> Add Code
            </button>
          </div>

          {showDiscountForm && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
              <h3 className="font-display text-xl">{editingDiscount ? 'Edit Code' : 'New Code'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Code *</label>
                  <input value={discountForm.code} onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    className="input-dark" placeholder="e.g. NEWBRO" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Type</label>
                  <select value={discountForm.discount_type} onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })} className="input-dark">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (RM)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">
                    {discountForm.discount_type === 'percentage' ? 'Discount %' : 'Discount (RM)'}
                  </label>
                  <input type="number" min="0" step="0.01" value={discountForm.discount_value}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Min Order (RM)</label>
                  <input type="number" min="0" step="0.01" value={discountForm.min_order_value}
                    onChange={(e) => setDiscountForm({ ...discountForm, min_order_value: e.target.value })} className="input-dark" placeholder="0 = no minimum" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Max Uses (blank = unlimited)</label>
                  <input type="number" min="0" value={discountForm.max_uses}
                    onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value })} className="input-dark" placeholder="Unlimited" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={discountForm.is_first_order_only}
                    onChange={(e) => setDiscountForm({ ...discountForm, is_first_order_only: e.target.checked })} />
                  <span>First order only</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={discountForm.active}
                    onChange={(e) => setDiscountForm({ ...discountForm, active: e.target.checked })} />
                  <span>Active</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveDiscount} className="btn-lime">{editingDiscount ? 'Update' : 'Create Code'}</button>
                <button onClick={() => { setShowDiscountForm(false); setEditingDiscount(null); setDiscountForm(blankDiscount); }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {discountCodes.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <FaKey size={32} className="mx-auto mb-4 text-white/20" />
              <div className="font-bold mb-2">No promo codes yet boss.</div>
              <div className="text-xs">Click "Add Code" to create your first discount.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {discountCodes.map((c) => (
                <div key={c.code_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.active ? 'bg-[#39ff14]' : 'bg-white/20'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <code className="font-display text-xl text-[#ffd700] uppercase">{c.code}</code>
                      {c.is_first_order_only && (
                        <span className="text-[10px] bg-[#ff007f]/20 text-[#ff007f] px-2 py-0.5 rounded-full font-bold uppercase">First Order</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.active ? 'bg-[#39ff14]/15 text-[#39ff14]' : 'bg-white/5 text-white/30'}`}>
                        {c.active ? 'Active' : 'Off'}
                      </span>
                    </div>
                    <div className="text-xs text-white/50 mt-1 flex flex-wrap gap-3">
                      <span>{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `RM${c.discount_value} off`}</span>
                      {c.min_order_value > 0 && <span>Min: RM{c.min_order_value}</span>}
                      <span>Used: {c.used_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleDiscountCode(c.code_id, c.active)}
                      className={`px-3 py-1.5 rounded-full text-xs border font-bold transition-all ${c.active ? 'border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-black' : 'border-white/15 text-white/40 hover:border-white/60'}`}>
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => editDiscountCode(c)}
                      className="w-9 h-9 rounded-full border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] flex items-center justify-center transition-all">
                      <FaPen size={11} />
                    </button>
                    <button onClick={() => delDiscountCode(c.code_id)}
                      className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all">
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

            {/* === STAFF MODE (redirect) === */}
      {tab === 'staff-mode' && (
        <div className="surface p-10 text-center space-y-4">
          
          <h2 className="display-md">Your Sales Dashboard</h2>
          <p className="text-white/50">Log personal sales, manage your stock, transfer orders.</p>
          <a href="/staff" className="btn-pink inline-flex items-center gap-2 mx-auto">Go to Staff Dashboard</a>
        </div>
      )}

      {/* === BRANDS === */}
      {tab === 'brands' && (
        <div className="surface p-6" data-testid="admin-brands-panel">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <h2 className="display-md">Brands ({brands.length})</h2>
            <button onClick={() => { setEditingBrand(null); setBrandForm(blankBrand); setShowBrand(!showBrand); }} className="btn-pink" data-testid="admin-add-brand-btn">
              <FaPlus /> Add Brand
            </button>
          </div>

          {showBrand && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6" data-testid="admin-brand-form">
              <ImageUploader
                value={brandForm.logo_url}
                onChange={(url) => setBrandForm({ ...brandForm, logo_url: url })}
                label="Logo (transparent PNG/SVG)"
                aspect="4/5"
                testid="brand-logo-uploader"
              />
              <div className="space-y-3">
                <input placeholder="Name (e.g. Johnnie Walker)" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} className="input-dark" data-testid="brand-form-name" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Short Name (Walker)" value={brandForm.short_name} onChange={(e) => setBrandForm({ ...brandForm, short_name: e.target.value })} className="input-dark" />
                  <input placeholder="Subtitle (Striding Man)" value={brandForm.subtitle} onChange={(e) => setBrandForm({ ...brandForm, subtitle: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Background Color</label>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={brandForm.color_hex} onChange={(e) => setBrandForm({ ...brandForm, color_hex: e.target.value })} className="w-14 h-14 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
                    <input value={brandForm.color_hex} onChange={(e) => setBrandForm({ ...brandForm, color_hex: e.target.value })} className="input-dark flex-1" />
                  </div>
                </div>
                <input placeholder="Search term (default = name)" value={brandForm.search_term} onChange={(e) => setBrandForm({ ...brandForm, search_term: e.target.value })} className="input-dark" />
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Display Order</label>
                  <input type="number" value={brandForm.order_position} onChange={(e) => setBrandForm({ ...brandForm, order_position: parseInt(e.target.value || '0') })} className="input-dark" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={brandForm.is_active} onChange={(e) => setBrandForm({ ...brandForm, is_active: e.target.checked })} /> Active
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveBrand} className="btn-lime" data-testid="brand-form-save">{editingBrand ? 'Update' : 'Create'}</button>
                  <button onClick={() => { setShowBrand(false); setEditingBrand(null); setBrandForm(blankBrand); }} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brands.map((b) => (
              <div key={b.brand_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4" data-testid={`admin-brand-${b.brand_id}`}>
                <div className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden" style={{ background: b.color_hex }}>
                  {b.logo_url && <img src={resolveImageUrl(b.logo_url)} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5" onError={(e) => { e.target.style.display = 'none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg uppercase truncate">{b.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 truncate">{b.subtitle || '—'} · pos {b.order_position}</div>
                  <div className={`text-[10px] uppercase font-bold ${b.is_active ? 'text-[#39ff14]' : 'text-white/30'}`}>{b.is_active ? 'Active' : 'Hidden'}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveBrand(b, -1)} className="w-8 h-8 rounded-full border border-white/10 hover:border-[#39ff14] flex items-center justify-center"><FaArrowUp size={9} /></button>
                  <button onClick={() => moveBrand(b, 1)} className="w-8 h-8 rounded-full border border-white/10 hover:border-[#39ff14] flex items-center justify-center"><FaArrowDown size={9} /></button>
                </div>
                <button onClick={() => editBrand(b)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] flex items-center justify-center" data-testid={`admin-brand-edit-${b.brand_id}`}><FaPen size={11} /></button>
                <button onClick={() => delBrand(b.brand_id)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center" data-testid={`admin-brand-del-${b.brand_id}`}><FaTrash size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* === STAFF === */}
      {tab === 'staff' && (
        <div className="surface p-6" data-testid="admin-staff-panel">
          <div className="flex justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="display-md">Staff Team ({staff.length})</h2>
              <p className="text-xs text-white/50 mt-1">Add staff with email + referral code. They'll get login credentials to manage their orders.</p>
            </div>
            <button onClick={() => { setEditingStaff(null); setStaffForm(blankStaff); setShowStaff(!showStaff); }} className="btn-pink" data-testid="admin-add-staff-btn">
              <FaPlus /> Add Staff
            </button>
          </div>

          {/* One-time credentials reveal */}
          {staffSecret && (
            <div className="bg-[#39ff14]/10 border-2 border-[#39ff14]/40 rounded-2xl p-5 mb-6" data-testid="staff-credentials-reveal">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="eyebrow !text-[#39ff14] mb-2">✓ Credentials Generated · Share Once</div>
                  <h3 className="display-md mb-3">{staffSecret.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-black/40 rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Email</div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[#00f0ff] truncate">{staffSecret.email}</code>
                        <button onClick={() => copyToClipboard(staffSecret.email)} className="text-white/40 hover:text-white shrink-0"><FaCopy size={12} /></button>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Temp Password</div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[#ff007f] truncate font-bold">{staffSecret.password}</code>
                        <button onClick={() => copyToClipboard(staffSecret.password)} className="text-white/40 hover:text-white shrink-0" data-testid="staff-copy-password"><FaCopy size={12} /></button>
                      </div>
                    </div>
                    {staffSecret.referral && (
                      <div className="bg-black/40 rounded-xl p-3 md:col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Referral Code</div>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[#ffd700] font-bold">{staffSecret.referral}</code>
                          <button onClick={() => copyToClipboard(staffSecret.referral)} className="text-white/40 hover:text-white shrink-0"><FaCopy size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-3">Share these via WhatsApp/email. The password won't be shown again — only resetable.</p>
                </div>
                <button onClick={() => setStaffSecret(null)} className="text-white/50 hover:text-white shrink-0" data-testid="staff-dismiss-creds">×</button>
              </div>
            </div>
          )}

          {showStaff && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6 space-y-3" data-testid="admin-staff-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Name</label>
                  <input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="input-dark" placeholder="e.g. Sam" data-testid="staff-form-name" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Email {editingStaff && <span className="text-white/30 normal-case">(locked)</span>}</label>
                  <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} disabled={!!editingStaff} className="input-dark disabled:opacity-50" placeholder="sam@masterliqours.my" data-testid="staff-form-email" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">WhatsApp Number</label>
                  <input value={staffForm.whatsapp_number} onChange={(e) => setStaffForm({ ...staffForm, whatsapp_number: e.target.value })} className="input-dark" placeholder="+60123456789" data-testid="staff-form-wa" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[#ffd700] block mb-2">Referral Code <span className="text-white/30 normal-case">(auto-generated if blank)</span></label>
                  <input value={staffForm.referral_code} onChange={(e) => setStaffForm({ ...staffForm, referral_code: e.target.value.toUpperCase() })} className="input-dark" placeholder="SAM001" data-testid="staff-form-referral" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[#00f0ff] block mb-2">Shared Warehouse <span className="text-white/30 normal-case">(optional — staff sharing one physical storage place)</span></label>
                  <input value={staffForm.warehouse_name} onChange={(e) => setStaffForm({ ...staffForm, warehouse_name: e.target.value })} className="input-dark" placeholder="e.g. Main Store — leave blank for personal stock" data-testid="staff-form-warehouse" />
                  <p className="text-[10px] text-white/40 mt-1">Give two or more staff the exact same warehouse name and their "My Stock" becomes one shared pool — selling decrements it for everyone, no more double-counting.</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveStaff} className="btn-lime" data-testid="staff-form-save">{editingStaff ? 'Update' : 'Create Staff'}</button>
                <button onClick={() => { setShowStaff(false); setEditingStaff(null); setStaffForm(blankStaff); }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {staff.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <FaUsers size={32} className="mx-auto mb-4 text-white/20" />
              <div className="font-bold mb-2">No staff yet boss.</div>
              <div className="text-xs">Click "Add Staff" to onboard your team members.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staff.map((s) => (
                <div key={s.staff_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4" data-testid={`admin-staff-${s.staff_id}`}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff007f] to-[#00f0ff] flex items-center justify-center font-display text-xl shrink-0">
                    {s.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg uppercase truncate">{s.name}</div>
                    <div className="text-xs text-white/50 truncate">{s.email}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider bg-[#ffd700]/15 text-[#ffd700] px-2 py-0.5 rounded-full font-bold">{s.referral_code}</span>
                      {s.warehouse_name && (
                        <span className="text-[10px] uppercase tracking-wider bg-[#00f0ff]/15 text-[#00f0ff] px-2 py-0.5 rounded-full font-bold">{s.warehouse_name}</span>
                      )}
                      {s.whatsapp_number && (
                        <a href={`https://wa.me/${s.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[#39ff14] hover:scale-110 transition-transform"><FaWhatsapp size={12} /></a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => resetStaffPw(s.staff_id)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ffd700] hover:text-[#ffd700] flex items-center justify-center" title="Reset password" data-testid={`staff-reset-${s.staff_id}`}><FaKey size={11} /></button>
                    <button onClick={() => editStaff(s)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] flex items-center justify-center" title="Edit" data-testid={`staff-edit-${s.staff_id}`}><FaPen size={11} /></button>
                    <button onClick={() => delStaff(s.staff_id)} className="w-9 h-9 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center" title="Delete" data-testid={`staff-del-${s.staff_id}`}><FaTrash size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </div>{/* end main content */}

        {/* AI SIDEBAR */}
        {showAI && <AdminAIChat onClose={() => setShowAI(false)} />}

      </div>{/* end sidebar layout */}
    </div>
    </div>
  );
};

// ── AI Chat for Admin ──────────────────────────────────────────────────────
const AdminAIChat = ({ onClose }) => {
  const [msgs, setMsgs] = React.useState([
    { role: 'assistant', content: 'Hi boss! Ask me about sales, products, staff performance or anything you need.' }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef(null);
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMsgs(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: input,
        conversation_history: msgs.slice(-8),
        context: 'admin_dashboard',
      }, { withCredentials: true });
      setMsgs(m => [...m, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Sorry boss, AI unavailable. Try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{width:280,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',maxHeight:'70vh'}}>
      <div style={{background:'linear-gradient(135deg,#ff007f,#c8005a)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <FaRobot size={15} />
          <div>
            <div style={{fontWeight:800,fontSize:12,letterSpacing:'0.04em'}}>AI ASSISTANT</div>
            <div style={{fontSize:10,opacity:0.8}}>Admin context</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer'}}><FaXIcon size={13} /></button>
      </div>
      <div style={{padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:4,flexWrap:'wrap'}}>
        {['Sales today?','Top products?','Staff performance?','Pending orders?'].map(q => (
          <button key={q} onClick={() => setInput(q)}
            style={{fontSize:10,padding:'3px 8px',borderRadius:50,background:'rgba(255,0,127,0.08)',border:'1px solid rgba(255,0,127,0.2)',color:'rgba(255,255,255,0.6)',cursor:'pointer'}}>
            {q}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:8,minHeight:0}}>
        {msgs.map((m, i) => (
          <div key={i} style={{display:'flex',gap:6,flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start'}}>
            <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:m.role==='user'?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.08)',fontSize:9}}>
              {m.role==='user'?'A':<FaRobot size={10} style={{color:'#ff007f'}} />}
            </div>
            <div style={{maxWidth:'85%',padding:'8px 11px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.07)',fontSize:11,lineHeight:1.55,color:'#fff'}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{display:'flex',gap:6}}><div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}><FaRobot size={10} style={{color:'#ff007f'}} /></div><div style={{padding:'8px 11px',borderRadius:'14px 14px 14px 4px',background:'rgba(255,255,255,0.07)',display:'flex',gap:3,alignItems:'center'}}>{[0,0.15,0.3].map((d,i)=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,0.4)',animation:`pulse 1s ${d}s ease-in-out infinite`}} />)}</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:6}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send())}
          placeholder="Ask lah boss..."
          style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:50,padding:'7px 12px',color:'#fff',fontSize:11,outline:'none'}}
          onFocus={e=>e.target.style.borderColor='rgba(255,0,127,0.5)'}
          onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
        <button onClick={send} disabled={loading||!input.trim()}
          style={{width:30,height:30,borderRadius:'50%',background:input.trim()?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.06)',border:'none',color:'#fff',cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <FaPaperPlane size={11} />
        </button>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
