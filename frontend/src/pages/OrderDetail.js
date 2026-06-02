import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowLeft, FaWhatsapp, FaCheckCircle, FaClock, FaTimesCircle,
  FaBox, FaUser, FaMapMarkerAlt,
} from 'react-icons/fa';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusMeta = {
  pending: { color: '#ffd700', icon: FaClock, label: 'Pending Payment' },
  paid: { color: '#00f0ff', icon: FaCheckCircle, label: 'Paid' },
  processing: { color: '#00f0ff', icon: FaClock, label: 'Processing' },
  shipped: { color: '#39ff14', icon: FaBox, label: 'Out for Delivery' },
  delivered: { color: '#39ff14', icon: FaCheckCircle, label: 'Delivered' },
  cancelled: { color: '#ff007f', icon: FaTimesCircle, label: 'Cancelled' },
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Order tak jumpa boss');
    } finally { setLoading(false); }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-white/60">Loading...</div>;
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="display-lg mb-3">{error}</div>
      <Link to="/dashboard" className="btn-pink">Back to Dashboard</Link>
    </div>
  );

  const status = statusMeta[order.status] || statusMeta.pending;
  const StatusIcon = status.icon;
  const phone = (order.staff_whatsapp || '+60126884925').replace(/\D/g, '');
  const staffName = order.staff_name || 'Staff';
  const msg = `Hi ${staffName}! Re-checking order #${order.order_id.slice(0, 8).toUpperCase()} — total RM${order.total.toFixed(2)}.`;
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/60 hover:text-[#ff007f] mb-8 transition-colors" data-testid="order-back-btn">
        <FaArrowLeft size={14} /> Back
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Order Detail</div>
          <h1 className="display-xl">#<span className="neon-pink-text">{order.order_id.slice(0, 8).toUpperCase()}</span></h1>
          <div className="text-white/50 text-sm mt-2">Placed {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor: `${status.color}66`, color: status.color, background: `${status.color}10` }} data-testid="order-status-badge">
          <StatusIcon size={14} />
          <span className="text-xs uppercase tracking-[0.2em] font-bold">{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          {/* Items */}
          <div className="surface p-6">
            <h2 className="display-md mb-5 flex items-center gap-2"><FaBox className="text-[#ffd700]" size={18} /> Items</h2>
            <div className="space-y-3">
              {(order.items || []).map((it, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-wider text-white/40">Product</div>
                    <div className="font-bold truncate">{it.product_id?.slice(0, 8)}</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-xs uppercase tracking-wider text-white/40">Qty</div>
                    <div className="font-display text-xl">×{it.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-white/40">Subtotal</div>
                    <div className="font-display text-xl neon-pink-text">RM{(it.price * it.quantity).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery */}
          <div className="surface p-6">
            <h2 className="display-md mb-5 flex items-center gap-2"><FaMapMarkerAlt className="text-[#39ff14]" size={18} /> Delivery Address</h2>
            <div className="text-white/80 leading-relaxed whitespace-pre-line" data-testid="order-address">{order.shipping_address}</div>
          </div>

          {/* Assigned Staff */}
          {order.staff_name && (
            <div className="surface p-6">
              <h2 className="display-md mb-5 flex items-center gap-2"><FaUser className="text-[#00f0ff]" size={18} /> Assigned Staff</h2>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40">Handling Your Order</div>
                  <div className="display-md neon-cyan-text" data-testid="order-staff-name">{order.staff_name}</div>
                  <div className="text-sm text-white/50 mt-1">{order.staff_whatsapp}</div>
                </div>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" data-testid="order-resend-whatsapp-btn">
                  <FaWhatsapp size={18} /> Re-send WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="surface p-6 h-fit lg:sticky lg:top-32">
          <div className="eyebrow mb-4">Summary</div>
          <h2 className="display-md mb-6">Recap</h2>

          <div className="space-y-2 py-3 border-y border-white/10 mb-4">
            <div className="flex justify-between text-sm"><span className="text-white/60">Items</span><span>{(order.items || []).length}</span></div>
            {order.discount_applied > 0 && (
              <div className="flex justify-between text-sm text-[#39ff14]"><span>Tier discount</span><span>-RM{order.discount_applied.toFixed(2)}</span></div>
            )}
            {order.shipping_discount > 0 && (
              <div className="flex justify-between text-sm text-[#39ff14]"><span>Shipping off</span><span>-RM{order.shipping_discount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-sm"><span className="text-white/60">Points Earned</span><span className="text-[#ffd700] font-bold">+{order.points_earned}</span></div>
          </div>

          <div className="flex justify-between items-baseline mb-6">
            <span className="text-xs uppercase tracking-wider text-white/50">Total</span>
            <span className="display-lg neon-pink-text" data-testid="order-total">RM{order.total.toFixed(2)}</span>
          </div>

          {order.status === 'pending' && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full mb-3">
              <FaWhatsapp size={18} /> Settle Payment
            </a>
          )}
          <Link to={user?.role === 'customer' ? '/dashboard' : '/'} className="btn-ghost w-full">Back to {user?.role === 'customer' ? 'Dashboard' : 'Home'}</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
