import React, { useEffect, useRef, useState } from 'react';

/**
 * IntroAnimation — full-screen video intro that plays once per session.
 * The video lives at /intro-video.mp4 (in frontend/public/).
 * After the video ends (or the user skips), onDone() is called.
 */
const IntroAnimation = ({ onDone }) => {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [flashing, setFlashing] = useState(false);

  const finish = () => {
    if (!visible) return;
    setFlashing(true);
    setTimeout(() => {
      setVisible(false);
      setFlashing(false);
      if (onDone) onDone();
    }, 280);
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.play().catch(() => {
      // Autoplay blocked (rare on mobile) — skip straight to hero
      finish();
    });

    vid.addEventListener('ended', finish);
    return () => vid.removeEventListener('ended', finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Black flash overlay for the cut transition */}
      {flashing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            zIndex: 10,
            animation: 'mlFlash 0.28s ease forwards',
          }}
        />
      )}

      {/* The video — object-cover so it fills the screen at any aspect ratio */}
      <video
        ref={videoRef}
        src="/intro-video.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Skip — barely-there, bottom-right corner */}
      <button
        onClick={finish}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '6px 14px',
          borderRadius: 40,
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          zIndex: 5,
        }}
      >
        skip
      </button>

      {/* Progress bar — 1.5px line at very bottom edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 1.5,
          background: 'linear-gradient(90deg,#ff007f,#ffd700,#00f0ff,#ff007f)',
          zIndex: 5,
          animation: 'mlProgress var(--intro-duration, 8s) linear forwards',
        }}
      />

      <style>{`
        @keyframes mlFlash {
          from { opacity: 0.8 }
          to   { opacity: 0 }
        }
        @keyframes mlProgress {
          from { width: 0 }
          to   { width: 100% }
        }
      `}</style>
    </div>
  );
};

export default IntroAnimation;
