import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context';
import {
  FaSearch, FaShoppingBag, FaUser, FaBars, FaTimes, FaSignOutAlt, FaChevronDown,
} from 'react-icons/fa';

const categories = ['Whiskey', 'Vodka', 'Gin', 'Rum', 'Cognac', 'Brandy', 'Tequila', 'Liqueur', 'Wine', 'Champagne', 'Beer', 'Sake'];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const dashLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'master_admin': return '/admin';
      case 'super_admin': return '/admin';
      case 'staff': return '/staff';
      default: return '/dashboard';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10">
      {/* Top row: logo + search + account + cart */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 flex items-center gap-4 lg:gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group" data-testid="nav-logo">
          <div className="logo-pop w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] flex items-center justify-center text-black font-black text-xl shadow-[0_0_25px_rgba(255,215,0,0.35)] overflow-hidden transition-transform duration-300 group-hover:scale-110">
            <img
              src="/logo-m.jpeg"
              alt="Masterliqours"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <span className="hidden w-full h-full items-center justify-center">M</span>
          </div>
          <div className="hidden sm:block leading-none">
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#ffd700]/80">Premium Liquor</div>
            <div className="logo-text text-3xl">Masterliqours</div>
          </div>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-2xl relative"
        >
          <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bottles, brands, categories..."
            className="w-full bg-white text-black rounded-full pl-12 pr-6 py-3 placeholder:text-black/40 outline-none border-2 border-transparent focus:border-[#ff007f] transition-all"
            data-testid="nav-search-input"
          />
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-3 ml-auto">
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to={dashLink()}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 hover:border-[#ff007f] text-sm font-semibold transition-all"
                data-testid="nav-account"
              >
                <FaUser size={14} className="text-[#ffd700]" />
                <span className="max-w-[100px] truncate">{user.name}</span>
              </Link>
              <button
                onClick={async () => { await logout(); navigate('/'); }}
                className="p-2.5 rounded-full border border-white/15 hover:border-[#ff007f] transition-all"
                title="Logout"
                data-testid="nav-logout-btn"
              >
                <FaSignOutAlt size={14} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 hover:border-[#ff007f] text-sm font-bold transition-all"
              data-testid="nav-login-btn"
            >
              <FaUser size={14} className="text-[#ffd700]" />
              <span>Sign In</span>
            </Link>
          )}

          <Link to="/cart" className="relative p-3 rounded-full bg-white text-black hover:bg-[#ff007f] hover:text-white transition-all" data-testid="nav-cart-btn">
            <FaShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#39ff14] text-black text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-3 rounded-full border border-white/15"
            data-testid="nav-mobile-toggle"
          >
            {open ? <FaTimes size={16} /> : <FaBars size={16} />}
          </button>
        </div>
      </div>

      {/* Bottom row: menu */}
      <div className="hidden lg:block border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center gap-8 py-3 text-sm font-bold uppercase tracking-wider">
          <Link to="/products?promo=1" className="text-[#ff007f] hover:text-[#39ff14] transition-colors" data-testid="nav-promotions">Promotions</Link>
          <Link to="/products" className="hover:text-[#ffd700] transition-colors" data-testid="nav-all-products">All Products</Link>
          <div
            className="relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button className="flex items-center gap-1 hover:text-[#ffd700] transition-colors" data-testid="nav-categories">
              Categories <FaChevronDown size={10} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full pt-2 z-50">
                <div className="surface p-3 min-w-[200px] grid gap-1">
                  {categories.map((c) => (
                    <Link
                      key={c}
                      to={`/products?category=${encodeURIComponent(c)}`}
                      className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#39ff14] transition-colors"
                    >
                      {c}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link to="/products" className="hover:text-[#ffd700] transition-colors" data-testid="nav-brands">Brands</Link>
          <Link to="/products" className="hover:text-[#ffd700] transition-colors">Fast Delivery</Link>
          <div className="flex-1" />
          <Link to="/dashboard" className="text-[#ffd700] hover:text-[#39ff14] transition-colors">Rewards</Link>
          <Link to="/products" className="hover:text-[#ffd700] transition-colors">Bulk Order</Link>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#050505]">
          <div className="px-4 py-4 space-y-2">
            <form onSubmit={handleSearch} className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lah..."
                className="w-full bg-white text-black rounded-full pl-10 pr-4 py-2.5 outline-none"
              />
            </form>
            <Link to="/products" onClick={() => setOpen(false)} className="block py-3 border-b border-white/5 uppercase font-bold text-sm tracking-wider">All Products</Link>
            {categories.map((c) => (
              <Link
                key={c}
                to={`/products?category=${encodeURIComponent(c)}`}
                onClick={() => setOpen(false)}
                className="block py-2.5 border-b border-white/5 text-sm"
              >
                {c}
              </Link>
            ))}
            <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-3 text-[#ffd700] font-bold uppercase text-sm tracking-wider">My Rewards</Link>
            {!user && <Link to="/login" onClick={() => setOpen(false)} className="block py-3 text-[#39ff14] font-bold uppercase text-sm tracking-wider">Sign In</Link>}
            {user && (
              <>
                <Link to={dashLink()} onClick={() => setOpen(false)} className="block py-3 text-[#ffd700] font-bold uppercase text-sm tracking-wider">Dashboard</Link>
                <button onClick={() => { navigate('/change-password'); setOpen(false); }} className="block w-full text-left py-3 text-white/60 uppercase text-sm tracking-wider">Change Password</button>
                <button onClick={async () => { await logout(); setOpen(false); navigate('/'); }} className="block w-full text-left py-3 text-[#ff007f] font-bold uppercase text-sm tracking-wider">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
