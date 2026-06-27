import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaWhatsapp, FaCheckCircle, FaClock, FaTimesCircle, FaBox, FaUser, FaMapMarkerAlt, FaPhone, FaTruck, FaBoxOpen, FaStar } from 'react-icons/fa';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STEPS = [
  { key: 'pending',          label: 'Pending',          icon: FaClock },
  { key: 'confirmed',        label: 'Confirmed',        icon: FaCheckCircle },
  { key: 'preparing',        label: 'Preparing',        icon: FaBoxOpen },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: FaTruck },
  { key: 'delivered',        label: 'Delivered',        icon: FaCheckCircle },
];

const statusMeta = {
  pending:          { color: '#ffd700', label: 'Pending' },
  confirmed:        { color: '#00f0ff', label: 'Confirmed' },
  preparing:        { color: '#00f0ff', label: 'Preparing' },
  out_for_delivery: { color: '#39ff14', label: 'Out for Delivery' },
  delivered:        { color: '#39ff14', label: 'Delivered' },
  cancelled:        { color: '#ff007f', label: 'Cancelled' },
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState({ rating: 0, comment: '' });
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
    } catch (e) { setError(e.response?.data?.detail || 'Order tak jumpa boss'); }
    finally { setLoading(false); }
  };

  const submitReview = async () => {
    if (!review.rating) { alert('Please select a rating'); return; }
    setReviewLoading(true);
    try {
      await axios.post(API + '/reviews/', { order_id: id, rating: review.rating, comment: review.comment }, { withCredentials: true });
      setReviewSent(true);
    } catch (e) { alert(e.response?.data?.detail || 'Failed to submit review'); }
    finally { setReviewLoading(false); }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-white/60">Loading...</div>;
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="display-lg mb-3">{error}</div>
      <Link to="/dashboard" className="btn-pink">Back to Dashboard</Link>
    </div>
  );

  const meta = statusMeta[order.status] || statusMeta.pending;
  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';
  const phone = (order.staff_whatsapp || '60126884925').replace(/\D/g, '');
  const staffName = order.staff_name || 'Staff';
  const itemsList = (order.items || []).map(it => `${it.quantity}x ${it.product_name || 'Item'}`).join(', ');
  const waMsg = `Hi ${staffName}! Re order #${order.order_id.slice(0,8).toUpperCase()} (${itemsList}) — total RM${order.total.toFixed(2)}.`;
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/60 hover:text-[#ff007f] mb-8 transition-colors">
        <FaArrowLeft size={14} /> Back
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.4em",textTransform:"uppercase",color:"rgba(255,215,0,0.7)",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:20,height:1,background:"#ffd700",display:"inline-block"}} /> Order Detail
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(36px,5vw,64px)",letterSpacing:"0.02em",lineHeight:1}}>
            #<span style={{color:"#ff007f",textShadow:"0 0 30px rgba(255,0,127,0.4)"}}>{order.order_id.slice(0,8).toUpperCase()}</span>
          </h1>
          <div className="text-white/50 text-sm mt-2">Placed {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{ borderColor: `${meta.color}66`, color: meta.color, background: `${meta.color}10` }}>
          <span className="text-xs uppercase tracking-[0.2em] font-bold">{meta.label}</span>
        </div>
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <div className="surface p-6 mb-6">
          <div className="eyebrow mb-5">Order Progress</div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
            {STATUS_STEPS.map((step, i) => {
              const done = currentStep >= i;
              const active = currentStep === i;
              const Icon = step.icon;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? 'bg-[#39ff14]' : 'bg-white/5 border border-white/10'} ${active ? 'ring-2 ring-[#39ff14] ring-offset-2 ring-offset-[#111]' : ''}`}>
                      <Icon size={14} className={done ? 'text-black' : 'text-white/30'} />
                    </div>
                    <div className={`text-[10px] uppercase tracking-wider font-bold whitespace-nowrap ${done ? 'text-white' : 'text-white/30'}`}>{step.label}</div>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 min-w-[16px] rounded-full transition-all ${currentStep > i ? 'bg-[#39ff14]' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">

          {/* Customer info */}
          {(order.customer_name || order.customer_whatsapp) && (
            <div className="surface p-6">
              <h2 className="display-md mb-5 flex items-center gap-2"><FaUser className="text-[#00f0ff]" size={18} /> Customer Details</h2>
              <div className="space-y-3">
                {order.customer_name && (
                  <div className="flex items-center gap-3">
                    <FaUser size={12} className="text-white/40" />
                    <span className="text-white font-bold">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_whatsapp && (
                  <div className="flex items-center gap-3">
                    <FaPhone size={12} className="text-white/40" />
                    <a href={`https://wa.me/${order.customer_whatsapp.replace(/\D/g,'')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[#25d366] hover:underline font-bold">
                      {order.customer_whatsapp}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="surface p-6">
            <h2 className="display-md mb-5 flex items-center gap-2"><FaBox className="text-[#ffd700]" size={18} /> Items ({(order.items || []).length})</h2>
            <div className="space-y-3">
              {(order.items || []).map((it, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base">{it.product_name || 'Unknown Product'}</div>
                    <div className="text-xs text-white/40 mt-0.5">RM{Number(it.price).toFixed(2)} each</div>
                  </div>
                  <div className="text-center px-4 shrink-0">
                    <div className="text-xs text-white/40">Qty</div>
                    <div className="font-display text-xl">×{it.quantity}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-white/40">Subtotal</div>
                    <div className="font-display text-xl neon-pink-text">RM{(it.price * it.quantity).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div className="surface p-6">
            <h2 className="display-md mb-5 flex items-center gap-2"><FaMapMarkerAlt className="text-[#39ff14]" size={18} /> Delivery Address</h2>
            <div className="text-white/80 leading-relaxed whitespace-pre-line">{order.shipping_address}</div>
          </div>

          {/* Review prompt - shown when delivered and not yet reviewed */}
        {order.status === 'delivered' && !reviewSent && (
          <div className="surface p-6">
            <div className="eyebrow mb-2">Rate Your Experience</div>
            <h2 className="display-md mb-2">Leave a Review</h2>
            <p className="text-white/50 text-sm mb-5">How was your order boss? Your feedback helps others.</p>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setReview(r => ({...r, rating: s}))}
                  className={`transition-all hover:scale-110 ${s <= review.rating ? 'text-[#ffd700]' : 'text-white/20'}`}><FaStar size={24}/></button>
              ))}
            </div>
            <textarea rows={3} className="input-dark resize-none mb-4"
              placeholder="Tell us about your experience (optional)..."
              value={review.comment}
              onChange={e => setReview(r => ({...r, comment: e.target.value}))} />
            <button onClick={submitReview} disabled={reviewLoading || !review.rating}
              className="btn-pink disabled:opacity-50">
              {reviewLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
        {reviewSent && (
          <div className="surface p-6 text-center">
            <FaStar size={40} className="text-[#ffd700] mx-auto mb-3" style={{display:"block"}} />
            <div className="display-md text-[#ffd700]">Thanks for the review boss!</div>
          </div>
        )}

        {/* Assigned staff */}
          {order.staff_name && (
            <div className="surface p-6">
              <h2 className="display-md mb-5 flex items-center gap-2"><FaUser className="text-[#00f0ff]" size={18} /> Assigned Staff</h2>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Handling Your Order</div>
                  <div className="display-md neon-cyan-text">{order.staff_name}</div>
                  {order.staff_whatsapp && <div className="text-sm text-white/50 mt-1">{order.staff_whatsapp}</div>}
                </div>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                  <FaWhatsapp size={18} /> Contact Staff
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
            <div className="flex justify-between text-sm"><span className="text-white/60">Items</span><span>{(order.items||[]).length}</span></div>
            {order.discount_applied > 0 && <div className="flex justify-between text-sm text-[#39ff14]"><span>Tier discount</span><span>-RM{Number(order.discount_applied).toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-white/60">Shipping</span><span className="text-white/40 text-xs">Agreed with staff</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/60">Points Earned</span><span className="text-[#ffd700] font-bold">+{order.points_earned}</span></div>
          </div>
          <div className="flex justify-between items-baseline mb-6">
            <span className="text-xs uppercase tracking-wider text-white/50">Products Total</span>
            <span className="display-lg neon-pink-text">RM{Number(order.total).toFixed(2)}</span>
          </div>
          {order.status === 'pending' && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full mb-3">
              <FaWhatsapp size={18} /> Settle Payment
            </a>
          )}
          <Link to={user?.role === 'customer' ? '/dashboard' : '/'} className="btn-ghost w-full">
            Back to {user?.role === 'customer' ? 'Dashboard' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
