import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaTimes, FaArrowRight, FaWhatsapp } from 'react-icons/fa';

const SignInPrompt = () => {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem('ml_prompt_dismissed'));

  useEffect(() => {
    if (loading || user || dismissed) return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, [user, loading, dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem('ml_prompt_dismissed', '1');
  };

  if (!visible || user || dismissed) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, width: 320, animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
      <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
        {/* Top bar */}
        <div style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Join the family lah</div>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4 }}><FaTimes size={14} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: '18px 20px 20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
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
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default SignInPrompt;
