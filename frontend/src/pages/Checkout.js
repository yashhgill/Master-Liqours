import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, useCart } from '../context';
import { FaWhatsapp, FaCheckCircle, FaArrowRight, FaTrophy } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Checkout = () => {
  const { user } = useAuth();
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const benefits = (() => {
    if (user?.tier === 'platinum') return { shipping: 100, discount: total * 0.03 };
    if (user?.tier === 'gold') return { shipping: 50, discount: 0 };
    return { shipping: 0, discount: 0 };
  })();
  const finalTotal = total - benefits.discount;
  const shippingCost = Math.max(0, 15 - benefits.shipping);
  const grandTotal = finalTotal + shippingCost;

  const placeOrder = async () => {
    if (!address.trim()) { alert('Enter your delivery address lah boss'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/orders/checkout`, {
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: address,
      }, { withCredentials: true });
      setDone(res.data);
    } catch (e) {
      alert('Checkout failed: ' + (e.response?.data?.detail || 'Try again lah'));
    } finally { setLoading(false); }
  };

  if (done) {
    const phone = (done.staff_whatsapp || '+60126884925').replace(/\D/g, '');
    const staffName = done.staff_name || 'Staff';
    const msg = `Hi ${staffName}! Order #${done.order_id.slice(0, 8)} placed. Total RM${grandTotal.toFixed(2)}. Address: ${address}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="surface p-10 lg:p-14" style={{ borderColor: 'rgba(37,211,102,0.35)', boxShadow:'0 0 50px rgba(37,211,102,0.15)' }}>
          <FaCheckCircle size={56} className="text-[#39ff14] mx-auto mb-6" />
          <div className="eyebrow mb-3">Order Confirmed</div>
          <h1 className="display-xl mb-4">Settle via WhatsApp boss!</h1>
          <p className="text-white/60 mb-8">Order ID #{done.order_id.slice(0, 8).toUpperCase()}</p>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Total to Pay</div>
            <div className="display-mega neon-pink-text" style={{fontSize:'3.5rem',lineHeight:1}}>RM{grandTotal.toFixed(2)}</div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Your Assigned Staff</div>
              <div className="display-md neon-lime-text" data-testid="checkout-assigned-staff">{staffName}</div>
              <div className="text-sm text-white/50 mt-1">+{phone}</div>
            </div>
          </div>

          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full" data-testid="checkout-whatsapp-btn">
            <FaWhatsapp size={20} /> Open WhatsApp & Pay
          </a>

          <button onClick={() => { clearCart(); navigate(`/orders/${done.order_id}`); }} className="block mt-4 text-sm text-white/50 hover:text-[#ff007f] mx-auto" data-testid="checkout-done-btn">
            View order detail →
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="display-xl mb-4">Cart kosong lah</h1>
        <Link to="/products" className="btn-pink">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Step 2 of 2</div>
      <h1 className="display-xl mb-10"><span className="neon-pink-text">Checkout</span> · Settle</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="surface p-8">
          <h2 className="display-md mb-6">Delivery Address</h2>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter full address — block, street, postcode, city"
            rows={5}
            className="input-dark resize-none"
            required
            data-testid="checkout-address-input"
          />

          {user && (
            <div className="mt-6 p-5 bg-[#0a0a0a] rounded-2xl border border-white/10 flex items-center gap-4">
              <FaTrophy className="text-[#ffd700]" size={20} />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40">Your Tier</div>
                <div className="font-display text-xl uppercase">{user.tier} · {user.points}pts</div>
              </div>
              <div className="ml-auto text-right">
                {benefits.shipping > 0 && <div className="text-[#39ff14] text-xs font-bold">RM{benefits.shipping} off shipping</div>}
                {benefits.discount > 0 && <div className="text-[#39ff14] text-xs font-bold">3% product discount</div>}
              </div>
            </div>
          )}
        </div>

        <div className="surface p-6 h-fit sticky top-32">
          <div className="eyebrow mb-4">Summary</div>
          <h2 className="display-md mb-6">Order Recap</h2>

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
            {cart.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm">
                <span className="text-white/70 truncate pr-2">{i.name} ×{i.quantity}</span>
                <span className="font-bold shrink-0">RM{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 py-4 border-y border-white/10">
            <div className="flex justify-between text-sm"><span className="text-white/60">Subtotal</span><span>RM{total.toFixed(2)}</span></div>
            {benefits.discount > 0 && <div className="flex justify-between text-sm text-[#39ff14]"><span>Tier discount (3%)</span><span>-RM{benefits.discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Shipping</span>
              <span>
                {benefits.shipping > 0 && <span className="line-through text-white/30 mr-2 text-xs">RM15</span>}
                RM{shippingCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-baseline mt-4 mb-6">
            <span className="text-xs uppercase tracking-wider text-white/50">Total</span>
            <span className="display-lg neon-pink-text">RM{grandTotal.toFixed(2)}</span>
          </div>

          <button onClick={placeOrder} disabled={loading} className="btn-pink w-full disabled:opacity-50" data-testid="checkout-place-order-btn">
            {loading ? 'Processing...' : <>Place Order <FaArrowRight size={14} /></>}
          </button>
          <p className="text-xs text-white/40 text-center mt-3">Payment settled via WhatsApp after order placed</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
