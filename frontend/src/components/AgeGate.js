import React, { useState, useEffect, useRef } from 'react';
import { FaCheck } from 'react-icons/fa';

/**
 * Age verification gate with cinematic vault videos.
 *
 * Flow:
 *  - Initial: a locked-vault video loops muted behind the "Are you 21+?" prompt.
 *  - "Yes, 21+"  → plays the vault-opening-to-a-bar video (with sound) as a
 *                  reveal, stores verification (30 days), then enters the site.
 *  - "No, under" → plays the "access denied" vault video (with sound) + a polite
 *                  "come back when you're 21" message. Does NOT enter the store.
 *
 * Returning visitors within 30 days skip the gate entirely.
 */

const STORAGE_KEY = 'ml_age_verified';
const MAX_AGE_DAYS = 30;
const ACCEPTED_VIDEO = '/videos/vault-accepted.mp4';
const DENIED_VIDEO = '/videos/vault-denied.mp4';
const ACCEPTED_POSTER = '/videos/vault-accepted-poster.jpg';
const DENIED_POSTER = '/videos/vault-denied-poster.jpg';

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
  // checking | ask | accepting | denied | passed
  const [status, setStatus] = useState('checking');
  const revealVideoRef = useRef(null);

  useEffect(() => {
    setStatus(isVerified() ? 'passed' : 'ask');
  }, []);

  // Lock background scroll while the gate is visible
  useEffect(() => {
    const active = status !== 'checking' && status !== 'passed';
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  const enterSite = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setStatus('passed');
    document.body.style.overflow = '';
  };

  const onYes = () => {
    setStatus('accepting');
    // Play the reveal video with sound; when it ends, enter the site.
    setTimeout(() => {
      const v = revealVideoRef.current;
      if (v) {
        v.muted = false;
        v.play?.().catch(() => {}); // autoplay-with-sound may be blocked; that's fine
      }
    }, 40);
    // Safety: enter even if the video can't play / 'ended' never fires.
    setTimeout(enterSite, 6500);
  };

  const onNo = () => setStatus('denied');

  if (status === 'checking' || status === 'passed') return null;

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 100000, background: '#050505',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  };
  const videoBg = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  };

  // ── Reveal state: full-screen vault-opening video ──
  if (status === 'accepting') {
    return (
      <div style={overlay}>
        <video
          ref={revealVideoRef}
          src={ACCEPTED_VIDEO}
          poster={ACCEPTED_POSTER}
          autoPlay
          playsInline
          onEnded={enterSite}
          style={videoBg}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(5,5,5,0.6))' }} />
        <button
          onClick={enterSite}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 2, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 22px', borderRadius: 50, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Skip intro →
        </button>
      </div>
    );
  }

  // ── Denied state: access-denied vault video + message ──
  if (status === 'denied') {
    return (
      <div style={overlay}>
        <video src={DENIED_VIDEO} poster={DENIED_POSTER} autoPlay playsInline loop style={{ ...videoBg, opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.85) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: 24, maxWidth: 440 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 9vw, 56px)', lineHeight: 1, letterSpacing: '0.04em', marginBottom: 16, color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            Access <span style={{ color: '#ff007f' }}>Denied</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.7, textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
            Sorry, you must be of legal drinking age to enter Masterliqours. Stay safe, and come back when you're 21 lah.
          </p>
          <button
            onClick={() => setStatus('ask')}
            style={{ marginTop: 26, background: 'none', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)', padding: '10px 24px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ── Ask state: locked vault looping behind the 21+ question ──
  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Age verification">
      <video src={DENIED_VIDEO} poster={DENIED_POSTER} autoPlay playsInline loop muted style={{ ...videoBg, opacity: 0.45 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(255,0,127,0.12) 0%, rgba(5,5,5,0.82) 55%, rgba(5,5,5,0.95) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 2, width: 'min(460px, 100%)', textAlign: 'center', padding: 24 }}>
        <img
          src="/logo-m.png" alt="Masterliqours"
          style={{ width: 72, height: 'auto', margin: '0 auto 22px', display: 'block', filter: 'drop-shadow(0 0 24px rgba(255,0,127,0.6))' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.85)', marginBottom: 14 }}>
          The Vault · Age Verification
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 10vw, 64px)', lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 18, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.8)' }}>
          Are you <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.7)' }}>21</span> or older?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 30px', textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>
          Masterliqours sells alcohol. You must be of legal drinking age to enter the vault. Confirm your age to continue.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          <button
            onClick={onYes}
            data-testid="age-gate-yes"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', padding: '16px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 34px rgba(255,0,127,0.5)' }}
          >
            <FaCheck size={14} /> Yes, I'm 21 or older
          </button>
          <button
            onClick={onNo}
            data-testid="age-gate-no"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)', padding: '15px 24px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            No, I'm under 21
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.6, marginTop: 26, maxWidth: 340, margin: '26px auto 0' }}>
          By entering, you confirm you are of legal drinking age in Malaysia. Please drink responsibly.
        </p>
      </div>
    </div>
  );
};

export default AgeGate;
