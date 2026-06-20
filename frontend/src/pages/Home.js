import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowRight, FaBolt, FaWhatsapp, FaTrophy,
  FaUserShield, FaGem, FaCheck, FaChevronLeft, FaChevronRight, FaClock,
} from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';
import BrandCarousel from '../components/BrandCarousel';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_HERO = [
  { eyebrow: 'Masterliqours · Malaysia', title: 'Spend & Win the night.', accent: 'win', sub: 'Top quality drinks dengan harga best. Order now, settle via WhatsApp lah!', bg: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600', cta_text: 'Shop Now Lah', cta_link: '/products' },
  { eyebrow: 'Flash Drop', title: 'Premium Whisky · Up to 30% off', accent: '30%', sub: 'Limited stock boss. Once habis, habis lah.', bg: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1600', cta_text: 'See Flash Sales', cta_link: '/products' },
  { eyebrow: 'New Arrivals', title: 'Champagne weather, always.', accent: 'always', sub: 'Bubbles for every occasion — birthdays, weddings, just-because.', bg: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600', cta_text: 'Explore Drops', cta_link: '/products?category=Champagne' },
];

const highlightTitle = (title, accent) => {
  if (!accent || !title) return title;
  const idx = title.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return title;
  return <>{title.slice(0, idx)}<span className="neon-pink-text">{title.slice(idx, idx + accent.length)}</span>{title.slice(idx + accent.length)}</>;
};

const pad = (n) => String(n).padStart(2, '0');

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
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
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
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h2 className="display-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {viewAllLink && (
            <Link to={viewAllLink} className="hidden sm:inline-flex items-center gap-2 text-sm uppercase tracking-wider font-bold text-white/60 hover:text-[#ff007f] transition-colors mr-2">
              View All <FaArrowRight size={12} />
            </Link>
          )}
          <button onClick={() => scroll('left')} disabled={!canLeft}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canLeft ? 'border-white/20 text-white hover:border-[#ff007f] hover:text-[#ff007f]' : 'border-white/5 text-white/20 cursor-not-allowed'}`}>
            <FaChevronLeft size={12} />
          </button>
          <button onClick={() => scroll('right')} disabled={!canRight}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canRight ? 'border-white/20 text-white hover:border-[#ff007f] hover:text-[#ff007f]' : 'border-white/5 text-white/20 cursor-not-allowed'}`}>
            <FaChevronRight size={12} />
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
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

