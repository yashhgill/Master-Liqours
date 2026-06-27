import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart, useAuth } from '../context';
import { useEffect } from 'react';
import { FaTrash, FaPlus, FaMinus, FaArrowRight, FaShoppingBag } from 'react-icons/fa';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { user } = useAuth();

  // Staff and admins don't shop — redirect to their dashboard
  useEffect(() => {
    if (user && ['staff', 'super_admin', 'master_admin'].includes(user.role)) {
      navigate(user.role === 'staff' ? '/staff' : '/admin');
    }
  }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <FaShoppingBag size={48} className="text-white/30 mx-auto mb-6" />
        <h1 className="display-xl mb-4">Cart kosong lah boss</h1>
        <p className="text-white/60 mb-8">Browse our premium drops & add a few bottles untuk start.</p>
        <Link to="/products" className="btn-pink" data-testid="cart-empty-shop-btn">Browse Products <FaArrowRight size={14} /></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Step 1 of 2</div>
      <div className="flex items-center justify-between mb-10 flex-wrap gap-3">
        <h1 className="display-xl">Your <span className="neon-pink-text">Cart</span></h1>
        <button onClick={() => { if(window.confirm('Clear entire cart?')) clearCart(); }} className="text-xs text-white/40 hover:text-[#ff007f] transition-colors uppercase tracking-wider">Clear Cart</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.product_id} className="surface p-4 flex items-center gap-4" data-testid={`cart-item-${item.product_id}`}>
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'}
                alt={item.name}
                className="w-24 h-24 rounded-2xl object-cover bg-white"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-1">{item.category}</div>
                <h3 className="font-display text-xl uppercase truncate">{item.name}</h3>
                <div className="text-[#ff007f] font-display text-2xl mt-1">RM{item.price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full p-1">
                <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center"><FaMinus size={10} /></button>
                <div className="font-bold w-8 text-center">{item.quantity}</div>
                <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center"><FaPlus size={10} /></button>
              </div>
              <button onClick={() => removeFromCart(item.product_id)} className="w-10 h-10 rounded-full border border-white/10 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" data-testid={`cart-remove-${item.product_id}`}>
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="surface p-6 h-fit sticky top-32">
          <div className="eyebrow mb-4">Summary</div>
          <h2 className="display-lg mb-6">Order Total</h2>

          <div className="space-y-3 pb-4 border-b border-white/10 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="font-bold">RM{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Shipping</span>
              <span className="text-white/50 text-xs">Calculated at checkout</span>
            </div>
          </div>

          <div className="flex justify-between items-baseline mb-6">
            <span className="text-xs uppercase tracking-wider text-white/50">Total</span>
            <span className="display-lg neon-pink-text">RM{total.toFixed(2)}</span>
          </div>

          <button onClick={() => navigate('/checkout')} className="btn-pink w-full" data-testid="cart-checkout-btn">
            Checkout <FaArrowRight size={14} />
          </button>
          <Link to="/products" className="block text-center mt-3 text-sm text-white/60 hover:text-[#ff007f] transition-colors">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
