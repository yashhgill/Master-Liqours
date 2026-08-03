import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaTimes, FaArrowRight } from 'react-icons/fa';

/**
 * "Join the family" prompt for signed-out visitors.
 *
 * Shows a few seconds after load for anyone who isn't logged in. Dismissing it
 * hides it for the rest of the page visit only (in-memory) — it shows again on
 * the next visit/refresh, so a single accidental dismissal doesn't kill it
 * forever. Never shown to signed-in users.
 */
const SignInPrompt = () => {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (loading) return;                 // wait for auth to resolve
    if (user) {
      // Signed in (or a stale valid token is present) — prompt intentionally hidden.
      // eslint-disable-next-line no-console
      console.info('[SignInPrompt] hidden: a user session is active', user?.email || '');
      setVisible(false);
      return;
    }
    if (dismissed) return;
    // eslint-disable-next-line no-console
    console.info('[SignInPrompt] no user — prompt will show in 2s');
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [user, loading, dismissed]);

  if (!visible || user || dismissed) return null;

  const dismiss = () => { setVisible(false); setDismissed(true); };

  return (
    <div
      role="dialog"
      aria-label="Sign up"
      style={{
        position: 'fixed',
        bottom: 92,
        right: 16,
        zIndex: 1000,
        width: 'min(340px, calc(100vw - 32px))',
        opacity: 1,
      }}
    >
      <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>Join the family lah</div>
          <button onClick={dismiss} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 4 }}><FaTimes size={14} /></button>
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Sign up free to track orders, earn reward points, and get a dedicated staff member on WhatsApp.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/register" onClick={dismiss}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', padding: '11px 16px', borderRadius: 50, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 0 20px rgba(255,0,127,0.3)' }}>
              Get Started <FaArrowRight size={11} />
            </Link>
            <Link to="/login" onClick={dismiss}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', padding: '11px 16px', borderRadius: 50, fontWeight: 700, fontSize: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPrompt;
