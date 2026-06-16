import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import {
  FaCheck, FaSpinner, FaTruck, FaBoxOpen, FaTimes, FaPlus,
  FaMinus, FaEdit, FaRandom, FaWhatsapp, FaBox
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
          {[['name','Customer Name','e.g. Ahmad'],['whatsapp','WhatsApp Number','e.g. 0123456789'],['notes','Notes (optional)','e.g. Paid cash, pickup at Melaka']].map(([key, label, ph]) => (
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
                <select className="input-dark text-sm" value={it.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} — RM{p.price}</option>)}
                </select>
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
              <select className="input-dark" value={productId} onChange={e => setProductId(e.target.value)}>
                <option value="">Select product</option>
                {available.map(p => <option key={p.product_id} value={p.product_id}>{p.name} — RM{p.price}</option>)}
              </select>
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
            <button onClick={submit} disabled={saving} className="btn-pink w-full disabled:opacity-50">
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

  useEffect(() => { loadData(); }, []);

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

  const visibleOrders = filter ? orders.filter(o => o.status === filter) : orders;
  const counts = STATUS_FLOW.reduce((acc, s) => ({ ...acc, [s.id]: orders.filter(o => o.status === s.id).length }), {});

  const totalStockItems = stock.reduce((sum, s) => sum + s.quantity, 0);
  const lowStockItems = stock.filter(s => s.quantity <= 2 && s.quantity > 0).length;
  const oosItems = stock.filter(s => s.quantity === 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">{isAdmin ? 'Admin Console' : 'Staff Console'}</div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="display-xl mb-1">Hi <span className="neon-cyan-text">{user?.name}</span> 👋</h1>
          <p className="text-white/60">Manage orders, stock & personal sales here boss.</p>
        </div>
        <button onClick={() => setShowPersonal(true)} className="btn-lime flex items-center gap-2">
          <FaPlus size={12} /> Log Personal Sale
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATUS_FLOW.slice(0, 3).map(s => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? '' : s.id)}
            className={`surface p-5 text-left transition-all ${filter === s.id ? 'ring-2' : ''}`}
            style={{ '--tw-ring-color': s.color, borderColor: filter === s.id ? `${s.color}55` : undefined }}>
            <div className="eyebrow !mb-1" style={{ color: s.color }}>{s.label}</div>
            <div className="display-lg" style={{ color: s.color }}>{counts[s.id] || 0}</div>
          </button>
        ))}
        <div className="surface p-5">
          <div className="eyebrow !mb-1 text-[#00f0ff]">Stock</div>
          <div className="display-lg text-[#00f0ff]">{totalStockItems}</div>
          {(lowStockItems > 0 || oosItems > 0) && (
            <div className="text-[10px] mt-1 space-y-0.5">
              {oosItems > 0 && <div className="text-[#ff007f]">⚠ {oosItems} out of stock</div>}
              {lowStockItems > 0 && <div className="text-[#ffd700]">⚠ {lowStockItems} running low</div>}
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {['orders', 'stock'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? 'bg-[#ff007f] text-white' : 'border border-white/15 text-white/50 hover:border-white/30'}`}>
            {t === 'orders' ? `Orders (${visibleOrders.length})` : `My Stock (${stock.length})`}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div className="surface p-6">
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
                  <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4">
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

                        {o.customer_name && <div className="text-xs text-white/60 mt-1">👤 {o.customer_name} · {o.customer_whatsapp}</div>}
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
                        <div className="font-display text-2xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${meta.color}20`, color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>
                    {o.shipping_address && <div className="text-xs text-white/30 mb-3 truncate">📍 {o.shipping_address}</div>}
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
              <h2 className="display-md">My Stock</h2>
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
                      <div className={`font-display text-2xl w-10 text-center ${s.quantity === 0 ? 'text-[#ff007f]' : s.quantity <= 2 ? 'text-[#ffd700]' : 'neon-cyan-text'}`}>
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
  );
};

export default StaffDashboard;
