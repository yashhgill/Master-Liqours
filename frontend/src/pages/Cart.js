import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart, useAuth } from '../context';
import { FaTrash, FaPlus, FaMinus, FaArrowRight, FaShoppingBag } from 'react-icons/fa';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (user && ['staff', 'super_admin', 'master_admin'].includes(user.role)) {
      navigate(user.role === 'staff' ? '/staff' : '/admin');
    }
  }, [user, navigate]);

  if (cart.length === 0) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.2 }}>🛒</div>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, letterSpacing: '0.02em', marginBottom: 12 }}>Cart Kosong Lah Boss</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.7 }}>Browse our premium drops & add a few bottles to start.</p>
      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', padding: '16px 32px', borderRadius: 50, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 0 28px rgba(255,0,127,0.35)' }}>
        Browse Products <FaArrowRight size={13} />
      </Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 1, background: '#ffd700', display: 'inline-block' }} /> Step 1 of 2
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(40px,6vw,64px)', letterSpacing: '0.02em', lineHeight: 1 }}>
            Your <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.4)' }}>Cart</span>
          </h1>
        </div>
        <button onClick={() => { if (window.confirm('Clear entire cart?')) clearCart(); }}
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}
          className="hover:text-[#ff007f] transition-colors">
          Clear Cart
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cart.map(item => (
            <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '16px 20px' }}
              data-testid={`cart-item-${item.product_id}`}>
              <img src={item.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'}
                alt={item.name} style={{ width: 88, height: 88, borderRadius: 16, objectFit: 'cover', background: '#111', flexShrink: 0 }}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'; }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{item.category}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: '0.02em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ff007f' }}>RM{item.price.toFixed(2)}</div>
              </div>
              {/* Qty controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 50, padding: '4px 6px', flexShrink: 0 }}>
                <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaMinus size={10} />
                </button>
                <div style={{ fontWeight: 800, width: 28, textAlign: 'center', fontSize: 16 }}>{item.quantity}</div>
                <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaPlus size={10} />
                </button>
              </div>
              {/* Subtotal */}
              <div style={{ textAlign: 'right', minWidth: 80, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Subtotal</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#fff' }}>RM{(item.price * item.quantity).toFixed(2)}</div>
              </div>
              <button onClick={() => removeFromCart(item.product_id)}
                style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                className="hover:border-[#ff007f] hover:text-[#ff007f] transition-all"
                data-testid={`cart-remove-${item.product_id}`}>
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 28, position: 'sticky', top: 90, height: 'fit-content' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Order Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            <span>Subtotal ({cart.reduce((s,i) => s+i.quantity,0)} items)</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>RM{total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            <span>Shipping</span>
            <span>{total >= 1250 ? <span style={{ color: '#39ff14', fontWeight: 700 }}>FREE</span> : 'At checkout'}</span>
          </div>
          {total < 1250 && (
            <div style={{ background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.15)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'rgba(57,255,20,0.7)', marginBottom: 20 }}>
              Add RM{(1250 - total).toFixed(2)} more for free delivery boss
            </div>
          )}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Total</span>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: '#ff007f', textShadow: '0 0 20px rgba(255,0,127,0.3)' }}>RM{total.toFixed(2)}</span>
          </div>
          <button onClick={() => navigate('/checkout')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '17px 28px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 28px rgba(255,0,127,0.35)', marginBottom: 12 }}
            data-testid="cart-checkout-btn">
            Checkout <FaArrowRight size={13} />
          </button>
          <Link to="/products" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            className="hover:text-white transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
