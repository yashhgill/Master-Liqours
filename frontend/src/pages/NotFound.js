import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaWhatsapp } from 'react-icons/fa';

const NotFound = () => (
  <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden', background: '#030303' }}>
    <div style={{ position: 'absolute', width: 600, height: 600, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.08), transparent 65%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(100px,20vw,200px)', lineHeight: 1, color: 'transparent', WebkitTextStroke: '2px rgba(255,0,127,0.2)', marginBottom: 0 }}>404</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px,6vw,72px)', color: '#ff007f', textShadow: '0 0 40px rgba(255,0,127,0.4)', marginBottom: 16, marginTop: -16 }}>LOST LAH?</div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, marginBottom: 40, maxWidth: 380, margin: '0 auto 40px' }}>
        This page doesn't exist boss — maybe the link's broken or the bottle's been moved already.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', padding: '14px 28px', borderRadius: 50, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 0 24px rgba(255,0,127,0.35)' }}>
          Back Home <FaArrowRight size={13} />
        </Link>
        <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', padding: '14px 28px', borderRadius: 50, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>
          Browse Drops
        </Link>
      </div>
      <a href="https://wa.me/60126884925" target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
        <FaWhatsapp size={14} style={{ color: '#25d366' }} /> Tell us about it on WhatsApp
      </a>
    </div>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>
  </div>
);

export default NotFound;
