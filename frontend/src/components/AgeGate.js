import React, { useState, useEffect, useRef } from 'react';
import { FaCheck } from 'react-icons/fa';

/**
 * Age verification gate.
 *
 * Simple and reliable: tapping "Yes, I'm 21+" saves verification and enters the
 * store IMMEDIATELY — no video in the critical path, so it can never hang.
 *
 * The vault clip is used only as a muted, looping background behind the prompt
 * (muted autoplay is always allowed on mobile). If it can't play, its poster
 * shows — the flow does not depend on it in any way.
 */

const STORAGE_KEY = 'ml_age_verified';
const MAX_AGE_DAYS = 30;
const DENIED_VIDEO = '/videos/vault-denied.mp4';
const ACCEPTED_VIDEO = '/videos/vault-accepted.mp4';
const DENIED_POSTER = '/videos/vault-denied-poster.jpg';
const ACCEPTED_POSTER = '/videos/vault-accepted-poster.jpg';

const isVerified = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return (Date.now() - ts) / (1000 * 60 * 60 * 24) < MAX_AGE_DAYS;
  } catch { return false; }
};

const AgeGate = () => {
  const [status, setStatus] = useState('checking'); // checking | ask | denied | passed
  const bgRef = useRef(null);

  useEffect(() => { setStatus(isVerified() ? 'passed' : 'ask'); }, []);

  useEffect(() => {
    const active = status === 'ask' || status === 'denied';
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  // Force the muted background loop to autoplay on mobile (best-effort).
  useEffect(() => {
    const v = bgRef.current;
    if (v && (status === 'ask' || status === 'denied')) {
      v.muted = true; v.setAttribute('muted', '');
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    }
  }, [status]);

  const onYes = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    document.body.style.overflow = '';
    setStatus('passed');            // enter the store immediately — no video wait
  };

  const onNo = () => setStatus('denied');

  if (status === 'checking' || status === 'passed') return null;

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 100000, background: '#050505',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  };
  const videoBg = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' };

  // ── Denied ──
  if (status === 'denied') {
    return (
      <div style={overlay}>
        <video ref={bgRef} src={DENIED_VIDEO} poster={DENIED_POSTER} playsInline webkit-playsinline="true" loop muted preload="auto" style={{ ...videoBg, opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.45) 0%, rgba(5,5,5,0.88) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '24px 22px', maxWidth: 440 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(38px, 11vw, 56px)', lineHeight: 1, letterSpacing: '0.04em', marginBottom: 16, color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
            Access <span style={{ color: '#ff007f' }}>Denied</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 1.7, textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}>
            Sorry, you must be of legal drinking age to enter Masterliqours. Stay safe, and come back when you're 21 lah.
          </p>
          <button onClick={() => setStatus('ask')}
            style={{ marginTop: 26, background: 'none', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)', padding: '12px 26px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ── Ask ──
  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Age verification">
      <video ref={bgRef} src={ACCEPTED_VIDEO} poster={ACCEPTED_POSTER} playsInline webkit-playsinline="true" loop muted preload="auto" style={{ ...videoBg, opacity: 0.4 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, rgba(255,0,127,0.13) 0%, rgba(5,5,5,0.85) 55%, rgba(5,5,5,0.96) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 2, width: 'min(460px, 100%)', textAlign: 'center', padding: '24px 22px' }}>
        <img src="/logo-m.png" alt="Masterliqours"
          style={{ width: 66, height: 'auto', margin: '0 auto 20px', display: 'block', filter: 'drop-shadow(0 0 24px rgba(255,0,127,0.6))' }}
          onError={(e) => { e.target.style.display = 'none'; }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.85)', marginBottom: 14 }}>
          The Vault · Age Verification
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(42px, 12vw, 64px)', lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 16, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}>
          Are you <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.7)' }}>21</span> or older?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 28px', textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
          Masterliqours sells alcohol. You must be of legal drinking age to enter the vault.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <button onClick={onYes} data-testid="age-gate-yes"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', padding: '17px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 34px rgba(255,0,127,0.5)' }}>
            <FaCheck size={14} /> Yes, I'm 21 or older
          </button>
          <button onClick={onNo} data-testid="age-gate-no"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            No, I'm under 21
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.6, margin: '24px auto 0', maxWidth: 320 }}>
          By entering, you confirm you are of legal drinking age in Malaysia. Please drink responsibly.
        </p>
      </div>
    </div>
  );
};

export default AgeGate;
