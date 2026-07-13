import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// These are the hardcoded fallback brands — same ones the admin can add via the Brands tab.
// Once the admin adds brands in /admin → Brands, those replace these automatically.
const FALLBACK_BRANDS = [
  'Hennessy','Johnnie Walker','Chivas','Glenfiddich','Jack Daniels',
  'Absolut','Grey Goose','Bacardi','Jameson','Moët & Chandon',
  'Glenlivet','Hendricks','Bombay Sapphire','Tanqueray','Patron',
  'Remy Martin','Martell','Courvoisier','Smirnoff','Captain Morgan',
];

const BrandCarousel = () => {
  const [brands, setBrands] = useState(FALLBACK_BRANDS);

  useEffect(() => {
    axios.get(`${API}/brands`, { timeout: 8000 }).then(r => {
      const names = (r.data || []).map(b => b.short_name || b.name).filter(Boolean);
      if (names.length >= 6) setBrands(names);
    }).catch(() => {});
  }, []);

  // Duplicate for seamless loop
  const doubled = [...brands, ...brands];

  return (
    <section style={{ padding: '80px 0', background: '#030303', position: 'relative', overflow: 'hidden' }}>
      {/* Top/bottom fade edges */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {/* Left/right fade */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, background: 'linear-gradient(90deg, #030303, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, background: 'linear-gradient(-90deg, #030303, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 24, height: 1, background: '#ffd700', display: 'inline-block' }} /> Top Shelf
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px,5vw,58px)', letterSpacing: '0.02em', lineHeight: 1 }}>
              Shop by <span style={{ color: '#00f0ff', textShadow: '0 0 30px rgba(0,240,255,0.4)' }}>Brand</span>
            </h2>
          </div>
          <Link to="/products" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            className="hover:text-[#ff007f] transition-colors hidden sm:flex">
            All Products →
          </Link>
        </div>
      </div>

      {/* Row 1 — left to right */}
      <div style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'brandScroll1 40s linear infinite', gap: 0 }}>
          {doubled.map((name, i) => (
            <Link key={i} to={`/products?search=${encodeURIComponent(name)}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 20, padding: '0 32px', textDecoration: 'none', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)', textShadow: '0 0 18px rgba(255,0,127,0.45)', transition: 'all 0.3s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.textShadow = '0 0 26px rgba(255,0,127,0.9), 0 0 40px rgba(255,0,127,0.5)'; }}
                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.85)'; e.target.style.textShadow = '0 0 18px rgba(255,0,127,0.45)'; }}>
                {name}
              </span>
              <span style={{ color: 'rgba(255,0,127,0.3)', fontSize: 8 }}>✦</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Row 2 — right to left, offset */}
      <div style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'brandScroll2 50s linear infinite', gap: 0 }}>
          {[...doubled].reverse().map((name, i) => (
            <Link key={i} to={`/products?search=${encodeURIComponent(name)}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 20, padding: '0 32px', textDecoration: 'none', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(18px, 2.5vw, 28px)', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textShadow: '0 0 14px rgba(0,240,255,0.35)', transition: 'all 0.3s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.textShadow = '0 0 22px rgba(0,240,255,0.8)'; }}
                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.5)'; e.target.style.textShadow = '0 0 14px rgba(0,240,255,0.35)'; }}>
                {name}
              </span>
              <span style={{ color: 'rgba(0,240,255,0.2)', fontSize: 6 }}>✦</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-10 flex items-center justify-center gap-8 flex-wrap">
        {['100% Authentic', 'Direct from Distributors', 'Sealed & Verified'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
            <span style={{ color: '#39ff14', fontSize: 10 }}>✓</span> {t}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes brandScroll1 { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes brandScroll2 { from{transform:translateX(-50%)} to{transform:translateX(0)} }
      `}</style>
    </section>
  );
};

export default BrandCarousel;
