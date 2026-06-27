import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useCart } from '../context';
import {
  FaSearch, FaShoppingBag, FaUser, FaBars, FaTimes,
  FaSignOutAlt, FaChevronDown, FaHome, FaBoxOpen,
  FaTachometerAlt, FaUsers, FaKey, FaWhatsapp,
} from 'react-icons/fa';

const CATEGORIES = ['Whiskey', 'Vodka', 'Gin', 'Rum', 'Cognac', 'Brandy', 'Tequila', 'Liqueur', 'Wine', 'Champagne', 'Beer', 'Sake'];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isStaffOrAdmin = user && ['staff', 'super_admin', 'master_admin'].includes(user.role);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const dashLink = () => {
    if (!user) return '/login';
    if (user.role === 'staff') return '/staff';
    if (['master_admin', 'super_admin'].includes(user.role)) return '/admin';
    return '/dashboard';
  };

  const dashLabel = () => {
    if (!user) return 'Sign In';
    if (user.role === 'staff') return 'Staff Dashboard';
    if (['master_admin', 'super_admin'].includes(user.role)) return 'Admin Console';
    return 'My Account';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) { navigate(`/products?search=${encodeURIComponent(search.trim())}`); setOpen(false); }
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-[#050505]/98 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06)]' : 'bg-[#050505]/90 backdrop-blur-lg'}`}>

      {/* ── Top row ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex items-center gap-4 lg:gap-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group" data-testid="nav-logo">
          <div className="w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <img src="/logo-m.png" alt="Masterliqours" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.5)]"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <span className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] items-center justify-center text-black font-black text-xl">M</span>
          </div>
          <div className="hidden sm:block leading-none">
            <div className="text-[9px] uppercase tracking-[0.4em] text-[#ffd700]/70 font-medium">Premium Liquor</div>
            <div className="font-display text-2xl text-white tracking-wide">MASTERLIQOURS</div>
          </div>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative group">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 group-focus-within:text-[#ff007f] transition-colors z-10" size={15} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bottles, brands, categories..."
            className="w-full bg-white text-black rounded-full pl-11 pr-5 py-2.5 text-sm placeholder:text-black/40 outline-none border-2 border-transparent focus:border-[#ff007f] transition-all shadow-sm"
            data-testid="nav-search-input" />
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 ml-auto">

          {/* Desktop: user info */}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to={dashLink()}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 hover:border-[#ff007f] hover:bg-[#ff007f]/10 text-sm font-semibold transition-all"
                data-testid="nav-account">
                <FaUser size={13} className="text-[#ffd700]" />
                <span className="max-w-[100px] truncate">{user.name}</span>
              </Link>
              <button onClick={async () => { await logout(); navigate('/'); }}
                className="p-2.5 rounded-full border border-white/15 hover:border-[#ff007f] hover:bg-[#ff007f]/10 transition-all"
                title="Logout" data-testid="nav-logout-btn">
                <FaSignOutAlt size={13} />
              </button>
            </div>
          ) : (
            <Link to="/login"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 hover:border-[#ff007f] hover:bg-[#ff007f]/10 text-sm font-bold transition-all"
              data-testid="nav-login-btn">
              <FaUser size={13} className="text-[#ffd700]" /> Sign In
            </Link>
          )}

          {/* Cart — hide for staff/admin */}
          {!isStaffOrAdmin && (
            <Link to="/cart"
              className="relative p-2.5 rounded-full bg-white text-black hover:bg-[#ff007f] hover:text-white transition-all duration-200"
              data-testid="nav-cart-btn">
              <FaShoppingBag size={17} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#39ff14] text-black text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Hamburger */}
          <button onClick={() => setOpen(!open)}
            className="lg:hidden p-2.5 rounded-full border border-white/15 hover:border-[#ff007f] transition-all"
            data-testid="nav-mobile-toggle">
            {open ? <FaTimes size={15} /> : <FaBars size={15} />}
          </button>
        </div>
      </div>

      {/* ── Desktop nav row ── */}
      <div className="hidden lg:block border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center gap-8 py-2.5 text-xs font-bold uppercase tracking-widest">
          <Link to="/products?promo=1" className="text-[#ff007f] hover:text-[#39ff14] transition-colors" data-testid="nav-promotions">Promotions</Link>
          <Link to="/products" className="hover:text-[#ffd700] transition-colors" data-testid="nav-all-products">All Products</Link>

          {/* Categories dropdown */}
          <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
            <button className="flex items-center gap-1.5 hover:text-[#ffd700] transition-colors" data-testid="nav-categories">
              Categories <FaChevronDown size={9} className={`transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full pt-2 z-50">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-3 min-w-[220px] grid grid-cols-2 gap-1 shadow-2xl">
                  {CATEGORIES.map(c => (
                    <Link key={c} to={`/products?category=${encodeURIComponent(c)}`}
                      className="px-3 py-2 rounded-xl text-xs hover:bg-white/5 hover:text-[#39ff14] transition-colors">
                      {c}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/bulk-order" className="hover:text-[#ffd700] transition-colors">Bulk Order</Link>

          <div className="flex-1" />

          {/* Role-based right links */}
          {!user && <Link to="/login" className="text-[#39ff14] hover:text-[#ffd700] transition-colors">Sign In</Link>}
          {user && !isStaffOrAdmin && <Link to="/dashboard" className="text-[#ffd700] hover:text-[#39ff14] transition-colors">Rewards</Link>}
          {user && user.role === 'staff' && <Link to="/staff" className="text-[#00f0ff] hover:text-[#39ff14] transition-colors">Staff Dashboard</Link>}
          {user && ['super_admin', 'master_admin'].includes(user.role) && (
            <>
              <Link to="/admin" className="text-[#00f0ff] hover:text-[#39ff14] transition-colors">Admin Console</Link>
              <Link to="/staff" className="text-[#ffd700] hover:text-[#39ff14] transition-colors">Staff View</Link>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#080808]/98 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-5 space-y-1">

            {/* Search */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search bottles..."
                className="w-full bg-white text-black rounded-full pl-10 pr-4 py-2.5 text-sm outline-none" />
            </form>

            {/* Account section */}
            {user ? (
              <div className="bg-[#111] rounded-2xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff007f] to-[#ffd700] flex items-center justify-center text-white font-black text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{user.name}</div>
                  <div className="text-xs text-white/40 capitalize">{user.role?.replace('_', ' ')}</div>
                </div>
                <button onClick={async () => { await logout(); navigate('/'); }}
                  className="p-2 rounded-full bg-white/5 hover:bg-[#ff007f] transition-all" title="Logout">
                  <FaSignOutAlt size={14} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-3 p-4 bg-[#ff007f]/10 border border-[#ff007f]/30 rounded-2xl mb-4 font-bold hover:bg-[#ff007f]/20 transition-all">
                <FaUser size={16} className="text-[#ffd700]" /> Sign In / Register
              </Link>
            )}

            {/* Navigation sections */}
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 px-1 pb-1">Shop</div>
            <MobileNavLink to="/products" icon={<FaBoxOpen size={14} />} label="All Products" />
            <MobileNavLink to="/products?promo=1" icon="🔥" label="Promotions" accent="#ff007f" />
            <MobileNavLink to="/bulk-order" icon="📦" label="Bulk Order" />

            {/* Categories */}
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 px-1 pt-3 pb-1">Categories</div>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <Link key={c} to={`/products?category=${encodeURIComponent(c)}`}
                  className="px-3 py-2 bg-white/5 rounded-xl text-xs text-center hover:bg-[#ff007f]/20 hover:text-[#ff007f] transition-all">
                  {c}
                </Link>
              ))}
            </div>

            {/* Account section */}
            {user && (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 px-1 pt-3 pb-1">My Account</div>
                {!isStaffOrAdmin && <MobileNavLink to="/dashboard" icon={<FaHome size={14} />} label="Dashboard & Rewards" accent="#ffd700" />}
                {!isStaffOrAdmin && <MobileNavLink to="/cart" icon={<FaShoppingBag size={14} />} label={`Cart${cartCount > 0 ? ` (${cartCount})` : ''}`} />}
                {(user.role === 'staff' || ['super_admin', 'master_admin'].includes(user.role)) && (
                  <MobileNavLink to="/staff" icon={<FaUsers size={14} />} label="Staff Dashboard" accent="#00f0ff" />
                )}
                {['super_admin', 'master_admin'].includes(user.role) && (
                  <MobileNavLink to="/admin" icon={<FaTachometerAlt size={14} />} label="Admin Console" accent="#39ff14" />
                )}
                <MobileNavLink to="/change-password" icon={<FaKey size={14} />} label="Change Password" />
                <a href={`https://wa.me/60126884925`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-[#25d366]/10 hover:text-[#25d366] transition-all text-sm">
                  <FaWhatsapp size={14} className="text-[#25d366]" /> Contact Support
                </a>
              </>
            )}

            {!user && (
              <a href={`https://wa.me/60126884925`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-[#25d366]/10 hover:text-[#25d366] transition-all text-sm mt-2">
                <FaWhatsapp size={14} className="text-[#25d366]" /> Chat With Us
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const MobileNavLink = ({ to, icon, label, accent }) => (
  <Link to={to}
    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] transition-all text-sm font-medium"
    style={accent ? { color: accent } : {}}>
    <span className="shrink-0 w-5 flex justify-center">{icon}</span>
    {label}
  </Link>
);

export default Navbar;
