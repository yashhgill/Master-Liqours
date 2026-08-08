import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, CartProvider, useAuth } from './context';
import AnnouncementBar from './components/AnnouncementBar';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import SignInPrompt from './components/SignInPrompt';
import AgeGate from './components/AgeGate';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrderDetail from './pages/OrderDetail';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import UserDashboard from './pages/UserDashboard';
import StaffDashboard from './pages/StaffDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import BulkOrder from './pages/BulkOrder';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/60">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function AppContent() {
  // Keep-alive ping: while someone has the site open, ping the backend so a
  // free-tier Render instance doesn't spin down between their page views.
  // NOTE: this only runs in an open browser tab — it cannot keep the server
  // awake when nobody is on the site. For true 24/7 uptime, use an external
  // uptime monitor (e.g. UptimeRobot hitting /api/ping) or Render's paid tier.
  useEffect(() => {
    const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
    const ping = () => {
      // Skip while the tab is in the background — no point, and browsers throttle it.
      if (document.visibilityState === 'hidden') return;
      fetch(`${API}/ping`, { cache: 'no-store' }).catch(() => {});
    };
    ping(); // immediate ping on load so the first real request is warm
    const id = setInterval(ping, 30000); // every 30s
    // Fire one immediately whenever the user returns to the tab.
    const onVis = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] overflow-x-hidden">
      <AgeGate />
      <ScrollToTop />
      <AnnouncementBar />
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['customer']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute roles={['staff', 'super_admin', 'master_admin']}><StaffDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['super_admin', 'master_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/bulk-order" element={<BulkOrder />} />
          <Route path="/master" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
      <SignInPrompt />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
