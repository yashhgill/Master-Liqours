import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import {
  FaUsers, FaBox, FaWhatsapp, FaCheck, FaSpinner, FaTruck,
  FaBoxOpen, FaTimes, FaPlus, FaEdit, FaRandom
} from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_FLOW = [
  { id: 'pending',          label: 'Pending',          icon: FaSpinner, color: '#ffd700' },
  { id: 'confirmed',        label: 'Confirmed',         icon: FaCheck,   color: '#00f0ff' },
  { id: 'preparing',        label: 'Preparing',         icon: FaBoxOpen, color: '#00f0ff' },
  { id: 'out_for_delivery', label: 'Out for Delivery',  icon: FaTruck,   color: '#39ff14' },
  { id: 'delivered',        label: 'Delivered',         icon: FaCheck,   color: '#39ff14' },
];

const nextStatus = (current) => {
  const idx = STATUS_FLOW.findIndex((s) => s.id === current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
};

// ─── Personal Order Modal ────────────────────────────────────────────────────
const PersonalOrderModal = ({ products, onClose, onSaved }) => {
  const [items, setItems] = useState([{ product_id: '', quantity: 1, price: '' }]);
  const [customer, setCustomer] = useState({ name: '', whatsapp: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { product_id: '', quantity: 1, price: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

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
    } catch (e) {
      alert(e.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display-md">Log Personal Order</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FaTimes /></button>
        </div>
        <p className="text-white/50 text-sm">Record a sale you received personally (WhatsApp, walk-in, etc).</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1">Customer Name <span className="text-[#ff007f]">*</span></label>
            <input className="input-dark" placeholder="e.g. Ahmad" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1">WhatsApp Number <span className="text-[#ff007f]">*</span></label>
            <input className="input-dark" placeholder="e.g. 0123456789" value={customer.whatsapp} onChange={e => setCustomer({ ...customer, whatsapp: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-1">Notes (optional)</label>
            <input className="input-dark" placeholder="e.g. Pickup at Melaka, paid cash" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">Items</label>
            <button onClick={addItem} className="text-[#39ff14] text-xs flex items-center gap-1 hover:underline"><FaPlus size={10} /> Add item</button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center">
                <select className="input-dark text-sm" value={it.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} — RM{p.price}</option>)}
                </select>
                <input type="number" min="1" className="input-dark text-sm text-center" placeholder="Qty" value={it.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" step="0.01" className="input-dark text-sm" placeholder="Price"
                  title="Leave blank to use product price" value={it.price}
                  onChange={e => updateItem(i, 'price', e.target.value)} />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-white/30 hover:text-[#ff007f]"><FaTimes size={12} /></button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-1">Price column: leave blank to use the product's listed price</p>
        </div>

        <button onClick={submit} disabled={saving} className="btn-pink w-full disabled:opacity-50">
          {saving ? 'Saving...' : 'Log Sale'}
        </button>
      </div>
    </div>
  );
};

// ─── Transfer Modal ──────────────────────────────────────────────────────────
const TransferModal = ({ order, allStaff, onClose, onTransferred }) => {
  const [targetId, setTargetId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!targetId) { alert('Select a staff to transfer to'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/staff/orders/${order.order_id}/transfer`,
        { target_staff_id: targetId },
        { withCredentials: true }
      );
      onTransferred();
      onClose();
    } catch (e) {
      alert(e.response?.data?.detail || 'Transfer failed');
    } finally { setSaving(false); }
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

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const StaffDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [showPersonal, setShowPersonal] = useState(false);
  const [transferOrder, setTransferOrder] = useState(null);
  const [tab, setTab] = useState('orders');

  const loadData = () => {
    axios.get(`${API}/staff/my-orders`, { withCredentials: true }).then(r => setOrders(r.data)).catch(() => {});
    axios.get(`${API}/staff/my-stock`, { withCredentials: true }).then(r => setStock(r.data)).catch(() => {});
    axios.get(`${API}/staff/info`, { withCredentials: true }).then(r => setAllStaff(r.data)).catch(() => {});
    axios.get(`${API}/products`, { withCredentials: true }).then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    const prev = orders;
    setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { withCredentials: true });
    } catch (e) {
      setOrders(prev);
      alert(e.response?.data?.detail || 'Update failed lah');
    } finally { setUpdating(null); }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel order ni?')) return;
    await updateStatus(orderId, 'cancelled');
  };

  const saveStockQty = async (stockItem) => {
    const qty = parseInt(stockQty);
    if (isNaN(qty) || qty < 0) { alert('Enter a valid quantity'); return; }
    try {
      await axios.patch(`${API}/staff/my-stock/${stockItem.stock_id}`, { quantity: qty }, { withCredentials: true });
      setStock(s => s.map(it => it.stock_id === stockItem.stock_id ? { ...it, quantity: qty } : it));
      setEditingStock(null);
    } catch (e) {
      alert(e.response?.data?.detail || 'Stock update failed');
    }
  };

  const visibleOrders = filter ? orders.filter(o => o.status === filter) : orders;
  const counts = STATUS_FLOW.reduce((acc, s) => ({ ...acc, [s.id]: orders.filter(o => o.status === s.id).length }), {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Staff Console</div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="display-xl mb-1">Hi <span className="neon-cyan-text">{user?.name}</span></h1>
          <p className="text-white/60">Manage your orders, stock & personal sales here boss.</p>
        </div>
        <button onClick={() => setShowPersonal(true)} className="btn-lime flex items-center gap-2">
          <FaPlus size={12} /> Log Personal Sale
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATUS_FLOW.slice(0, 4).map(s => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? '' : s.id)}
            className={`surface p-5 text-left transition-all ${filter === s.id ? 'ring-2' : ''}`}
            style={{ '--tw-ring-color': s.color, borderColor: filter === s.id ? `${s.color}66` : undefined }}>
            <div className="flex items-center justify-between mb-2">
              <div className="eyebrow !mb-0" style={{ color: s.color }}>{s.label}</div>
              <s.icon style={{ color: s.color }} />
            </div>
            <div className="display-lg" style={{ color: s.color, textShadow: `0 0 20px ${s.color}55` }}>{counts[s.id] || 0}</div>
          </button>
        ))}
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
              <button onClick={() => setFilter('')} className="text-[#ff007f] hover:underline">Clear</button>
            </div>
          )}
          {visibleOrders.length === 0 ? (
            <div className="text-white/40 text-sm py-8 text-center">No orders {filter && `in ${filter} state `}lah.</div>
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
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#ff007f20] text-[#ff007f]">Personal</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50">{new Date(o.created_at).toLocaleString()} · {(o.items || []).length} items</div>
                        {o.customer_name && <div className="text-xs text-white/60 mt-0.5">👤 {o.customer_name} · {o.customer_whatsapp}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${meta.color}20`, color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>
                    {o.shipping_address && (
                      <div className="text-xs text-white/40 mb-3 truncate">📍 {o.shipping_address}</div>
                    )}
                    {!isFinal && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {next && (
                          <button onClick={() => updateStatus(o.order_id, next.id)} disabled={isBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#39ff14] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                            <next.icon size={12} /> Advance to {next.label}
                          </button>
                        )}
                        <button onClick={() => setTransferOrder(o)} disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/70 hover:border-[#00f0ff] hover:text-[#00f0ff] text-xs uppercase tracking-wider font-bold transition-all">
                          <FaRandom size={12} /> Transfer
                        </button>
                        <button onClick={() => cancelOrder(o.order_id)} disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/70 hover:border-[#ff007f] hover:text-[#ff007f] text-xs uppercase tracking-wider font-bold transition-all">
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
          <h2 className="display-md mb-5">My Stock</h2>
          {stock.length === 0 ? (
            <div className="text-white/40 text-sm py-8 text-center">No stock assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {stock.map(s => (
                <div key={s.stock_id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{s.product_name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{s.category}</div>
                  </div>
                  {editingStock === s.stock_id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="number" min="0" className="input-dark w-20 text-center text-sm py-1.5"
                        value={stockQty} onChange={e => setStockQty(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveStockQty(s)} autoFocus />
                      <button onClick={() => saveStockQty(s)} className="text-[#39ff14] text-xs font-bold hover:underline">Save</button>
                      <button onClick={() => setEditingStock(null)} className="text-white/30 hover:text-white text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`font-display text-2xl ${s.quantity > 5 ? 'neon-lime-text' : s.quantity > 0 ? 'text-[#ffd700]' : 'text-[#ff007f]'}`}>
                        ×{s.quantity}
                      </div>
                      <button onClick={() => { setEditingStock(s.stock_id); setStockQty(String(s.quantity)); }}
                        className="text-white/30 hover:text-[#00f0ff] transition-colors" title="Update quantity">
                        <FaEdit size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showPersonal && (
        <PersonalOrderModal products={products} onClose={() => setShowPersonal(false)} onSaved={loadData} />
      )}
      {transferOrder && (
        <TransferModal order={transferOrder} allStaff={allStaff} onClose={() => setTransferOrder(null)} onTransferred={loadData} />
      )}
    </div>
  );
};

export default StaffDashboard;
