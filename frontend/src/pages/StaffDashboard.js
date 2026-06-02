import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaUsers, FaBox, FaWhatsapp, FaCheck, FaSpinner, FaTruck, FaBoxOpen, FaTimes } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_FLOW = [
  { id: 'pending', label: 'Pending', icon: FaSpinner, color: '#ffd700' },
  { id: 'confirmed', label: 'Confirmed', icon: FaCheck, color: '#00f0ff' },
  { id: 'preparing', label: 'Preparing', icon: FaBoxOpen, color: '#00f0ff' },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: FaTruck, color: '#39ff14' },
  { id: 'delivered', label: 'Delivered', icon: FaCheck, color: '#39ff14' },
];

const nextStatus = (current) => {
  const idx = STATUS_FLOW.findIndex((s) => s.id === current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
};

const StaffDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    axios.get(`${API}/staff/my-orders`, { withCredentials: true }).then((r) => setOrders(r.data)).catch(() => {});
    axios.get(`${API}/staff/my-stock`, { withCredentials: true }).then((r) => setStock(r.data)).catch(() => {});
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    // Optimistic update
    const prev = orders;
    setOrders((os) => os.map((o) => o.order_id === orderId ? { ...o, status: newStatus } : o));
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { withCredentials: true });
    } catch (e) {
      setOrders(prev); // Rollback
      alert(e.response?.data?.detail || 'Update failed lah');
    } finally {
      setUpdating(null);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel order ni?')) return;
    await updateStatus(orderId, 'cancelled');
  };

  const visibleOrders = filter ? orders.filter((o) => o.status === filter) : orders;
  const counts = STATUS_FLOW.reduce((acc, s) => ({ ...acc, [s.id]: orders.filter((o) => o.status === s.id).length }), {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Staff Console</div>
      <h1 className="display-xl mb-2">Hi <span className="neon-cyan-text">{user?.name}</span></h1>
      <p className="text-white/60 mb-10">Manage your orders & stock here boss.</p>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATUS_FLOW.slice(0, 4).map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(filter === s.id ? '' : s.id)}
            className={`surface p-5 text-left transition-all ${filter === s.id ? 'ring-2' : ''}`}
            style={{ '--tw-ring-color': s.color, borderColor: filter === s.id ? `${s.color}66` : undefined }}
            data-testid={`staff-filter-${s.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="eyebrow !mb-0" style={{ color: s.color }}>{s.label}</div>
              <s.icon style={{ color: s.color }} />
            </div>
            <div className="display-lg" style={{ color: s.color, textShadow: `0 0 20px ${s.color}55` }}>{counts[s.id] || 0}</div>
          </button>
        ))}
      </div>

      {filter && (
        <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
          Filter: <span className="font-bold text-white">{STATUS_FLOW.find((s) => s.id === filter)?.label}</span>
          <button onClick={() => setFilter('')} className="text-[#ff007f] hover:underline">Clear</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Orders */}
        <div className="surface p-6">
          <h2 className="display-md mb-5">Orders ({visibleOrders.length})</h2>
          {visibleOrders.length === 0 ? (
            <div className="text-white/40 text-sm py-8 text-center">No orders {filter && `in ${filter} state `}lah.</div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((o) => {
                const meta = STATUS_FLOW.find((s) => s.id === o.status) || { label: o.status, color: '#888' };
                const next = nextStatus(o.status);
                const isBusy = updating === o.order_id;
                const isFinal = o.status === 'delivered' || o.status === 'cancelled';
                return (
                  <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4" data-testid={`staff-order-${o.order_id}`}>
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                      <div>
                        <div className="font-bold">#{o.order_id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-xs text-white/50">{new Date(o.created_at).toLocaleString()} · {(o.items || []).length} items</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                        <span
                          className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${meta.color}20`, color: meta.color }}
                          data-testid={`staff-order-status-${o.order_id}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    {o.shipping_address && (
                      <div className="text-xs text-white/40 mb-3 truncate">📍 {o.shipping_address}</div>
                    )}
                    {!isFinal && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {next && (
                          <button
                            onClick={() => updateStatus(o.order_id, next.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#39ff14] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50"
                            data-testid={`staff-advance-${o.order_id}`}
                          >
                            <next.icon size={12} /> Advance to {next.label}
                          </button>
                        )}
                        <button
                          onClick={() => cancelOrder(o.order_id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/70 hover:border-[#ff007f] hover:text-[#ff007f] text-xs uppercase tracking-wider font-bold transition-all"
                          data-testid={`staff-cancel-${o.order_id}`}
                        >
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

        {/* Stock + WhatsApp side */}
        <div className="space-y-4">
          <div className="surface p-5">
            <div className="eyebrow mb-3">Quick Action</div>
            <a href={`https://wa.me/${(user?.phone || '60126884925').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full">
              <FaWhatsapp size={16} /> My WhatsApp
            </a>
          </div>

          <div className="surface p-5">
            <h3 className="display-md mb-4">My Stock</h3>
            {stock.length === 0 ? (
              <div className="text-white/40 text-sm">No stock assigned.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {stock.map((s, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{s.product_name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">{s.category}</div>
                    </div>
                    <div className={`font-display text-lg shrink-0 ml-2 ${s.quantity > 5 ? 'neon-lime-text' : 'text-[#ff007f]'}`}>×{s.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
