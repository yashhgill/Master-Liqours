import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, useCart } from '../context';
import { FaWhatsapp, FaCheckCircle, FaArrowRight, FaTrophy } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Defined at module scope (NOT inside Checkout) so it keeps a stable identity
// across re-renders. Declaring it inside the component re-created it on every
// keystroke, which made React remount the input and lose focus each character.
const Field = ({ label, type = 'text', value, placeholder, onChange, error, rows }) => (
  <div>
    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">{label} <span className="text-[#ff007f]">*</span></label>
    {rows ? (
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className={`input-dark resize-none ${error ? 'border-[#ff007f]' : ''}`} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={`input-dark ${error ? 'border-[#ff007f]' : ''}`} />
    )}
    {error && <p className="text-[#ff007f] text-xs mt-1">{error}</p>}
  </div>
);

const Checkout = () => {
  const { user } = useAuth();
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState({});

  const benefits = (() => {
    if (user?.tier === 'platinum') return { discount: total * 0.03 };
    return { discount: 0 };
  })();
  const finalTotal = total - benefits.discount;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp number is required';
    else if (!/^(\+?6?01)[0-9]{8,9}$/.test(form.whatsapp.replace(/\s/g, '')))
      e.whatsapp = 'Enter a valid MY number e.g. 0123456789';
    if (!form.address.trim()) e.address = 'Delivery address is required';
    return e;
  };

  const placeOrder = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await axios.post(`${API}/orders/checkout`, {
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name: form.name.trim(),
        customer_whatsapp: form.whatsapp.trim(),
        shipping_address: form.address.trim(),
      }, { withCredentials: true });
      setDone(res.data);
    } catch (err) {
      alert('Checkout failed: ' + (err.response?.data?.detail || 'Try again lah'));
    } finally { setLoading(false); }
  };

  if (done) {
    const phone = (done.staff_whatsapp || '+60126884925').replace(/\D/g, '');
    const staffName = done.staff_name || 'Staff';
    const itemsList = (done.items || []).map(i => `• ${i.quantity}x item (RM${Number(i.price).toFixed(2)})`).join('\n');
    const msg =
      `Hi ${staffName}! New order from *${form.name}*\n` +
      `Order ID: #${done.order_id.slice(0, 8).toUpperCase()}\n` +
      `Total: RM${finalTotal.toFixed(2)}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Address: ${form.address}\n` +
      `Customer WA: ${form.whatsapp}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="surface p-10 lg:p-14" style={{ borderColor: 'rgba(37,211,102,0.35)', boxShadow: '0 0 50px rgba(37,211,102,0.15)' }}>
          <FaCheckCircle size={56} className="text-[#39ff14] mx-auto mb-6" />
          <div className="eyebrow mb-3">Order Confirmed</div>
          <h1 className="display-xl mb-4">Settle via WhatsApp boss!</h1>
          <p className="text-white/60 mb-2">Order ID #{done.order_id.slice(0, 8).toUpperCase()}</p>
          <p className="text-white/40 text-sm mb-8">Shipping cost will be discussed with your staff.</p>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">Customer</div>
              <div className="font-bold">{form.name}</div>
              <div className="text-sm text-white/50">{form.whatsapp}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">Address</div>
              <div className="text-sm text-white/70">{form.address}</div>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">Product Total</div>
              <div className="display-lg neon-pink-text">RM{finalTotal.toFixed(2)}</div>
              <div className="text-xs text-white/40 mt-1">+ shipping (to be confirmed with staff)</div>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">Your Assigned Staff</div>
              <div className="font-display text-xl neon-lime-text">{staffName}</div>
            </div>
          </div>

          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full" data-testid="checkout-whatsapp-btn">
            <FaWhatsapp size={20} /> Open WhatsApp & Confirm Order
          </a>
          <button onClick={() => { clearCart(); navigate(`/orders/${done.order_id}`); }} className="block mt-4 text-sm text-white/50 hover:text-[#ff007f] mx-auto">
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
        <div className="surface p-8 space-y-5">
          <h2 className="display-md mb-2">Your Details</h2>
          <Field label="Full Name" value={form.name} placeholder="e.g. Tan Wei Ming"
            onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Field label="WhatsApp Number" type="tel" value={form.whatsapp} placeholder="e.g. 0123456789"
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} error={errors.whatsapp} />
          <Field label="Delivery Address" value={form.address} rows={4}
            placeholder="Block, street, postcode, city"
            onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} />

          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-xs text-white/40 flex items-start gap-2">
            <FaWhatsapp className="text-[#25d366] shrink-0 mt-0.5" size={14} />
            Shipping cost will be discussed with your assigned staff over WhatsApp after you place the order.
          </div>

          {user && (
            <div className="mt-2 p-5 bg-[#0a0a0a] rounded-2xl border border-white/10 flex items-center gap-4">
              <FaTrophy className="text-[#ffd700]" size={20} />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40">Your Tier</div>
                <div className="font-display text-xl uppercase">{user.tier} · {user.points}pts</div>
              </div>
              {benefits.discount > 0 && (
                <div className="ml-auto text-right">
                  <div className="text-[#39ff14] text-xs font-bold">3% Platinum discount applied</div>
                </div>
              )}
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
            {benefits.discount > 0 && <div className="flex justify-between text-sm text-[#39ff14]"><span>Platinum discount (3%)</span><span>-RM{benefits.discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Shipping</span>
              <span className="text-white/40 text-xs">TBD with staff</span>
            </div>
          </div>

          <div className="flex justify-between items-baseline mt-4 mb-6">
            <span className="text-xs uppercase tracking-wider text-white/50">Products Total</span>
            <span className="display-lg neon-pink-text">RM{finalTotal.toFixed(2)}</span>
          </div>

          <button onClick={placeOrder} disabled={loading} className="btn-pink w-full disabled:opacity-50" data-testid="checkout-place-order-btn">
            {loading ? 'Processing...' : <>Place Order <FaArrowRight size={14} /></>}
          </button>
          <p className="text-xs text-white/40 text-center mt-3">Payment + shipping settled via WhatsApp</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
