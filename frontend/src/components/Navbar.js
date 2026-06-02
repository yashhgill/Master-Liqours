import React, { useState } from 'react';
import { FaLink, useNavigate } from 'react-router-dom';
import { FauseAuth, useCart } from '../context';
import { FaFaShoppingCart, FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [mobileFaBarsOpen, setMobileFaBarsOpen] = useState(false);
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  const getDashboardLink = () => {
    if (!user) return null;
    switch(user.role) {
      case 'master_admin': return '/master';
      case 'super_admin': return '/admin';
      case 'staff': return '/staff';
      default: return '/dashboard';
    }
  };
  
  return (
    <nav className="bg-black/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold gradient-text">Masterliqours</span>
          </Link>
          
          {/* Desktop FaBars */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-white hover:text-pink-500 transition">Home</Link>
            <Link to="/products" className="text-white hover:text-pink-500 transition">Products</Link>
            {user && (
              <Link to={getDashboardLink()} className="text-white hover:text-pink-500 transition">
                Dashboard
              </Link>
            )}
          </div>
          
          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative">
              <button className="p-2 text-white hover:text-pink-500 transition">
                <FaShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </Link>
            
            {/* FaUser FaBars */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link to={getDashboardLink()} className="hidden md:flex items-center space-x-2 text-white hover:text-pink-500 transition">
                  <FaUser size={20} />
                  <span>{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="p-2 text-white hover:text-red-500 transition" title="Logout">
                  <FaSignOutAlt size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm">Login</Link>
            )}
            
            {/* Mobile FaBars Button */}
            <button onClick={() => setMobileFaBarsOpen(!mobileFaBarsOpen)} className="md:hidden text-white">
              {mobileFaBarsOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile FaBars */}
        {mobileFaBarsOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-white/10">
            <Link to="/" className="block py-2 text-white hover:text-pink-500 transition" onClick={() => setMobileFaBarsOpen(false)}>Home</Link>
            <Link to="/products" className="block py-2 text-white hover:text-pink-500 transition" onClick={() => setMobileFaBarsOpen(false)}>Products</Link>
            {user && (
              <Link to={getDashboardLink()} className="block py-2 text-white hover:text-pink-500 transition" onClick={() => setMobileFaBarsOpen(false)}>Dashboard</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
