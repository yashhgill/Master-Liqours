import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { FaTimes, FaArrowRight, FaGift } from 'react-icons/fa';

/**
 * "Join the family" nudge for signed-out visitors.
 *
 * A small card in the corner, never a full-screen blur: shoppers can keep
 * browsing while it's up. It appears once, after someone has been looking
 * around for a while, and after it's closed (or acted on) it stays away for
 * a few days.
 */
const KEY = 'ml_join_prompt_hidden_until';
const DELAY_MS = 25000;
const SNOOZE_DAYS = 3;

const snoozed = () => {
  try { return Date.now() < Number(localStorage.getItem(KEY) || 0); } catch { return false; }
};
const snooze = () => {
  try { localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* storage blocked */ }
};

const SignInPrompt = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const suppressedPaths = ['/login', '/register', '/admin', '/staff', '/reset-password', '/forgot-password', '/auth', '/checkout', '/cart'];
  const isSuppressed = suppressedPaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    if (loading || user || snoozed()) return undefined;
    // Wait until the visitor has dealt with the cookie notice so the two never stack.
    let t;
    const tryShow = () => {
      let cookiesDone = true;
      try { cookiesDone = !!localStorage.getItem('ml_cookies_ok'); } catch { /* ignore */ }
      if (snoozed()) return;
      if (cookiesDone) setVisible(true); else t = setTimeout(tryShow, 5000);
    };
    t = setTimeout(tryShow, DELAY_MS);
    return () => clearTimeout(t);
  }, [user, loading]);

  if (!visible || user || isSuppressed) return null;

  const dismiss = () => { snooze(); setVisible(false); };

  return (
    <div
      role="complementary"
      aria-label="Create a free account"
      className="ml-join-toast"
      style={{
        position: 'fixed', left: 16, zIndex: 900, width: 'min(340px, calc(100vw - 32px))',
        background: 'rgba(15,15,15,0.96)', border: '1px solid rgba(255,0,127,0.35)', borderRadius: 18,
        boxShadow: '0 18px 50px rgba(0,0,0,0.6), 0 0 30px rgba(255,0,127,0.15)', padding: '14px 16px',
        display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'slideUp 0.35s ease',
      }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#ff007f,#c8005a)' }}>
        <FaGift color="#fff" size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Join free, get 10% off</div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, lineHeight: 1.5, margin: '3px 0 10px' }}>
          Code ML10 on your first order, plus reward points and order tracking.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/register" onClick={dismiss}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', padding: '8px 14px', borderRadius: 50, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Sign up <FaArrowRight size={10} />
          </Link>
          <Link to="/login" onClick={dismiss}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: 50, fontWeight: 700, fontSize: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
            Sign in
          </Link>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, marginTop: -2 }}>
        <FaTimes size={13} />
      </button>
      <style>{`.ml-join-toast{bottom:24px}@media(max-width:1023px){.ml-join-toast{bottom:84px}}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default SignInPrompt;
