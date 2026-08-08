import React, { useState, useEffect } from 'react';
import { FaCheck, FaWineBottle } from 'react-icons/fa';

/**
 * Age verification gate.
 *
 * Alcohol retailers must confirm the visitor is of legal drinking age before
 * showing the store. This full-screen overlay blocks all content until the
 * visitor confirms they are 21+, and remembers the choice (localStorage, valid
 * for 30 days) so returning visitors aren't asked on every page.
 *
 * If they say they're under 21, we show a polite "come back later" screen and
 * do NOT let them into the store.
 */

const STORAGE_KEY = 'ml_age_verified';
const MAX_AGE_DAYS = 30;

const isVerified = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return days < MAX_AGE_DAYS;
  } catch {
    return false;
  }
};

const AgeGate = () => {
  const [status, setStatus] = useState('checking'); // checking | show | denied | passed

  useEffect(() => {
    setStatus(isVerified() ? 'passed' : 'show');
  }, []);

  const confirm = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setStatus('passed');
    // Re-enable page scroll
    document.body.style.overflow = '';
  };

  const deny = () => setStatus('denied');

  // Lock background scroll while the gate is up
  useEffect(() => {
    if (status === 'show' || status === 'denied') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  if (status === 'checking' || status === 'passed') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Age verification"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,0,127,0.12) 0%, #050505 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* faint decorative glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.10), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', width: 'min(440px, 100%)', textAlign: 'center' }}>
        {/* Logo mark */}
        <img
          src="/logo-m.png"
          alt="Masterliqours"
          style={{ width: 76, height: 'auto', margin: '0 auto 24px', display: 'block', filter: 'drop-shadow(0 0 24px rgba(255,0,127,0.5))' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {status === 'show' ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.8)', marginBottom: 14 }}>
              Age Verification
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 10vw, 62px)', lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 18, color: '#fff' }}>
              Are you <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.6)' }}>21</span> or older?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 32px' }}>
              Masterliqours sells alcohol. You must be of legal drinking age to enter. Please confirm your age to continue.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
              <button
                onClick={confirm}
                data-testid="age-gate-yes"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none',
                  padding: '16px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15, letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 30px rgba(255,0,127,0.4)',
                }}
              >
                <FaCheck size={14} /> Yes, I'm 21 or older
              </button>
              <button
                onClick={deny}
                data-testid="age-gate-no"
                style={{
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.12)', padding: '15px 24px', borderRadius: 50,
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                No, I'm under 21
              </button>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.6, marginTop: 28, maxWidth: 340, margin: '28px auto 0' }}>
              By entering, you agree you are of legal drinking age in Malaysia. Please drink responsibly.
            </p>
          </>
        ) : (
          /* Denied — under age */
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FaWineBottle size={26} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(34px, 8vw, 48px)', lineHeight: 1, letterSpacing: '0.02em', marginBottom: 16, color: '#fff' }}>
              Come back when you're 21
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
              Sorry, you must be of legal drinking age to browse Masterliqours. Stay safe, and see you soon lah.
            </p>
            <button
              onClick={() => setStatus('show')}
              style={{ marginTop: 28, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
            >
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AgeGate;
