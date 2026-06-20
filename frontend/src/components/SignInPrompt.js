import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaTimes, FaCrown } from 'react-icons/fa';
import { useAuth } from '../context';

// Pages where nagging a guest to sign in would be annoying/pointless
const SKIP_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
const DISMISS_KEY = 'ml_signin_prompt_dismissed';
const SHOW_DELAY_MS = 4000;

const SignInPrompt = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || user) {
      setVisible(false);
      return;
    }
    if (SKIP_PATHS.includes(location.pathname)) {
      setVisible(false);
      return;
    }
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, location.pathname]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
      <div className="surface relative max-w-md w-full p-8 text-center">
        <button onClick={dismiss} aria-label="Close" className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <FaTimes size={18} />
        </button>
        <FaCrown className="text-[#ffd700] text-4xl mx-auto mb-4" />
        <h2 className="display-md mb-3">Sign in for the good stuff</h2>
        <p className="text-white/60 mb-7 text-sm leading-relaxed">
          Create a free account to earn reward points on every order, unlock Gold &amp; Platinum
          tier discounts, and track your deliveries.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login" onClick={dismiss} className="btn-lime flex-1">Sign In</Link>
          <Link to="/register" onClick={dismiss} className="btn-ghost border-white/40 text-white flex-1">Create Account</Link>
        </div>
        <button onClick={dismiss} className="mt-5 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors">
          Continue browsing as guest
        </button>
      </div>
    </div>
  );
};

export default SignInPrompt;
