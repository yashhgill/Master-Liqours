import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowRight, FaBolt, FaWhatsapp, FaTrophy,
  FaUserShield, FaGem, FaCheck, FaChevronLeft, FaChevronRight,
} from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';
import BrandCarousel from '../components/BrandCarousel';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_HERO = [
  {
    eyebrow: 'Masterliqours · Malaysia · Premium Spirits',
    title: 'SPEND &',
    title2: 'THE NIGHT.',
    accent: 'NIGHT.',
    sub: 'Top quality drops, harga terbaik. Order now, settle via WhatsApp — same-day delivery across KL & Melaka lah.',
    cta_text: 'Shop Now Lah',
    cta_link: '/products',
    bottle: '🥃',
  },
  {
    eyebrow: 'Flash Drop · Limited Stock',
    title: 'PREMIUM',
    title2: 'UP TO 30% OFF.',
    accent: '30% OFF.',
    sub: 'Limited stock boss. Once habis, habis lah. Flash drops updated daily — check now before it\'s gone.',
    cta_text: 'See Flash Sales',
    cta_link: '/products',
    bottle: '🍾',
  },
  {
    eyebrow: 'New Arrivals · Just Landed',
    title: 'CHAMPAGNE',
    title2: 'WEATHER.',
    accent: 'WEATHER.',
    sub: 'Bubbles for every occasion — birthdays, weddings, corporate events. Free delivery above RM1,250.',
    cta_text: 'Explore Drops',
    cta_link: '/products?category=Champagne',
    bottle: '🥂',
  },
];

const CATEGORIES = [
  { name: 'Whiskey', emoji: '🥃' },
  { name: 'Vodka', emoji: '🫧' },
  { name: 'Gin', emoji: '🌿' },
  { name: 'Rum', emoji: '🍹' },
  { name: 'Champagne', emoji: '🍾' },
  { name: 'Wine', emoji: '🍷' },
  { name: 'Tequila', emoji: '🥂' },
  { name: 'Cognac', emoji: '✨' },
  { name: 'Brandy', emoji: '🍫' },
  { name: 'Liqueur', emoji: '🧊' },
  { name: 'Beer', emoji: '🍺' },
  { name: 'Sake', emoji: '🌸' },
];

// Reusable horizontal slider
const Slider = ({ items, renderItem, title, eyebrow, viewAllLink }) => {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -(el.clientWidth * 0.75) : el.clientWidth * 0.75, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [items]);

  return (
    <div>
      <div className="flex items-end justify-between mb-8 px-4 sm:px-6 lg:px-12">
        <div>
          {eyebrow && <div className="sec-eyebrow">{eyebrow}</div>}
          <h2 className="sec-title">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {viewAllLink && (
            <Link to={viewAllLink} className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-white/40 hover:text-[#ff007f] transition-colors mr-2">
              View All <FaArrowRight size={11} />
            </Link>
          )}
          <button onClick={() => scroll('left')} disabled={!canLeft}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canLeft ? 'border-white/20 hover:border-[#ff007f] hover:text-[#ff007f]' : 'border-white/5 text-white/20 cursor-not-allowed'}`}>
            <FaChevronLeft size={11} />
          </button>
          <button onClick={() => scroll('right')} disabled={!canRight}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canRight ? 'border-white/20 hover:border-[#ff007f] hover:text-[#ff007f]' : 'border-white/5 text-white/20 cursor-not-allowed'}`}>
            <FaChevronRight size={11} />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-5 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-12 scrollbar-hide scroll-smooth">
        {items.map((item, i) => (
          <div key={i} className="shrink-0 w-64 sm:w-72">{renderItem(item, i)}</div>
        ))}
      </div>
    </div>
  );
};

