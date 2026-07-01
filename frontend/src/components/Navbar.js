import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useCart } from '../context';
import {
  FaSearch, FaShoppingBag, FaUser, FaBars, FaTimes,
  FaSignOutAlt, FaChevronDown, FaTachometerAlt, FaUsers,
  FaHome, FaKey, FaWhatsapp, FaBoxOpen, FaBolt, FaBox,
} from 'react-icons/fa';

const CATEGORIES = [
  ['Whiskey','W'],['Vodka','V'],['Gin','G'],['Rum','R'],
  ['Champagne','Ch'],['Wine','Wi'],['Tequila','T'],['Cognac','Co'],
  ['Brandy','Br'],['Liqueur','L'],['Beer','Be'],['Sake','Sa'],
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isStaffOrAdmin = user && ['staff', 'super_admin', 'master_admin'].includes(user.role);
  const isAdmin = user && ['super_admin', 'master_admin'].includes(user.role);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); setSearchOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) { navigate(`/products?search=${encodeURIComponent(search.trim())}`); setSearchOpen(false); setSearch(''); }
  };

  const dashLink = user?.role === 'staff' ? '/staff' : isAdmin ? '/admin' : '/dashboard';
  const dashLabel = user?.role === 'staff' ? 'Staff Dashboard' : isAdmin ? 'Admin Console' : 'My Dashboard';

  return (
    <>
      <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? 'bg-[#030303]/95 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.05)]' : 'bg-[#030303]/80 backdrop-blur-xl'}`}>

        {/* ── Main row ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center h-16 gap-3 lg:gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group mr-2">
              <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <img src="/logo-m.png" alt="M" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <span className="hidden w-9 h-9 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] items-center justify-center text-black font-black text-lg">M</span>
              </div>
              <div className="hidden sm:block leading-none">
                <div className="text-[8px] uppercase tracking-[0.4em] text-[#ffd700]/60 font-semibold">Premium Liquor</div>
                <div className="text-[15px] font-black tracking-wider text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: 18 }}>MASTERLIQOURS</div>
              </div>
            </Link>

            {/* Desktop search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#ff007f] transition-colors z-10 pointer-events-none" size={14} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search bottles, brands, categories..."
                className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-full pl-10 pr-5 py-2.5 text-sm placeholder:text-white/30 outline-none focus:border-[#ff007f]/60 focus:bg-white/[0.08] transition-all"
              />
            </form>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">

              {/* Mobile search toggle */}
              <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:border-[#ff007f]/50 transition-all">
                <FaSearch size={13} />
              </button>

              {/* Auth buttons — desktop */}
              {!user ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/login" className="text-sm font-bold text-white/60 hover:text-white transition-colors px-3 py-2">Sign In</Link>
                  <Link to="/register" className="text-sm font-bold px-4 py-2 rounded-full transition-all"
                    style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', boxShadow: '0 0 20px rgba(255,0,127,0.3)' }}>
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  {/* Dashboard */}
                  <Link to={dashLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] hover:border-[#ff007f]/50 hover:bg-[#ff007f]/08 text-sm font-semibold transition-all">
                    {isAdmin ? <FaTachometerAlt size={12} className="text-[#00f0ff]" /> : user.role === 'staff' ? <FaUsers size={12} className="text-[#00f0ff]" /> : <FaHome size={12} className="text-[#ffd700]" />}
                    <span className="max-w-[90px] truncate text-xs">{user.name}</span>
                  </Link>
                  <button onClick={async () => { await logout(); navigate('/'); }}
                    className="w-9 h-9 rounded-full border border-white/[0.08] flex items-center justify-center hover:border-[#ff007f]/50 hover:text-[#ff007f] transition-all" title="Logout">
                    <FaSignOutAlt size={13} />
                  </button>
                </div>
              )}

              {/* Cart */}
              {!isStaffOrAdmin && (
                <Link to="/cart" className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: cartCount > 0 ? 'linear-gradient(135deg,#ff007f,#c8005a)' : 'rgba(255,255,255,0.06)', border: cartCount > 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <FaShoppingBag size={14} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black px-1"
                      style={{ background: '#39ff14', color: '#030303' }}>{cartCount}</span>
                  )}
                </Link>
              )}

              {/* Hamburger */}
              <button onClick={() => setOpen(!open)}
                className="w-9 h-9 rounded-full border border-white/[0.08] flex items-center justify-center lg:hidden hover:border-[#ff007f]/50 transition-all">
                {open ? <FaTimes size={14} /> : <FaBars size={14} />}
              </button>
            </div>
          </div>

          {/* ── Desktop nav bar ── */}
          <div className="hidden lg:flex items-center gap-6 py-2.5 border-t border-white/[0.05] text-[11px] font-bold uppercase tracking-[0.15em]">

            {/* Staff/Admin: show only dashboard links, no shop nav */}
            {isStaffOrAdmin ? (
              <>
                {user?.role === 'staff' && <Link to="/staff" className="text-[#00f0ff] hover:text-[#39ff14] transition-colors flex items-center gap-1.5"><FaTachometerAlt size={9}/> Staff Dashboard</Link>}
                {isAdmin && <Link to="/admin" className="text-[#39ff14] hover:text-white transition-colors flex items-center gap-1.5"><FaTachometerAlt size={9}/> Admin Console</Link>}
                {isAdmin && <Link to="/staff" className="text-[#ffd700] hover:text-white transition-colors">Staff View</Link>}
                <div className="flex-1" />
                <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',letterSpacing:'0.2em'}}>INTERNAL PORTAL</span>
              </>
            ) : (
              <>
                <Link to="/products?promo=1" className="text-[#ff007f] hover:text-[#39ff14] transition-colors flex items-center gap-1.5"><FaBolt size={9} /> Promotions</Link>
                <Link to="/products" className="text-white/60 hover:text-white transition-colors">All Products</Link>

                {/* Categories dropdown */}
                <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
                  <button className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                    Categories <FaChevronDown size={8} className={`transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {catOpen && (
                    <div className="absolute left-0 top-full pt-2 z-50">
                      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '12px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 48px rgba(0,0,0,0.6)', width: 320, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {CATEGORIES.map(([cat]) => (
                          <Link key={cat} to={`/products?category=${encodeURIComponent(cat)}`}
                            style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,127,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
                            {cat}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link to="/bulk-order" className="text-white/60 hover:text-white transition-colors">Bulk Order</Link>
                <div className="flex-1" />
                {user && <Link to="/dashboard" className="text-[#ffd700] hover:text-white transition-colors">My Dashboard</Link>}
                {user && <Link to="/dashboard" className="text-white/60 hover:text-[#39ff14] transition-colors">Rewards</Link>}
              </>
            )}
          </div>
        </div>

        {/* ── Mobile search bar ── */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 pt-1">
            <form onSubmit={handleSearch} className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 z-10" size={13} />
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search bottles, brands..."
                className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-full pl-10 pr-5 py-2.5 text-sm placeholder:text-white/30 outline-none focus:border-[#ff007f]/60 transition-all" />
            </form>
          </div>
        )}
      </header>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm overflow-y-auto"
            style={{ background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
              <div className="text-sm font-black tracking-wider" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20 }}>MASTERLIQOURS</div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center">
                <FaTimes size={13} />
              </button>
            </div>

            <div className="p-4 space-y-1">

              {/* Search */}
              <form onSubmit={handleSearch} className="relative mb-4">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 z-10" size={13} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bottles..."
                  className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-full pl-10 pr-4 py-3 text-sm placeholder:text-white/30 outline-none focus:border-[#ff007f]/60 transition-all" />
              </form>

              {/* User card */}
              {user ? (
                <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#ff007f,#ffd700)' }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{user.name}</div>
                    <div className="text-xs text-white/40 capitalize">{user.role?.replace(/_/g, ' ')}</div>
                  </div>
                  <button onClick={async () => { await logout(); navigate('/'); setOpen(false); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#ff007f]/20 transition-all" title="Logout">
                    <FaSignOutAlt size={12} className="text-white/40" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Link to="/login" className="py-3 rounded-2xl border border-white/[0.08] text-center text-sm font-bold hover:border-white/20 transition-all">Sign In</Link>
                  <Link to="/register" className="py-3 rounded-2xl text-center text-sm font-bold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', boxShadow: '0 0 20px rgba(255,0,127,0.3)' }}>Get Started</Link>
                </div>
              )}

              {/* Account section */}
              {user && (
                <>
                  <DrawerLabel label="Account" />
                  {!isStaffOrAdmin && <DrawerItem to="/dashboard" icon={<FaHome size={14}/>} label="My Dashboard" accent="#ffd700" />}
                  {!isStaffOrAdmin && <DrawerItem to="/cart" icon={<FaShoppingBag size={14}/>} label={`Cart${cartCount > 0 ? ` (${cartCount})` : ''}`} />}
                  {(user.role === 'staff' || isAdmin) && <DrawerItem to="/staff" icon={<FaUsers size={14}/>} label="Staff Dashboard" accent="#00f0ff" />}
                  {isAdmin && <DrawerItem to="/admin" icon={<FaTachometerAlt size={14}/>} label="Admin Console" accent="#39ff14" />}
                  <DrawerItem to="/change-password" icon={<FaKey size={14}/>} label="Change Password" />
                </>
              )}

              {/* Shop */}
              <DrawerLabel label="Shop" />
              <DrawerItem to="/products" icon={<FaBoxOpen size={14}/>} label="All Products" />
              <DrawerItem to="/products?promo=1" icon={<FaBolt size={14}/>} label="Promotions" accent="#ff007f" />
              <DrawerItem to="/bulk-order" icon={<FaBox size={14}/>} label="Bulk & Event Orders" />

              {/* Categories */}
              <DrawerLabel label="Categories" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {CATEGORIES.map(([cat]) => (
                  <Link key={cat} to={`/products?category=${encodeURIComponent(cat)}`}
                    style={{ padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {cat}
                  </Link>
                ))}
              </div>

              {/* WhatsApp */}
              <a href="https://wa.me/60126884925" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl mt-2 text-sm font-semibold transition-all"
                style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366' }}>
                <FaWhatsapp size={16} /> Chat With Us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DrawerLabel = ({ label }) => (
  <div className="text-[9px] uppercase tracking-[0.35em] text-white/25 px-2 pt-4 pb-1 font-bold">{label}</div>
);

const DrawerItem = ({ to, icon, label, accent }) => (
  <Link to={to}
    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-white/[0.05]"
    style={{ color: accent || 'rgba(255,255,255,0.7)' }}>
    <span className="w-5 flex justify-center shrink-0">{icon}</span>
    {label}
  </Link>
);

export default Navbar;
