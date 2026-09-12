import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if not already acknowledged
    const acknowledged = localStorage.getItem('ml_cookies_ok');
    if (!acknowledged) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('ml_cookies_ok', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9999,
      maxWidth: 480, margin: '0 auto',
      background: '#111', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🍪</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
            We use cookies
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
            Only a session cookie to keep you logged in — no tracking, no ads.{' '}
            <Link to="/legal/cookies" style={{ color: '#ff007f', textDecoration: 'none' }}>
              Cookie Policy
            </Link>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={accept} style={{
              padding: '7px 18px', background: '#ff007f', border: 'none',
              borderRadius: 50, color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              Got it
            </button>
            <Link to="/legal/cookies" onClick={accept} style={{
              padding: '7px 14px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50, color: 'rgba(255,255,255,0.6)', fontWeight: 600,
              fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}>
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
