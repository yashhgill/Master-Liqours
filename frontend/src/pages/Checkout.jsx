import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, useCart } from '../context';
import { FaWhatsapp, FaArrowRight, FaTimes, FaShoppingBag, FaCheck } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WA_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '60182085097';
const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_FEE = 15;

const GlowInput = ({ label, textarea, ...props }) => (
  <div>
    <label style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.35em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
      display: 'block', marginBottom: 8,
    }}>{label}</label>
    {textarea ? (
      <textarea
        {...props}
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '14px 18px',
          color: '#fff', fontSize: 16, outline: 'none',
          transition: 'border-color 0.2s', resize: 'none',
          WebkitAppearance: 'none', fontFamily: 'inherit',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    ) : (
      <input
        {...props}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '14px 18px',
          color: '#fff', fontSize: 16, outline: 'none',
          transition: 'border-color 0.2s',
          WebkitAppearance: 'none',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    )}
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const [form, setForm] = useState({
    customer_name: user?.name || user?.full_name || '',
    phone: user?.phone || '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  // Redirect if cart is empty (and not showing confirmation)
  useEffect(() => {
    if (!order && (!cart || cart.length === 0)) navigate('/cart');
  }, [cart, order, navigate]);

  // Sync user details into form if user logs in mid-session
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        customer_name: f.customer_name || user.name || user.full_name || '',
        phone: f.phone || user.phone || '',
      }));
    }
  }, [user]);

  const subtotal = (cart || []).reduce((s, i) => s + (i.price || i.price_myr || 0) * i.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim() || !form.address.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post(`${API}/orders/checkout`, {
        customer_name: form.customer_name.trim(),
        customer_whatsapp: form.phone.trim(),   // API expects customer_whatsapp
        shipping_address: form.address.trim(),   // API expects shipping_address
        items: (cart || []).map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      }, { withCredentials: true });
      setOrder(data);
      if (clearCart) clearCart();
    } catch (err) {
      setError(err.response?.data?.detail || 'Order failed lah, try again boss.');
    } finally {
      setSubmitting(false);
    }
  };

  const buildWaMessage = (o) => {
    // Use items from API response if available, fallback to cart
    const itemSource = (o.items && o.items.length) ? o.items : (cart || []);
    const lines = itemSource
      .map(i => `• ${i.quantity}x ${i.product_name || i.name || i.product_id} — RM${((i.price || i.price_myr || 0) * i.quantity).toFixed(2)}`)
      .join('\n');
    return encodeURIComponent(
      `Hi Master Liquors! 🥃\n\n` +
      `*Order ID:* ${o.order_id || o.order_number || o.orderId || '—'}\n` +
      `*Name:* ${form.customer_name}\n` +
      `*WhatsApp:* ${form.phone}\n` +
      `*Address:* ${form.address}\n\n` +
      `*Items:*\n${lines}\n\n` +
      `*Total: RM${Number(o.total || total).toFixed(2)}*\n` +
      (form.notes ? `*Notes:* ${form.notes}\n` : '') +
      `\nPlease confirm my order. Thank you!`
    );
  };

  /* ── ORDER CONFIRMED SCREEN ── */
  if (order) {
    const waLink = `https://wa.me/${WA_NUMBER}?text=${buildWaMessage(order)}`;
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

          {/* Success ring */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(37,211,102,0.12)',
            border: '2px solid rgba(37,211,102,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(37,211,102,0.2)',
          }}>
            <FaCheck size={32} color="#25D366" />
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(37,211,102,0.7)', marginBottom: 10 }}>
            Order Received
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1, letterSpacing: '0.02em', marginBottom: 8 }}>
            ONE LAST<br /><span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.5)' }}>STEP LAH.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Order saved! Tap below to send it on WhatsApp — our team confirms and handles delivery personally.
          </p>

          <div style={{
            background: 'rgba(37,211,102,0.06)',
            border: '1px solid rgba(37,211,102,0.25)',
            borderRadius: 20, padding: '24px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(37,211,102,0.6)', marginBottom: 12 }}>
              Confirm on WhatsApp
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Tap below — WhatsApp opens with your order pre-filled. Send it and we'll get back within minutes.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#25D366', color: '#fff', borderRadius: 50,
                padding: '16px 28px', fontWeight: 800, fontSize: 15,
                textDecoration: 'none', letterSpacing: '0.05em',
                boxShadow: '0 0 30px rgba(37,211,102,0.3)',
              }}
            >
              <FaWhatsapp size={18} /> Open WhatsApp →
            </a>
          </div>

          <Link to="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  /* ── CHECKOUT FORM ── */
  return (
    <div style={{ minHeight: '100vh', background: '#030303' }}>

      {/* Page header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, #000 0%, #050505 100%)',
        padding: '64px 0',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,0,127,0.7)', marginBottom: 12 }}>
            Finalise Order
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 1, letterSpacing: '0.02em' }}>
            CHECK<span style={{ color: '#ff007f', textShadow: '0 0 40px rgba(255,0,127,0.5)' }}>OUT.</span>
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 24px' }}>
        <style>{`
          .ml-checkout-grid { display: grid; grid-template-columns: minmax(0,2fr) minmax(0,1fr); gap: 32px; align-items: start; }
          @media (max-width: 768px) { .ml-checkout-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div className="ml-checkout-grid">

          {/* Left — form */}
          <div>
            {error && (
              <div style={{
                background: 'rgba(255,0,127,0.08)', border: '1px solid rgba(255,0,127,0.3)',
                borderRadius: 14, padding: '14px 18px', color: '#ff007f', fontSize: 14, marginBottom: 24,
              }}>{error}</div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <GlowInput
                label="Full Name"
                name="customer_name"
                value={form.customer_name}
                onChange={change}
                required
                placeholder="Your name lah"
                autoComplete="name"
              />
              <GlowInput
                label="Phone (WhatsApp)"
                name="phone"
                value={form.phone}
                onChange={change}
                required
                placeholder="60xxxxxxxxx"
                autoComplete="tel"
                inputMode="tel"
                type="tel"
              />
              <GlowInput
                label="Delivery Address"
                name="address"
                value={form.address}
                onChange={change}
                required
                placeholder="Full delivery address..."
                autoComplete="street-address"
                textarea
              />
              <GlowInput
                label="Notes (Optional)"
                name="notes"
                value={form.notes}
                onChange={change}
                placeholder="Any special requests..."
                textarea
              />

              <button
                type="submit"
                disabled={submitting || !cart?.length}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: submitting ? 'rgba(255,0,127,0.5)' : 'linear-gradient(135deg,#ff007f,#c8005a)',
                  color: '#fff', border: 'none', borderRadius: 50,
                  padding: '18px 32px', fontWeight: 800, fontSize: 15,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: (submitting || !cart?.length) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 30px rgba(255,0,127,0.35)',
                  transition: 'all 0.3s', width: '100%', marginTop: 8,
                  opacity: !cart?.length ? 0.5 : 1,
                }}
              >
                {submitting ? 'Placing Order...' : <><span>Place Order & Open WhatsApp</span><FaArrowRight size={14} /></>}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                Our team will confirm your order on WhatsApp.
              </p>
            </form>
          </div>

          {/* Right — order summary */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '24px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              Order Summary
            </div>

            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
              {(cart || []).map((item) => (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Qty: {item.quantity}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ff007f', whiteSpace: 'nowrap' }}>
                    RM{((item.price || item.price_myr || 0) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                <span>Subtotal</span>
                <span>RM{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                <span>Delivery</span>
                <span style={deliveryFee === 0 ? { color: '#39ff14', fontWeight: 700 } : {}}>
                  {deliveryFee === 0 ? 'FREE' : `RM${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              {deliveryFee > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,215,0,0.6)', background: 'rgba(255,215,0,0.06)', borderRadius: 8, padding: '8px 12px' }}>
                  🚚 Add RM{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery!
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6,
              }}>
                <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#ff007f', letterSpacing: '0.02em', textShadow: '0 0 20px rgba(255,0,127,0.4)' }}>
                  RM{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Cart link */}
            <Link to="/cart" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)',
              textDecoration: 'none', transition: 'color 0.2s',
            }}>
              <FaShoppingBag size={11} /> Edit cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
