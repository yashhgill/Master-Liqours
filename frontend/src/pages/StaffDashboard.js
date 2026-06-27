import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { subscribeStaffToPush } from '../lib/pwa';
import {
  FaCheck, FaSpinner, FaTruck, FaBoxOpen, FaTimes, FaPlus,
  FaMinus, FaEdit, FaRandom, FaWhatsapp, FaBox, FaEnvelope
} from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_FLOW = [
  { id: 'pending',          label: 'Pending',         icon: FaSpinner, color: '#ffd700' },
  { id: 'confirmed',        label: 'Confirmed',        icon: FaCheck,   color: '#00f0ff' },
  { id: 'preparing',        label: 'Preparing',        icon: FaBoxOpen, color: '#00f0ff' },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: FaTruck,   color: '#39ff14' },
  { id: 'delivered',        label: 'Delivered',        icon: FaCheck,   color: '#39ff14' },
];

const nextStatus = (current) => {
  const idx = STATUS_FLOW.findIndex(s => s.id === current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
};

// ── Reusable searchable product picker ──────────────────────────────────────
const ProductPicker = ({ products, value, onSelect, placeholder = 'Type to search...' }) => {
  const [search, setSearch] = useState(() => products.find(p => p.product_id === value)?.name || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const match = products.find(p => p.product_id === value);
    if (match && match.name !== search) setSearch(match.name);
    if (!value) setSearch('');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const pick = (p) => {
    onSelect(p.product_id);
    setSearch(p.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="input-dark text-sm"
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); if (value) onSelect(''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-[#161616] border border-white/15 rounded-xl shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/40">No products match "{search}"</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.product_id}
                type="button"
                onMouseDown={() => pick(p)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#ff007f]/15 transition-colors flex justify-between items-center"
              >
                <span>{p.name}</span>
                <span className="text-white/40 text-xs shrink-0 ml-2">RM{p.price}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Personal Order Modal ────────────────────────────────────────────────────
const PersonalOrderModal = ({ products, onClose, onSaved }) => {
  const [items, setItems] = useState([{ product_id: '', quantity: 1, price: '' }]);
  const [customer, setCustomer] = useState({ name: '', whatsapp: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { product_id: '', quantity: 1, price: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const total = items.reduce((sum, it) => {
    const p = products.find(p => p.product_id === it.product_id);
    const price = it.price ? parseFloat(it.price) : p?.price || 0;
    return sum + price * (parseInt(it.quantity) || 1);
  }, 0);

  const submit = async () => {
    if (!customer.name.trim() || !customer.whatsapp.trim()) { alert('Name & WhatsApp required lah'); return; }
    if (items.some(it => !it.product_id)) { alert('Select a product for each item'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/orders/personal`, {
        customer_name: customer.name.trim(),
        customer_whatsapp: customer.whatsapp.trim(),
        notes: customer.notes.trim() || null,
        items: items.map(it => ({
          product_id: it.product_id,
          quantity: parseInt(it.quantity) || 1,
          price: it.price ? parseFloat(it.price) : null,
        })),
      }, { withCredentials: true });
      onSaved();
      onClose();
    } catch (e) { alert(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display-md">Log Personal Sale</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FaTimes /></button>
        </div>
        <p className="text-white/50 text-sm">Record a sale received outside the app (WhatsApp, walk-in, etc).</p>

        <div className="space-y-3">
          {[['name','Customer Name','e.g. Ahmad'],['whatsapp','WhatsApp Number','e.g. 0123456789'],['notes','Notes (optional)','e.g. Paid cash, pickup at Puchong']].map(([key, label, ph]) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1">{label}{key !== 'notes' && <span className="text-[#ff007f]"> *</span>}</label>
              <input className="input-dark" placeholder={ph} value={customer[key]} onChange={e => setCustomer({ ...customer, [key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">Items</label>
            <button onClick={addItem} className="text-[#39ff14] text-xs flex items-center gap-1 hover:underline"><FaPlus size={10} /> Add item</button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_56px_80px_28px] gap-2 items-center">
                <ProductPicker products={products} value={it.product_id} onSelect={(id) => updateItem(i, 'product_id', id)} />
                <input type="number" min="1" className="input-dark text-sm text-center" placeholder="Qty" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" step="0.01" className="input-dark text-sm" placeholder="Price" title="Leave blank = product price" value={it.price} onChange={e => updateItem(i, 'price', e.target.value)} />
                {items.length > 1 && <button onClick={() => removeItem(i)} className="text-white/30 hover:text-[#ff007f]"><FaTimes size={12} /></button>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-1">Price: leave blank to use listed price</p>
        </div>

        <div className="border-t border-white/10 pt-3 flex justify-between items-center">
          <span className="text-white/50 text-sm">Total</span>
          <span className="font-display text-2xl neon-pink-text">RM{total.toFixed(2)}</span>
        </div>

        <button onClick={submit} disabled={saving} className="btn-pink w-full disabled:opacity-50">
          {saving ? 'Saving...' : 'Log Sale'}
        </button>
      </div>
    </div>
  );
};

// ── Transfer Modal ──────────────────────────────────────────────────────────
const TransferModal = ({ order, allStaff, onClose, onTransferred }) => {
  const [targetId, setTargetId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!targetId) { alert('Select a staff to transfer to'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/staff/orders/${order.order_id}/transfer`, { target_staff_id: targetId }, { withCredentials: true });
      onTransferred();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Transfer failed — check connection';
      alert(msg);
    }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface p-6 w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display-md">Transfer Order</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FaTimes /></button>
        </div>
        <p className="text-white/50 text-sm">Order #{order.order_id.slice(0, 8).toUpperCase()} will be reassigned.</p>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Transfer to</label>
          <select className="input-dark" value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="">Select staff</option>
            {allStaff.filter(s => s.staff_id !== order.staff_id).map(s => (
              <option key={s.staff_id} value={s.staff_id}>{s.name} — {s.whatsapp_number || 'no WA'}</option>
            ))}
          </select>
        </div>
        <button onClick={submit} disabled={saving} className="btn-pink w-full disabled:opacity-50">
          {saving ? 'Transferring...' : 'Confirm Transfer'}
        </button>
      </div>
    </div>
  );
};

// ── Stock Modal (Add / Adjust) ──────────────────────────────────────────────
const StockModal = ({ stock, onClose, onSaved }) => {
  const [qty, setQty] = useState('');
  const [mode, setMode] = useState('set'); // 'set' | 'add' | 'remove'
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = parseInt(qty);
    if (isNaN(n) || n < 0) { alert('Enter a valid number'); return; }
    let newQty = stock.quantity;
    if (mode === 'set') newQty = n;
    else if (mode === 'add') newQty = stock.quantity + n;
    else if (mode === 'remove') newQty = Math.max(0, stock.quantity - n);

    setSaving(true);
    try {
      await axios.patch(`${API}/staff/my-stock/${stock.stock_id}`, { quantity: newQty }, { withCredentials: true });
      onSaved(stock.stock_id, newQty);
      onClose();
    } catch (e) { alert(e.response?.data?.detail || 'Update failed'); }
    finally { setSaving(false); }
  };

  const preview = (() => {
    const n = parseInt(qty) || 0;
    if (mode === 'set') return n;
    if (mode === 'add') return stock.quantity + n;
    return Math.max(0, stock.quantity - n);
  })();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface p-6 w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display-md">Update Stock</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FaTimes /></button>
        </div>
        <div className="bg-[#0a0a0a] rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-1">{stock.product_name}</div>
          <div className="font-display text-3xl">Current: <span className="neon-cyan-text">×{stock.quantity}</span></div>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          {[['set','Set to','#00f0ff'],['add','Add','#39ff14'],['remove','Remove','#ff007f']].map(([m, label, color]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${mode === m ? 'border-current' : 'border-white/10 text-white/40'}`}
              style={mode === m ? { color, borderColor: color, background: `${color}15` } : {}}>
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">
            {mode === 'set' ? 'New quantity' : mode === 'add' ? 'Add how many?' : 'Remove how many?'}
          </label>
          <input type="number" min="0" className="input-dark text-center text-2xl font-display"
            placeholder="0" value={qty} onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        </div>

        {qty !== '' && (
          <div className="text-center text-sm text-white/50">
            Result: <span className="font-bold text-white font-display text-xl">×{preview}</span>
          </div>
        )}

        <button onClick={submit} disabled={saving} className="btn-pink w-full disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Stock'}
        </button>
      </div>
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────────────────
const ADMIN_ROLES = ['staff', 'super_admin', 'master_admin'];

// ── Add Stock Modal ──────────────────────────────────────────────────────────
const AddStockModal = ({ products, existingStock, onClose, onSaved }) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  // Filter out products already in stock
  const existingIds = new Set(existingStock.map(s => s.product_id));
  const available = products.filter(p => !existingIds.has(p.product_id) && p.is_active);

  const submit = async () => {
    if (!productId) { alert('Select a product lah'); return; }
    if (quantity < 0) { alert('Quantity cannot be negative'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/staff/my-stock`, { product_id: productId, quantity: parseInt(quantity) }, { withCredentials: true });
      onSaved();
      onClose();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add stock');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface p-6 w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display-md">Add Stock</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FaTimes /></button>
        </div>
        <p className="text-white/40 text-xs">Log stock received from boss for a product.</p>

        {available.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-4">All products already in your stock list.</p>
        ) : (
          <>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Product</label>
              <ProductPicker products={available} value={productId} onSelect={setProductId} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Quantity Received</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(0, q - 1))}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">
                  <FaMinus size={12} />
                </button>
                <input type="number" min="0" className="input-dark text-center w-24 text-xl font-display"
                  value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
                <button onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:border-[#39ff14] hover:text-[#39ff14] transition-all">
                  <FaPlus size={12} />
                </button>
              </div>
            </div>
            <button onClick={submit} disabled={saving || !productId} className="btn-pink w-full disabled:opacity-50">
              {saving ? 'Adding...' : 'Add to My Stock'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};


const StaffDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [notifying, setNotifying] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState({});
  const [showPersonal, setShowPersonal] = useState(false);
  const [transferOrder, setTransferOrder] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [tab, setTab] = useState('orders');

  const isAdmin = user?.role === 'super_admin' || user?.role === 'master_admin';

  const loadData = () => {
    axios.get(`${API}/staff/my-orders`, { withCredentials: true }).then(r => setOrders(r.data)).catch(() => {});
    axios.get(`${API}/staff/my-stock`, { withCredentials: true }).then(r => setStock(r.data)).catch(() => {});
    axios.get(`${API}/staff/info`, { withCredentials: true }).then(r => setAllStaff(r.data)).catch(() => {});
    axios.get(`${API}/products`, { withCredentials: true }).then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
  };

  useEffect(() => { loadData(); subscribeStaffToPush(); }, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    const prev = [...orders];
    setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { withCredentials: true });
    } catch (e) { setOrders(prev); alert(e.response?.data?.detail || 'Update failed'); }
    finally { setUpdating(null); }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    await updateStatus(orderId, 'cancelled');
  };

  const notifyCustomer = async (orderId) => {
    setNotifying(orderId);
    try {
      await axios.post(`${API}/staff/orders/${orderId}/notify-customer`, {}, { withCredentials: true });
      setNotifiedIds(ids => ({ ...ids, [orderId]: Date.now() }));
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not send email');
    } finally { setNotifying(null); }
  };

  const visibleOrders = filter ? orders.filter(o => o.status === filter) : orders;
  const counts = STATUS_FLOW.reduce((acc, s) => ({ ...acc, [s.id]: orders.filter(o => o.status === s.id).length }), {});

  const totalStockItems = stock.reduce((sum, s) => sum + s.quantity, 0);
  const lowStockItems = stock.filter(s => s.quantity <= 2 && s.quantity > 0).length;
  const oosItems = stock.filter(s => s.quantity === 0).length;

  return (
    <div style={{minHeight:'100vh',background:'#030303'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">

      {/* Header */}
      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:32}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.4em',textTransform:'uppercase',color:'rgba(255,215,0,0.7)',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:20,height:1,background:'#ffd700',display:'inline-block'}} /> {isAdmin ? 'Admin Console' : 'Staff Console'}
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(36px,5vw,60px)',letterSpacing:'0.02em',lineHeight:1,marginBottom:6}}>
            Hi <span style={{color:'#00f0ff',textShadow:'0 0 30px rgba(0,240,255,0.4)'}}>{user?.name}</span>
          </h1>
          <p style={{color:'rgba(255,255,255,0.45)',fontSize:14}}>Manage orders, stock & personal sales here boss.</p>
        </div>
        <button onClick={() => setShowPersonal(true)} className="btn-lime flex items-center gap-2">
          <FaPlus size={12} /> Log Personal Sale
        </button>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
        {STATUS_FLOW.slice(0, 3).map(s => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? '' : s.id)}
            style={{padding:'20px 22px',textAlign:'left',border:`1px solid ${filter === s.id ? s.color+'66' : 'rgba(255,255,255,0.07)'}`,borderRadius:20,background:filter === s.id ? `${s.color}10` : 'rgba(255,255,255,0.03)',cursor:'pointer',transition:'all 0.25s'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:s.color,marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color:s.color,textShadow:`0 0 20px ${s.color}55`,lineHeight:1}}>{counts[s.id] || 0}</div>
          </button>
        ))}
        <div style={{padding:'20px 22px',border:'1px solid rgba(0,240,255,0.15)',borderRadius:20,background:'rgba(0,240,255,0.04)'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'#00f0ff',marginBottom:8}}>My Stock</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color:'#00f0ff',textShadow:'0 0 20px rgba(0,240,255,0.3)',lineHeight:1}}>{totalStockItems}</div>
          {(lowStockItems > 0 || oosItems > 0) && (
            <div style={{fontSize:10,marginTop:6}}>
              {oosItems > 0 && <div style={{color:'#ff007f',fontWeight:700}}>⚠ {oosItems} out of stock</div>}
              {lowStockItems > 0 && <div style={{color:'#ffd700',fontWeight:700}}>⚠ {lowStockItems} running low</div>}
            </div>
          )}
        </div>
      </div>

      {/* Main content + AI sidebar */}
      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
      <div style={{flex:1,minWidth:0}}>

      {/* Tab switcher */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['orders','stock'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{padding:'10px 22px',borderRadius:50,fontSize:12,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',border:'none',transition:'all 0.25s',background:tab===t?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.06)',color:tab===t?'#fff':'rgba(255,255,255,0.45)',boxShadow:tab===t?'0 0 20px rgba(255,0,127,0.3)':'none'}}>
            {t === 'orders' ? `Orders (${visibleOrders.length})` : `My Stock (${stock.length})`}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:24,padding:"20px 24px"}}>
          {filter && (
            <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
              Filter: <span className="font-bold text-white">{STATUS_FLOW.find(s => s.id === filter)?.label}</span>
              <button onClick={() => setFilter('')} className="text-[#ff007f] hover:underline text-xs">Clear</button>
            </div>
          )}
          {visibleOrders.length === 0 ? (
            <div className="text-white/40 text-sm py-12 text-center">No orders {filter ? `in ${filter} state` : ''} lah.</div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map(o => {
                const meta = STATUS_FLOW.find(s => s.id === o.status) || { label: o.status, color: '#888' };
                const next = nextStatus(o.status);
                const isBusy = updating === o.order_id;
                const isFinal = o.status === 'delivered' || o.status === 'cancelled';
                return (
                  <div key={o.order_id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"16px 20px",transition:"border-color 0.2s"}}>
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 font-bold">
                          #{o.order_id.slice(0, 8).toUpperCase()}
                          {o.is_personal_order && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff007f20] text-[#ff007f] font-bold uppercase">Personal</span>
                          )}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">{new Date(o.created_at).toLocaleString()}</div>

                        {/* Items ordered — this is what staff needs to prepare */}
                        {(o.items || []).length > 0 && (
                          <div className="mt-2 mb-1 space-y-1">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="text-sm text-white/90 flex items-center gap-2">
                                <span className="text-[#39ff14] font-bold">{it.quantity}×</span>
                                <span className="font-bold">{it.product_name || 'Unknown Product'}</span>
                                <span className="text-white/30 text-xs">@ RM{Number(it.price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {o.customer_name && <div className="text-xs text-white/60 mt-1">{o.customer_name} · {o.customer_whatsapp}</div>}
                        {o.customer_whatsapp && (
                          <a href={`https://wa.me/${o.customer_whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(
                              `Hi ${o.customer_name || ''}! Re your order #${o.order_id.slice(0,8).toUpperCase()}:\n` +
                              o.items.map(it => `• ${it.quantity}x ${it.product_name}`).join('\n') +
                              `\nTotal: RM${o.total.toFixed(2)}`
                            )}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#25d366] mt-1 hover:underline" onClick={e => e.stopPropagation()}>
                            <FaWhatsapp size={10} /> Message customer
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#ff007f",textShadow:"0 0 20px rgba(255,0,127,0.3)"}}>RM{o.total.toFixed(2)}</div>
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${meta.color}20`, color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>
                    {o.shipping_address && <div className="text-xs text-white/30 mb-3 truncate">{o.shipping_address}</div>}
                    {!isFinal && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {next && (
                          <button onClick={() => updateStatus(o.order_id, next.id)} disabled={isBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#39ff14] text-black font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                            <next.icon size={12} /> → {next.label}
                          </button>
                        )}
                        <button onClick={() => setTransferOrder(o)} disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/60 hover:border-[#00f0ff] hover:text-[#00f0ff] text-xs uppercase tracking-wider font-bold transition-all">
                          <FaRandom size={12} /> Transfer
                        </button>
                        <button onClick={() => notifyCustomer(o.order_id)} disabled={isBusy || notifying === o.order_id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/60 hover:border-[#ffd700] hover:text-[#ffd700] text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50">
                          {notifying === o.order_id
                            ? <><FaSpinner size={12} className="animate-spin" /> Sending...</>
                            : notifiedIds[o.order_id]
                              ? <><FaCheck size={12} /> Notified</>
                              : <><FaEnvelope size={12} /> Notify Customer</>
                          }
                        </button>
                        <button onClick={() => cancelOrder(o.order_id)} disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/60 hover:border-[#ff007f] hover:text-[#ff007f] text-xs uppercase tracking-wider font-bold transition-all">
                          <FaTimes size={12} /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div className="surface p-6">
          <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
            <div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:"0.02em"}}>My Stock</h2>
              <div className="text-xs text-white/40 mt-1">Boss distributes stock → you log it here</div>
            </div>
            <button onClick={() => setShowAddStock(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00f0ff] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all">
              <FaPlus size={10} /> Add Stock
            </button>
          </div>

          {stock.length === 0 ? (
            <div className="text-center py-12">
              <FaBox size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No stock assigned yet.</p>
              <p className="text-white/30 text-xs mt-1">Ask admin to assign products to your account, or add stock for products you have.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stock.map(s => (
                <div key={s.stock_id}
                  className={`bg-[#0a0a0a] border rounded-xl p-4 flex items-center justify-between gap-4 transition-all ${
                    s.quantity === 0 ? 'border-[#ff007f30]' : s.quantity <= 2 ? 'border-[#ffd70030]' : 'border-white/5'
                  }`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{s.product_name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{s.category}</div>
                    {s.quantity === 0 && <div className="text-[10px] text-[#ff007f] mt-0.5">⚠ Out of stock</div>}
                    {s.quantity > 0 && s.quantity <= 2 && <div className="text-[10px] text-[#ffd700] mt-0.5">⚠ Running low</div>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Quick ± buttons */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        const newQty = Math.max(0, s.quantity - 1);
                        axios.patch(`${API}/staff/my-stock/${s.stock_id}`, { quantity: newQty }, { withCredentials: true })
                          .then(() => setStock(st => st.map(it => it.stock_id === s.stock_id ? { ...it, quantity: newQty } : it)))
                          .catch(() => {});
                      }} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">
                        <FaMinus size={10} />
                      </button>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,width:40,textAlign:'center',color:s.quantity===0?'#ff007f':s.quantity<=2?'#ffd700':'#00f0ff'}}>
                        {s.quantity}
                      </div>
                      <button onClick={() => {
                        const newQty = s.quantity + 1;
                        axios.patch(`${API}/staff/my-stock/${s.stock_id}`, { quantity: newQty }, { withCredentials: true })
                          .then(() => setStock(st => st.map(it => it.stock_id === s.stock_id ? { ...it, quantity: newQty } : it)))
                          .catch(() => {});
                      }} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:border-[#39ff14] hover:text-[#39ff14] transition-all">
                        <FaPlus size={10} />
                      </button>
                    </div>

                    {/* Full edit button */}
                    <button onClick={() => setEditingStock(s)}
                      className="text-white/30 hover:text-[#00f0ff] transition-colors" title="Set exact quantity">
                      <FaEdit size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>{/* end main content */}

      {/* AI Staff Assistant Sidebar */}
      <StaffAIChat />

      </div>{/* end flex */}

      {/* Modals */}
      {showPersonal && <PersonalOrderModal products={products} onClose={() => setShowPersonal(false)} onSaved={loadData} />}
      {transferOrder && <TransferModal order={transferOrder} allStaff={allStaff} onClose={() => setTransferOrder(null)} onTransferred={loadData} />}
      {showAddStock && (
        <AddStockModal
          products={products}
          existingStock={stock}
          onClose={() => setShowAddStock(false)}
          onSaved={loadData}
        />
      )}
      {editingStock && (
        <StockModal
          stock={editingStock}
          onClose={() => setEditingStock(null)}
          onSaved={(id, qty) => {
            setStock(s => s.map(it => it.stock_id === id ? { ...it, quantity: qty } : it));
            setEditingStock(null);
          }}
        />
      )}
    </div>
    </div>
  );
};

// ── AI Chat Sidebar for Staff ──────────────────────────────────────────────
const StaffAIChat = () => {
  const [msgs, setMsgs] = useState([
    { role: 'assistant', content: 'Hi! I can help you with orders, products, stock questions. Ask me anything boss.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = React.useRef(null);
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        context: 'staff_dashboard',
      }, { withCredentials: true });
      setMsgs(m => [...m, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Sorry boss, AI is busy. Try again in a bit.' }]);
    } finally { setLoading(false); }
  };

  if (collapsed) return (
    <button onClick={() => setCollapsed(false)}
      style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#ff007f,#c8005a)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(255,0,127,0.4)',flexShrink:0,marginTop:4}}>
      <FaRobot size={18} />
    </button>
  );

  return (
    <div style={{width:300,flexShrink:0,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:24,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:600}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#ff007f,#c8005a)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <FaRobot size={15} />
          <div>
            <div style={{fontWeight:800,fontSize:13,letterSpacing:'0.04em'}}>AI ASSISTANT</div>
            <div style={{fontSize:10,opacity:0.8}}>Ask about products & orders</div>
          </div>
        </div>
        <button onClick={() => setCollapsed(true)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer'}}>
          <FaX size={13} />
        </button>
      </div>

      {/* Quick prompts */}
      <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:6,flexWrap:'wrap'}}>
        {['Low stock items?','Pending orders?','Best sellers?','Price of Hennessy?'].map(q => (
          <button key={q} onClick={() => { setInput(q); }}
            style={{fontSize:10,padding:'4px 10px',borderRadius:50,background:'rgba(255,0,127,0.08)',border:'1px solid rgba(255,0,127,0.2)',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontWeight:600}}>
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:10,minHeight:0}}>
        {msgs.map((m, i) => (
          <div key={i} style={{display:'flex',gap:8,flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start'}}>
            <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:m.role==='user'?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.08)',fontSize:10}}>
              {m.role==='user'?'U':<FaRobot size={11} style={{color:'#ff007f'}} />}
            </div>
            <div style={{maxWidth:'85%',padding:'9px 13px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.07)',fontSize:12,lineHeight:1.55,color:'#fff'}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:'flex',gap:8}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}><FaRobot size={11} style={{color:'#ff007f'}} /></div>
            <div style={{padding:'9px 13px',borderRadius:'16px 16px 16px 4px',background:'rgba(255,255,255,0.07)',display:'flex',gap:4,alignItems:'center'}}>
              {[0,0.2,0.4].map((d,i) => <div key={i} style={{width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,0.4)',animation:`pulse 1s ${d}s ease-in-out infinite`}} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:8}}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask lah boss..."
          style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:50,padding:'8px 14px',color:'#fff',fontSize:12,outline:'none'}}
          onFocus={e=>e.target.style.borderColor='rgba(255,0,127,0.5)'}
          onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
        <button onClick={send} disabled={loading||!input.trim()}
          style={{width:34,height:34,borderRadius:'50%',background:input.trim()?'linear-gradient(135deg,#ff007f,#c8005a)':'rgba(255,255,255,0.06)',border:'none',color:'#fff',cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <FaPaperPlane size={12} />
        </button>
      </div>
    </div>
  );
};

export default StaffDashboard;