// Single mystery drop card
const MysteryDropCard = ({ drop }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#150018] to-[#001520]">
      <div className="relative aspect-square bg-black overflow-hidden">
        <img src={drop.product.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'}
          alt={revealed ? drop.product.name : 'Mystery'}
          className={`w-full h-full object-cover transition-all duration-700 ${revealed ? 'scale-100 blur-0' : 'scale-110 blur-2xl'}`}
          onError={e => e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'} />
        {!revealed && (
          <button onClick={() => setRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md hover:bg-black/50 transition-all">
            <div className="text-5xl mb-3 animate-pulse">✦</div>
            <div className="font-display text-xl neon-pink-text">Tap to Reveal</div>
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
            <div className="text-xs text-[#ffd700] uppercase tracking-wider mb-1">{drop.product.category}</div>
            <div className="font-display text-xl uppercase mb-2">{drop.product.name}</div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-white/40 line-through text-sm">RM{drop.product.price.toFixed(2)}</span>
              <span className="font-display text-2xl neon-pink-text">RM{drop.discounted_price.toFixed(2)}</span>
            </div>
            <Link to={'/product/' + drop.product.product_id} className="btn-pink w-full text-center block text-sm">
              Grab It Boss <FaArrowRight size={12} className="inline" />
            </Link>
          </>
        ) : (
          <>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{drop.label}</div>
            <div className="font-display text-lg text-white/30 mb-3">A {drop.product.category} drop — {drop.discount_percentage}% off</div>
            <button onClick={() => setRevealed(true)} className="btn-pink w-full text-sm">Reveal Drop</button>
          </>
        )}
      </div>
    </div>
  );
};

// Retry a flaky/slow request a few times with backoff. The Render free-tier
// backend can take 30-50s+ to wake up from sleep on the first request after
// being idle, and used to just be left swallowed by axios.catch() with
// nothing retrying it -- so a page load that landed during a cold start
// would permanently show the default hero / empty product grid until the
// user manually reloaded (which often re-triggered the same cold start).
const fetchWithRetry = async (url, { attempts = 4, baseDelayMs = 2500 } = {}) => {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await axios.get(url, { timeout: 15000 });
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
  }
  console.warn(`Gave up fetching ${url} after ${attempts} attempts:`, lastErr?.message);
  return null;
};

const Home = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [mysteryDrops, setMysteryDrops] = useState([]);
  const [slides, setSlides] = useState(DEFAULT_HERO);
  const [slide, setSlide] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const loadData = async () => {
    // Each fetch retries on its own with backoff (see fetchWithRetry) — a slow
    // cold-start backend no longer means a permanently empty/default homepage.
    const [bannersRes, salesRes, productsRes, dropsRes] = await Promise.all([
      fetchWithRetry(API + '/hero-banners'),
      fetchWithRetry(API + '/flash-sales/active'),
      fetchWithRetry(API + '/products'),
      fetchWithRetry(API + '/drink-reveal/today'),
    ]);

    // Banners
    if (bannersRes?.data && bannersRes.data.length > 0) {
      const mapped = bannersRes.data
        .map(b => ({
          eyebrow: 'Masterliqours · Malaysia',
          title: b.title || 'Premium Liquor',
          accent: (b.title || '').split(' ').slice(-1)[0],
          sub: b.subtitle || 'Top quality drinks.',
          bg: b.background_image || DEFAULT_HERO[0].bg,
          cta_text: b.cta_text || 'Shop Now Lah',
          cta_link: b.cta_link || '/products',
        }));
      if (mapped.length > 0) setSlides(mapped);
    }
    setHeroLoaded(true);

    // Flash sales
    if (salesRes?.data) setFlashSales(salesRes.data);

    // Products
    if (productsRes?.data) {
      const allProducts = productsRes.data?.products || productsRes.data || [];
      setProducts(allProducts.slice(0, 12));
      setNewArrivals([...allProducts].reverse().slice(0, 8));
    }

    // Mystery drops
    if (dropsRes?.data?.available) {
      setMysteryDrops(dropsRes.data.drops || []);
    }
  };

  const hero = slides[slide] || DEFAULT_HERO[0];

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-black">
        <img key={slide} src={hero.bg} alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-24 w-full">
          <div className="max-w-3xl">
            <div className="eyebrow mb-6">{hero.eyebrow}</div>
            <h1 className="display-mega text-glow-white mb-6">{highlightTitle(hero.title, hero.accent)}</h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl leading-relaxed">{hero.sub}</p>
            <div className="flex flex-wrap gap-4">
              <Link to={hero.cta_link || '/products'} className="btn-lime">{hero.cta_text || 'Shop Now Lah'} <FaArrowRight size={14} /></Link>
              <a href="https://wa.me/60126884925?text=Hi%20Masterliqours" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <FaWhatsapp size={16} /> Chat With Us
              </a>
            </div>

          </div>
        </div>

        {/* Hero nav arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={() => setSlide(s => (s - 1 + slides.length) % slides.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#ff007f] hover:border-[#ff007f] transition-all">
              <FaChevronLeft size={14} />
            </button>
            <button onClick={() => setSlide(s => (s + 1) % slides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#ff007f] hover:border-[#ff007f] transition-all">
              <FaChevronRight size={14} />
            </button>
          </>
        )}

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-10 bg-[#ff007f]' : 'w-3 bg-white/30'}`} />
          ))}
        </div>
      </section>

      {/* ═══ FLASH SALES SLIDER ═══ */}
      {flashSales.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-[#050505] to-[#0a0a0a] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-10 bg-[#39ff14] flex items-center overflow-hidden mb-4">
            <div className="flex animate-marquee whitespace-nowrap gap-12 text-black font-display text-xl uppercase">
              {Array(10).fill(0).map((_, i) => (
                <span key={i} className="flex items-center gap-3 shrink-0"><FaBolt /> Flash Sale · Limited Stock</span>
              ))}
            </div>
          </div>
          <div className="pt-14">
            <Slider
              eyebrow="Limited Time"
              title={<><span className="neon-pink-text">Flash</span> Sales</>}
              viewAllLink="/products"
              items={flashSales}
              renderItem={(sale) => <ProductCard product={sale.product} flashSale={sale} />}
            />
          </div>
        </section>
      )}

      {/* ═══ MYSTERY DROPS ═══ */}
      {mysteryDrops.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,0,127,0.1), transparent 50%)' }} />
          <Slider
            eyebrow="Admin Curated"
            title={<>Mystery <span className="neon-pink-text">Drops</span></>}
            items={mysteryDrops}
            renderItem={(drop) => <MysteryDropCard drop={drop} />}
          />
        </section>
      )}

      {/* ═══ NEW ARRIVALS SLIDER ═══ */}
      <section className="py-20 bg-gradient-to-b from-[#050505] to-[#0a0a0a]">
        {newArrivals.length > 0 ? (
          <Slider
            eyebrow="Just Landed"
            title={<>New <span className="neon-cyan-text">Arrivals</span></>}
            viewAllLink="/products"
            items={newArrivals}
            renderItem={(p) => <ProductCard product={p} />}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="eyebrow mb-3">Just Landed</div>
            <h2 className="display-xl mb-8">New <span className="neon-cyan-text">Arrivals</span></h2>
            <div className="flex gap-5 overflow-hidden">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="shrink-0 w-64 sm:w-72 bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ POPULAR DROPS SLIDER ═══ */}
      <section className="py-20">
        {products.length > 0 ? (
          <Slider
            eyebrow="Crowd Favourites"
            title={<>Popular <span className="neon-cyan-text">Drops</span></>}
            viewAllLink="/products"
            items={products}
            renderItem={(p) => <ProductCard product={p} />}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="eyebrow mb-3">Crowd Favourites</div>
            <h2 className="display-xl mb-8">Popular <span className="neon-cyan-text">Drops</span></h2>
            <div className="flex gap-5 overflow-hidden">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="shrink-0 w-64 sm:w-72 bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ CUSTOMER REVIEWS ═══ */}
      <ReviewSection />

      {/* ═══ BRAND CAROUSEL ═══ */}
      <BrandCarousel />

      {/* ═══ TIER REWARDS ═══ */}
      <section className="py-20 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">Members Only</div>
            <h2 className="display-xl">Drink More, <span className="neon-lime-text">Earn More</span></h2>
            <p className="text-white/60 max-w-xl mx-auto mt-4">Every order earns points. Climb the tier ladder for exclusive perks lah.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="surface p-8 flex flex-col"><FaUserShield size={28} className="text-white/40 mb-5" /><div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Tier 1</div><div className="display-md mb-4">Regular</div><ul className="space-y-3 text-white/70 text-sm flex-1"><li className="flex gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> Earn 1pt per RM10 spent</li><li className="flex gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> Newsletter promos</li><li className="flex gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> WhatsApp support</li></ul></div>
            <div className="surface p-8 flex flex-col relative overflow-hidden" style={{borderColor:'rgba(255,215,0,0.4)',boxShadow:'0 0 40px rgba(255,215,0,0.08)'}}><FaTrophy size={28} className="text-[#ffd700] mb-5" /><div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-2">Tier 2 · 5,000 pts</div><div className="display-md mb-4 text-[#ffd700]">Gold</div><ul className="space-y-3 text-white/80 text-sm flex-1"><li className="flex gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> All Regular perks</li><li className="flex gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> <strong>RM50 off</strong> every shipping</li><li className="flex gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> Early flash sale access</li></ul></div>
            <div className="surface p-8 flex flex-col relative overflow-hidden" style={{borderColor:'rgba(0,240,255,0.4)',boxShadow:'0 0 40px rgba(0,240,255,0.08)'}}><FaGem size={28} className="text-[#00f0ff] mb-5" /><div className="text-xs uppercase tracking-[0.25em] text-[#00f0ff] mb-2">Tier 3 · 10,000 pts</div><div className="display-md mb-4 neon-cyan-text">Platinum</div><ul className="space-y-3 text-white/80 text-sm flex-1"><li className="flex gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> All Gold perks</li><li className="flex gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> <strong>3% off</strong> every order</li><li className="flex gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> Dedicated staff line</li></ul></div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">How It Works</div>
            <h2 className="display-xl">Order → <span className="neon-pink-text">WhatsApp</span> → Settle.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[['01','Browse','Pick from 500+ premium drops.'],['02','Checkout','Add to cart, enter address, place order.'],['03','WhatsApp','Chat your assigned staff direct.'],['04','Settle','Pay via QR, same-day delivery (KL).']].map(([n,t,d]) => (
              <div key={n} className="surface p-8 hover:border-[#ff007f]/40 transition-colors">
                <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-3">{n}</div>
                <div className="display-md mb-3">{t}</div>
                <p className="text-white/60 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#ff007f] via-[#e60073] to-[#9b005a] p-12 lg:p-16">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:'radial-gradient(circle at 80% 20%, rgba(255,215,0,0.5), transparent 40%), radial-gradient(circle at 20% 80%, rgba(0,240,255,0.4), transparent 45%)'}} />
            <div className="relative max-w-2xl">
              <div className="eyebrow text-white mb-4">Ready Lah?</div>
              <h2 className="display-xl text-white mb-6">Premium liquor, terus ke pintu anda.</h2>
              <p className="text-white/90 text-lg mb-8">Free delivery for orders above RM1,250. 100% authentic, guaranteed.</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/products" className="btn-lime">Start Shopping <FaArrowRight size={14} /></Link>
                <Link to="/register" className="btn-ghost border-white/40 text-white">Create Account</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
