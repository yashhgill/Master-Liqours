import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaCheck, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

/**
 * Age verification gate with cinematic vault videos — mobile-first.
 *
 * Mobile autoplay rules are strict, so this is built defensively:
 *  - Background/looping videos are MUTED and get their muted attribute set on the
 *    DOM node directly (React's `muted` prop is unreliable on iOS Safari), plus
 *    playsInline / webkit-playsinline so they don't force fullscreen.
 *  - The "accepted" reveal video's play() is triggered SYNCHRONOUSLY inside the
 *    tap handler (iOS only grants sound to play() calls made within a user
 *    gesture). It's pre-mounted hidden so the ref exists at tap time.
 *  - Every video has a poster and a graceful fallback: if a clip can't autoplay,
 *    the poster shows and the flow still works (buttons/timeouts carry it).
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
  const [status, setStatus] = useState('checking'); // checking | ask | accepting | denied | passed
  const [muted, setMuted] = useState(false);
  const revealRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    setStatus(isVerified() ? 'passed' : 'ask');
  }, []);

  // Lock scroll while gate is up.
  useEffect(() => {
    const active = status !== 'checking' && status !== 'passed';
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [status]);

  // Force the background loop to actually autoplay on mobile: set muted on the
  // real DOM node and call play() (autoplay attribute alone is unreliable).
  useEffect(() => {
    const v = bgRef.current;
    if (v && (status === 'ask' || status === 'denied')) {
      v.muted = true;
      v.setAttribute('muted', '');
      const p = v.play();
      if (p && p.catch) p.catch(() => {}); // poster stays if blocked — fine
    }
  }, [status]);

  const enterSite = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    document.body.style.overflow = '';
    setStatus('passed');
  }, []);

  const onYes = () => {
    // Trigger the reveal video's playback SYNCHRONOUSLY here so iOS grants it
    // (and its audio) as part of this tap gesture.
    const v = revealRef.current;
    if (v) {
      try {
        v.muted = muted;
        v.currentTime = 0;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
    setStatus('accepting');
    // Safety net: enter even if the clip can't play or 'ended' never fires.
    window.__ageGateTimer = setTimeout(enterSite, 7000);
  };

  const onNo = () => setStatus('denied');

  const toggleMute = () => {
    setMuted(m => {
      const next = !m;
      if (revealRef.current) revealRef.current.muted = next;
      return next;
    });
  };

  useEffect(() => () => { if (window.__ageGateTimer) clearTimeout(window.__ageGateTimer); }, []);

  if (status === 'checking') return null;

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 100000, background: '#050505',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  };
  const videoBg = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center',
  };

  // Reveal video is ALWAYS mounted (hidden until accepting) so its ref exists
  // at tap time — essential for iOS sound. Kept out of the DOM only once passed.
  const revealVideo = status !== 'passed' && (
    <video
      ref={revealRef}
      src={ACCEPTED_VIDEO}
      poster={ACCEPTED_POSTER}
      playsInline
      webkit-playsinline="true"
      preload="auto"
      onEnded={enterSite}
      style={{ ...videoBg, display: status === 'accepting' ? 'block' : 'none' }}
    />
  );

  // ── Reveal (accepted) ──
  if (status === 'accepting') {
    return (
      <div style={overlay}>
        {revealVideo}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(5,5,5,0.55))', pointerEvents: 'none' }} />
        <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}
          style={{ position: 'absolute', top: 20, right: 20, zIndex: 3, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
        </button>
        <button onClick={enterSite}
          style={{ position: 'absolute', bottom: 'max(28px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '12px 28px', borderRadius: 50, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Enter →
        </button>
      </div>
    );
  }

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
      {revealVideo}
      <video ref={bgRef} src={DENIED_VIDEO} poster={DENIED_POSTER} playsInline webkit-playsinline="true" loop muted preload="auto" style={{ ...videoBg, opacity: 0.42 }} />
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
