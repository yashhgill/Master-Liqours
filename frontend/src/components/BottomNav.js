import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaShoppingBag, FaUser } from 'react-icons/fa';
import { useAuth, useCart } from '../context';

/**
 * Mobile bottom navigation bar (app-style), shown only below lg.
 * Four tabs: Home · Search · Cart · Account — mirrors the native-app feel.
 * Hidden for staff/admin (they use the dashboard nav instead).
 */
export default function BottomNav() {
  const { user } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isStaff = user && ['staff', 'super_admin', 'master_admin'].includes(user.role);
  if (isStaff) return null; // staff/admin don't get the shopper bottom bar

  const path = location.pathname;
  const active = (p) => (p === '/' ? path === '/' : path.startsWith(p));

  const goSearch = () => {
    // Focus the products page search; on mobile the navbar search is hidden,
    // so send them to the catalogue which has its own search.
    navigate('/products');
  };

  const itemClass = (isActive) =>
    `flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
      isActive ? 'text-[#ff007f]' : 'text-white/50'
    }`;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      data-testid="bottom-nav">
      <div className="flex items-stretch max-w-lg mx-auto px-2">
        <Link to="/" className={itemClass(active('/'))} data-testid="bottomnav-home">
          <FaHome size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Home</span>
        </Link>

        <button onClick={goSearch} className={itemClass(active('/products'))} data-testid="bottomnav-search">
          <FaSearch size={19} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Shop</span>
        </button>

        <Link to="/cart" className={itemClass(active('/cart'))} data-testid="bottomnav-cart">
          <div className="relative">
            <FaShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-[#39ff14] text-black text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide">Cart</span>
        </Link>

        <Link to={user ? '/dashboard' : '/login'} className={itemClass(active('/dashboard') || active('/login'))} data-testid="bottomnav-account">
          <FaUser size={19} />
          <span className="text-[10px] font-bold uppercase tracking-wide">{user ? 'Me' : 'Sign In'}</span>
        </Link>
      </div>
    </nav>
  );
}