// Countdown hook
const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState(() => endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!endTime) return;
    const t = setInterval(() => setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (!endTime || remaining <= 0) return null;
  const s = Math.floor(remaining / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return { h: pad(Math.floor(s / 3600)), m: pad(Math.floor((s % 3600) / 60)), s: pad(s % 60) };
};

// Mystery drop card
const MysteryDropCard = ({ drop }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#150018] to-[#001520]">
      <div className="relative aspect-square bg-black overflow-hidden">
        <img src={drop.product?.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'}
          alt={revealed ? drop.product?.name : 'Mystery'}
          className={`w-full h-full object-cover transition-all duration-700 ${revealed ? 'scale-100 blur-0' : 'scale-110 blur-2xl'}`} />
        {!revealed && (
          <button onClick={() => setRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md hover:bg-black/50 transition-all">
            <div className="text-5xl mb-3" style={{ animation: 'mysteryBob 3s ease-in-out infinite' }}>✦</div>
            <div className="font-display text-xl" style={{ color: '#ff007f' }}>Tap to Reveal</div>
            <div className="text-white/50 text-xs uppercase tracking-wider mt-1">{drop.label}</div>
          </button>
        )}
        {revealed && (
          <div className="absolute top-3 left-3 bg-[#ff007f] text-white px-3 py-1 rounded-full text-xs font-black">
            -{drop.discount_percentage}% OFF
          </div>
        )}
      </div>
      <div className="p-5">
        {revealed ? (
          <>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#ffd700' }}>{drop.product?.category}</div>
            <div className="font-display text-xl uppercase mb-2">{drop.product?.name}</div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-white/40 line-through text-sm">RM{drop.product?.price?.toFixed(2)}</span>
              <span className="text-2xl font-black" style={{ color: '#ff007f' }}>RM{drop.discounted_price?.toFixed(2)}</span>
            </div>
            <Link to={'/product/' + drop.product?.product_id} className="btn-pink w-full text-center block text-sm">
              Grab It Boss <FaArrowRight size={12} className="inline" />
            </Link>
          </>
        ) : (
          <>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{drop.label}</div>
            <div className="text-lg text-white/30 mb-3">{drop.product?.category} drop — {drop.discount_percentage}% off</div>
            <button onClick={() => setRevealed(true)} className="btn-pink w-full text-sm">Reveal Drop</button>
          </>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [mysteryDrops, setMysteryDrops] = useState([]);
  const [slides, setSlides] = useState(DEFAULT_HERO);
  const [slide, setSlide] = useState(0);

  // Touch/swipe state
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const heroRef = useRef(null);
  const autoTimer = useRef(null);

  const goTo = useCallback((idx) => {
    setSlide(idx);
  }, []);

  const next = useCallback(() => {
    setSlide(s => (s + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setSlide(s => (s - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance with reset on manual nav
  const resetTimer = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(next, 6000);
  }, [next]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(autoTimer.current);
  }, [resetTimer]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { prev(); resetTimer(); }
      if (e.key === 'ArrowRight') { next(); resetTimer(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, resetTimer]);

  // Touch handlers
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only register horizontal swipes (not accidental vertical scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
      resetTimer();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const safe = (p) => p.catch(() => null);
    const [bannersRes, salesRes, productsRes, dropsRes] = await Promise.all([
      safe(axios.get(API + '/hero-banners')),
      safe(axios.get(API + '/flash-sales/active')),
      safe(axios.get(API + '/products')),
      safe(axios.get(API + '/drink-reveal/today')),
    ]);

    if (bannersRes?.data?.length > 0) {
      const mapped = bannersRes.data.map(b => ({
        eyebrow: 'Masterliqours · Malaysia · Premium Spirits',
        title: (b.title || 'PREMIUM LIQUOR').split(' ').slice(0, 2).join(' ').toUpperCase(),
        title2: (b.title || '').split(' ').slice(2).join(' ').toUpperCase() || 'DELIVERED.',
        accent: (b.title || '').split(' ').slice(-1)[0].toUpperCase() + '.',
        sub: b.subtitle || 'Top quality drops.',
        cta_text: b.cta_text || 'Shop Now Lah',
        cta_link: b.cta_link || '/products',
        bottle: '🥃',
      }));
      setSlides(mapped);
    }

    if (salesRes?.data) setFlashSales(salesRes.data);
    if (productsRes?.data) {
      const all = productsRes.data?.products || productsRes.data || [];
      setProducts(all.slice(0, 12));
      setNewArrivals([...all].reverse().slice(0, 8));
    }
    if (dropsRes?.data?.available) setMysteryDrops(dropsRes.data.drops || []);
  };

  const hero = slides[slide] || DEFAULT_HERO[0];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══ HERO ═══ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: '#030303', cursor: 'grab' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={(e) => { touchStartX.current = e.clientX; touchStartY.current = e.clientY; }}
        onMouseUp={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.clientX - touchStartX.current;
          if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); resetTimer(); }
          touchStartX.current = null;
        }}
      >
        {/* Orbs */}
        <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: -200, left: -150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.2) 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orbA 14s ease-in-out infinite alternate' }} />
        <div className="absolute pointer-events-none" style={{ width: 600, height: 600, bottom: -150, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.14) 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orbB 18s ease-in-out infinite alternate' }} />
        <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: '40%', left: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 65%)', filter: 'blur(100px)', animation: 'orbA 22s ease-in-out infinite alternate' }} />

        {/* Rotating ring */}
        <div className="absolute pointer-events-none" style={{ width: 800, height: 800, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '1px solid rgba(255,0,127,0.06)', animation: 'ringRotate 50s linear infinite' }}>
          <div style={{ position: 'absolute', inset: 60, borderRadius: '50%', border: '1px solid rgba(0,240,255,0.04)' }} />
          <div style={{ position: 'absolute', inset: 130, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.04)' }} />
        </div>

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        {/* Floating bottle — transitions on slide change */}
        <div key={slide} className="absolute right-[8%] top-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{ fontSize: 'clamp(140px, 20vw, 260px)', animation: 'bottleFloat 6s ease-in-out infinite', filter: 'drop-shadow(0 0 60px rgba(255,0,127,0.25)) drop-shadow(0 0 120px rgba(255,0,127,0.08))', opacity: 0.85, transition: 'opacity 0.5s' }}>
          {hero.bottle || '🥃'}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 w-full py-24">
          <div className="max-w-[700px]">

            {/* Eyebrow */}
            <div key={`ey-${slide}`} className="flex items-center gap-3 mb-7" style={{ animation: 'fadeUp 0.6s ease both' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 10px #ffd700', animation: 'tagPulse 2s infinite', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.8)' }}>{hero.eyebrow}</span>
            </div>

            {/* Headline */}
            <h1 key={`h-${slide}`} style={{ fontFamily: "'Bebas Neue', 'Inter', sans-serif", fontSize: 'clamp(72px, 12vw, 150px)', lineHeight: 0.9, letterSpacing: '0.02em', marginBottom: 28, animation: 'fadeUp 0.7s 0.1s ease both' }}>
              {hero.title}<br />
              <span style={{ WebkitTextStroke: '2px rgba(255,255,255,0.12)', color: 'transparent', display: 'block' }}>
                {(hero.title2 || '').replace(hero.accent, '').trim()}{' '}
                <span style={{ color: '#ff007f', WebkitTextStroke: 0, textShadow: '0 0 60px rgba(255,0,127,0.6), 0 0 120px rgba(255,0,127,0.2)' }}>
                  {hero.accent}
                </span>
              </span>
            </h1>

            {/* Sub */}
            <p key={`s-${slide}`} style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: 460, marginBottom: 44, animation: 'fadeUp 0.7s 0.2s ease both' }}>
              {hero.sub}
            </p>

            {/* Buttons */}
            <div key={`b-${slide}`} className="flex flex-wrap gap-4" style={{ animation: 'fadeUp 0.7s 0.3s ease both' }}>
              <Link to={hero.cta_link || '/products'} className="btn-fire">
                {hero.cta_text || 'Shop Now Lah'} <FaArrowRight size={13} />
              </Link>
              <a href="https://wa.me/60126884925" target="_blank" rel="noopener noreferrer" className="btn-glass">
                <FaWhatsapp size={15} /> Chat With Us
              </a>
            </div>
          </div>
        </div>

        {/* Swipe hint — shows briefly on mobile */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 md:hidden"
          style={{ opacity: 0.4, animation: 'fadeIn 1s 2s both' }}>
          <FaChevronLeft size={12} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Swipe</span>
          <FaChevronRight size={12} />
        </div>

        {/* Left / right arrow buttons */}
        {slides.length > 1 && (
          <>
            <button onClick={() => { prev(); resetTimer(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
              <FaChevronLeft size={14} />
            </button>
            <button onClick={() => { next(); resetTimer(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
              <FaChevronRight size={14} />
            </button>
          </>
        )}

        {/* Vertical slide dots — right side desktop */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-3">
          {slides.map((_, i) => (
            <button key={i} onClick={() => { goTo(i); resetTimer(); }}
              style={{
                width: 4, borderRadius: 4, border: 'none', cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                height: i === slide ? 40 : 12,
                background: i === slide ? '#ff007f' : 'rgba(255,255,255,0.2)',
                boxShadow: i === slide ? '0 0 12px #ff007f' : 'none',
              }}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="absolute bottom-8 right-12 z-10 hidden md:block"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>0{slide + 1}</span> / 0{slides.length}
        </div>

        {/* Bottom dots — mobile */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 md:hidden">
          {slides.map((_, i) => (
            <button key={i} onClick={() => { goTo(i); resetTimer(); }}
              style={{ height: 4, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.35s', width: i === slide ? 32 : 10, background: i === slide ? '#ff007f' : 'rgba(255,255,255,0.25)' }}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-12 z-10 hidden md:flex items-center gap-3"
          style={{ opacity: 0, animation: 'fadeIn 1s 1.5s forwards' }}>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))' }} />
          <div style={{ width: 8, height: 14, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', paddingTop: 3 }}>
            <div style={{ width: 2, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)', animation: 'scrollDot 1.8s ease-in-out infinite' }} />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div className="overflow-hidden" style={{ background: '#39ff14', padding: '11px 0' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 18s linear infinite', gap: 0 }}>
          {[...Array(2)].map((_, rep) => (
            <React.Fragment key={rep}>
              {['⚡ Flash Sales Live', '500+ Premium Bottles', '🔥 Up to 50% Off Today', 'Same-Day KL & Melaka Delivery', '100% Authentic Guaranteed', '🥃 Premium Spirits'].map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '0 40px', color: '#030303', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {t} <span style={{ color: 'rgba(0,0,0,0.3)' }}>·</span>
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ═══ FLASH SALES ═══ */}
      {flashSales.length > 0 && (
        <section className="py-20" style={{ background: 'linear-gradient(180deg, #030303 0%, #080008 50%, #030303 100%)' }}>
          <Slider
            eyebrow="Limited Time"
            title={<><span style={{ color: '#ff007f' }}>Flash</span> Sales</>}
            viewAllLink="/products"
            items={flashSales}
            renderItem={(sale) => <ProductCard product={sale.product} flashSale={sale} />}
          />
        </section>
      )}

      {/* ═══ CATEGORIES ═══ */}
      <section className="py-20" style={{ background: '#030303' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="sec-eyebrow mb-3">What's Your Vibe</div>
          <h2 className="sec-title mb-10">Shop by <span style={{ color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.3)' }}>Category</span></h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
            {CATEGORIES.map((cat) => (
              <Link key={cat.name} to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-2">
                <span className="text-3xl group-hover:scale-125 group-hover:-translate-y-1 transition-transform duration-300">{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }} className="group-hover:text-white transition-colors text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MYSTERY DROPS ═══ */}
      {mysteryDrops.length > 0 && (
        <section className="py-20" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,0,127,0.05) 0%, #030303 70%)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 text-center mb-12">
            <div className="sec-eyebrow justify-center mb-3">Admin Curated</div>
            <h2 className="sec-title">Mystery <span style={{ color: '#ff007f' }}>Drops</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 400, margin: '12px auto 0', fontSize: 14 }}>A hidden deal — revealed only to you. Tap to see today's secret bottle.</p>
          </div>
          <Slider
            items={mysteryDrops}
            renderItem={(drop) => <MysteryDropCard drop={drop} />}
          />
        </section>
      )}

      {/* ═══ NEW ARRIVALS ═══ */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #030303, #050008)' }}>
        {newArrivals.length > 0 ? (
          <Slider eyebrow="Just Landed" title={<>New <span style={{ color: '#00f0ff', textShadow: '0 0 30px rgba(0,240,255,0.4)' }}>Arrivals</span></>} viewAllLink="/products" items={newArrivals} renderItem={(p) => <ProductCard product={p} />} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="sec-eyebrow mb-3">Just Landed</div>
            <h2 className="sec-title mb-8">New <span style={{ color: '#00f0ff' }}>Arrivals</span></h2>
            <div className="flex gap-5 overflow-hidden">{Array(4).fill(0).map((_, i) => <div key={i} className="shrink-0 w-64 sm:w-72 bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />)}</div>
          </div>
        )}
      </section>

      {/* ═══ POPULAR DROPS ═══ */}
      <section className="py-20" style={{ background: '#030303' }}>
        {products.length > 0 ? (
          <Slider eyebrow="Most Ordered" title={<>Crowd <span style={{ color: '#00f0ff', textShadow: '0 0 30px rgba(0,240,255,0.4)' }}>Favourites</span></>} viewAllLink="/products" items={products} renderItem={(p) => <ProductCard product={p} />} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="sec-eyebrow mb-3">Most Ordered</div>
            <h2 className="sec-title mb-8">Crowd <span style={{ color: '#00f0ff' }}>Favourites</span></h2>
            <div className="flex gap-5 overflow-hidden">{Array(4).fill(0).map((_, i) => <div key={i} className="shrink-0 w-64 sm:w-72 bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />)}</div>
          </div>
        )}
      </section>

      {/* ═══ REVIEWS ═══ */}
      <ReviewSection />

      {/* ═══ BRANDS ═══ */}
      <BrandCarousel />

      {/* ═══ TIER REWARDS ═══ */}
      <section className="py-20" style={{ background: '#030303', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.04), transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="sec-eyebrow justify-center mb-3">Members Only</div>
            <h2 className="sec-title">Drink More, <span style={{ color: '#39ff14', textShadow: '0 0 30px rgba(57,255,20,0.4)' }}>Earn More</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 440, margin: '12px auto 0', fontSize: 15 }}>Every order earns points. Climb the tier for exclusive perks lah.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: '🛡️', tier: 'Tier 1', name: 'Regular', col: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.08)', perks: ['Earn 1pt per RM10 spent', 'Newsletter promos', 'WhatsApp support'], check: '#39ff14' },
              { icon: '🏆', tier: 'Tier 2 · 5,000 pts', name: 'Gold', col: '#ffd700', border: 'rgba(255,215,0,0.2)', perks: ['All Regular perks', 'RM50 off every shipping', 'Early flash sale access'], check: '#ffd700', glow: 'rgba(255,215,0,0.15)' },
              { icon: '💎', tier: 'Tier 3 · 10,000 pts', name: 'Platinum', col: '#00f0ff', border: 'rgba(0,240,255,0.2)', perks: ['All Gold perks', '3% off every order', 'Dedicated staff line'], check: '#00f0ff', glow: 'rgba(0,240,255,0.12)' },
            ].map((t, i) => (
              <div key={i} className="rounded-[28px] p-10 relative overflow-hidden hover:-translate-y-2 transition-transform duration-300"
                style={{ border: `1px solid ${t.border}`, background: 'rgba(255,255,255,0.02)', boxShadow: t.glow ? `0 0 60px ${t.glow}` : 'none' }}>
                {t.glow && <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: '50%', background: t.glow, filter: 'blur(60px)', pointerEvents: 'none' }} />}
                <div style={{ fontSize: 44, marginBottom: 24 }}>{t.icon}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{t.tier}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: t.col, textShadow: t.glow ? `0 0 30px ${t.glow}` : 'none', marginBottom: 28 }}>{t.name}</div>
                {t.perks.map((p, j) => (
                  <div key={j} className="flex items-start gap-3 mb-3" style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: t.check, fontSize: 12, marginTop: 3, flexShrink: 0 }}>✓</span>{p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #030303, #060006, #030303)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="sec-eyebrow justify-center mb-3">Simple Process</div>
            <h2 className="sec-title">Order → <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.4)' }}>WhatsApp</span> → Done.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['🔍', '01', 'Browse', 'Pick from 500+ premium bottles.'], ['🛒', '02', 'Checkout', 'Add to cart, enter your address.'], ['💬', '03', 'WhatsApp', 'Staff contacts you directly.'], ['✅', '04', 'Settle', 'Pay via QR. Same-day delivery.']].map(([emoji, n, title, desc]) => (
              <div key={n} className="p-8 rounded-[24px] border border-white/[0.06] hover:border-[#ff007f]/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: 'rgba(255,255,255,0.04)', lineHeight: 1, marginBottom: 16 }}>{n}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{emoji}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, marginBottom: 8, letterSpacing: '0.02em' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative rounded-[40px] overflow-hidden px-12 lg:px-20 py-20" style={{ background: 'linear-gradient(135deg, #1a0010 0%, #0d0020 50%, #001018 100%)', border: '1px solid rgba(255,0,127,0.12)' }}>
            {/* Giant ghost text */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(100px,16vw,220px)', color: 'transparent', WebkitTextStroke: '1px rgba(255,0,127,0.07)', lineHeight: 1, userSelect: 'none' }}>ML</div>
            {/* Orbs */}
            <div className="absolute pointer-events-none" style={{ top: -100, right: 100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.18), transparent 60%)', filter: 'blur(80px)', animation: 'orbA 12s ease-in-out infinite alternate' }} />
            <div className="absolute pointer-events-none" style={{ bottom: -100, left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.12), transparent 60%)', filter: 'blur(60px)', animation: 'orbB 16s ease-in-out infinite alternate' }} />

            <div className="relative z-10 max-w-xl">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#ffd700', marginBottom: 20 }}>Ready Boss?</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(52px,6vw,80px)', lineHeight: 0.95, marginBottom: 20 }}>
                YOUR DRINKS.<br />
                <span style={{ color: '#ff007f', textShadow: '0 0 40px rgba(255,0,127,0.4)' }}>YOUR DOORSTEP.</span><br />
                SETTLE ALREADY.
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 36 }}>
                Free delivery for orders above RM1,250. 100% authentic, guaranteed boss. Thousands of happy customers across Malaysia.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/products" className="btn-lime">Start Shopping <FaArrowRight size={13} /></Link>
                <Link to="/register" className="btn-ghost">Create Account</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes orbA { to{transform:translate(80px,60px) scale(1.2)} }
        @keyframes orbB { to{transform:translate(-60px,-80px) scale(1.15)} }
        @keyframes tagPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }
        @keyframes bottleFloat { 0%,100%{transform:translateY(-50%) rotate(-4deg)} 50%{transform:translateY(calc(-50% - 22px)) rotate(4deg)} }
        @keyframes ringRotate { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes scrollDot { 0%,100%{opacity:1;transform:translateY(0)} 50%{opacity:0;transform:translateY(4px)} }
        @keyframes mysteryBob { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-12px) rotate(5deg)} }
        .sec-eyebrow { display:flex;align-items:center;gap:10px;font-size:10px;font-weight:700;letter-spacing:0.4em;text-transform:uppercase;color:rgba(255,215,0,0.7); }
        .sec-eyebrow::before { content:'';width:24px;height:1px;background:linear-gradient(90deg,transparent,#ffd700); }
        .sec-title { font-family:'Bebas Neue','Inter',sans-serif;font-size:clamp(34px,5vw,58px);letter-spacing:0.02em;line-height:1; }
        .btn-fire { display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#ff007f,#c8005a);color:#fff;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:17px 34px;border-radius:50px;text-decoration:none;box-shadow:0 0 36px rgba(255,0,127,0.45),inset 0 1px 0 rgba(255,255,255,0.15);transition:all 0.3s cubic-bezier(0.22,1,0.36,1); }
        .btn-fire:hover { transform:translateY(-3px);box-shadow:0 0 56px rgba(255,0,127,0.65); }
        .btn-glass { display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.8);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:17px 30px;border-radius:50px;text-decoration:none;transition:all 0.3s; }
        .btn-glass:hover { border-color:rgba(37,211,102,0.5);color:#25d366;transform:translateY(-3px); }
        .btn-lime { display:inline-flex;align-items:center;gap:10px;background:#39ff14;color:#030303;font-size:12px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;padding:17px 34px;border-radius:50px;text-decoration:none;box-shadow:0 0 32px rgba(57,255,20,0.4);transition:all 0.3s; }
        .btn-lime:hover { transform:translateY(-3px);box-shadow:0 0 50px rgba(57,255,20,0.6); }
        .btn-ghost { display:inline-flex;align-items:center;gap:10px;background:transparent;color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:16px 28px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);text-decoration:none;transition:all 0.3s; }
        .btn-ghost:hover { border-color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.05); }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none;scrollbar-width:none; }
      `}</style>
    </div>
  );
};

export default Home;
