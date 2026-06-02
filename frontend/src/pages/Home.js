import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowRight, FaBolt, FaWhatsapp, FaTrophy, FaShippingFast,
  FaUserShield, FaGem, FaChartLine, FaCheck,
} from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import CategoryChips from '../components/CategoryChips';
import MyFlashSales from '../components/MyFlashSales';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_HERO = [
  {
    eyebrow: 'Masterliqours · Malaysia',
    title: 'Spend & Win the night.',
    accent: 'win',
    sub: 'Top quality drinks dengan harga best. Order now, settle via WhatsApp lah!',
    bg: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600',
    cta_text: 'Shop Now Lah',
    cta_link: '/products',
  },
  {
    eyebrow: 'Flash Drop',
    title: 'Premium Whisky · Up to 30% off',
    accent: '30%',
    sub: 'Limited stock boss. Once habis, habis lah — better grab one.',
    bg: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1600',
    cta_text: 'See Flash Sales',
    cta_link: '/products?promo=1',
  },
  {
    eyebrow: 'New Arrivals',
    title: 'Champagne weather, always.',
    accent: 'always',
    sub: 'Bubbles for every occasion — birthdays, raya, weddings, just-because.',
    bg: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600',
    cta_text: 'Explore Drops',
    cta_link: '/products?category=Champagne',
  },
];

const highlightTitle = (title, accent) => {
  if (!accent || !title) return title;
  const lower = title.toLowerCase();
  const idx = lower.indexOf(accent.toLowerCase());
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span className="neon-pink-text">{title.slice(idx, idx + accent.length)}</span>
      {title.slice(idx + accent.length)}
    </>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [slides, setSlides] = useState(DEFAULT_HERO);
  const [slide, setSlide] = useState(0);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const loadData = async () => {
    try {
      const [bannersRes, salesRes, productsRes] = await Promise.all([
        axios.get(`${API}/hero-banners`),
        axios.get(`${API}/flash-sales/active`),
        axios.get(`${API}/products`),
      ]);
      // Map CMS banners → slide shape; keep default if empty
      if (bannersRes.data && bannersRes.data.length > 0) {
        const mapped = bannersRes.data.map((b) => ({
          eyebrow: 'Masterliqours · Malaysia',
          title: b.title || 'Premium Liquor',
          accent: b.subtitle && b.title?.toLowerCase().includes((b.subtitle || '').toLowerCase().split(' ')[0])
            ? (b.subtitle || '').split(' ')[0]
            : (b.title || '').split(' ').slice(-1)[0],
          sub: b.subtitle || 'Top quality drinks dengan harga best.',
          bg: b.background_image || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600',
          cta_text: b.cta_text || 'Shop Now Lah',
          cta_link: b.cta_link || '/products',
        }));
        setSlides(mapped);
      }
      setFlashSales(salesRes.data);
      setProducts(productsRes.data.slice(0, 8));
    } catch (e) { console.error(e); }
  };

  const hero = slides[slide] || DEFAULT_HERO[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-black">
        <img
          key={slide}
          src={hero.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 animate-fade-in"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-24 w-full">
          <div className="max-w-3xl animate-fade-up">
            <div className="eyebrow mb-6">{hero.eyebrow}</div>
            <h1 className="display-mega text-glow-white mb-6" data-testid="hero-title">
              {highlightTitle(hero.title, hero.accent)}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl leading-relaxed">
              {hero.sub}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={hero.cta_link || '/products'} className="btn-pink" data-testid="hero-shop-now-btn">
                {hero.cta_text || 'Shop Now Lah'} <FaArrowRight size={14} />
              </Link>
              <a
                href="https://wa.me/60126884925?text=Hi%20Masterliqours"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <FaWhatsapp size={16} /> Chat With Us
              </a>
            </div>

            {/* Stats inside hero */}
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-xl border-t border-white/10 pt-8">
              <div>
                <div className="font-display text-4xl md:text-5xl neon-cyan-text">500+</div>
                <div className="text-xs uppercase tracking-wider text-white/50 mt-1">Premium Bottles</div>
              </div>
              <div>
                <div className="font-display text-4xl md:text-5xl neon-lime-text">24<span className="text-2xl">h</span></div>
                <div className="text-xs uppercase tracking-wider text-white/50 mt-1">Fast Delivery</div>
              </div>
              <div>
                <div className="font-display text-4xl md:text-5xl text-[#ffd700]" style={{textShadow:'0 0 25px rgba(255,215,0,0.4)'}}>5K+</div>
                <div className="text-xs uppercase tracking-wider text-white/50 mt-1">Happy Customers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-8 right-8 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-10 bg-[#ff007f]' : 'w-3 bg-white/30'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      <CategoryChips />

      {/* MY ACTIVE FLASH SALES (logged-in customers only) */}
      <MyFlashSales user={user} />

      {/* FLASH SALES */}
      {flashSales.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-[#050505] to-[#0a0a0a] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-12 bg-[#39ff14] flex items-center overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap gap-12 text-black font-display text-2xl uppercase">
              {Array(8).fill(0).map((_, i) => (
                <span key={i} className="flex items-center gap-3 shrink-0"><FaBolt /> Flash Sale · Limited Stock</span>
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-16">
            <div className="flex items-end justify-between mb-10 gap-6">
              <div>
                <div className="eyebrow mb-3">Limited Time</div>
                <h2 className="display-xl neon-pink-text">Flash Sales</h2>
              </div>
              <Link to="/products?promo=1" className="hidden sm:inline-flex items-center gap-2 text-sm uppercase tracking-wider font-bold text-white/60 hover:text-[#39ff14] transition-colors">
                View All <FaArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {flashSales.slice(0, 4).map((sale) => (
                <ProductCard key={sale.sale_id} product={sale.product} flashSale={sale} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-end justify-between mb-10 gap-6">
            <div>
              <div className="eyebrow mb-3">Crowd Favourites</div>
              <h2 className="display-xl">Popular <span className="neon-cyan-text">Drops</span></h2>
            </div>
            <Link to="/products" className="hidden sm:inline-flex items-center gap-2 text-sm uppercase tracking-wider font-bold text-white/60 hover:text-[#ff007f] transition-colors">
              See Everything <FaArrowRight size={12} />
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* TIER REWARDS */}
      <section className="py-20 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">Members Only</div>
            <h2 className="display-xl">Drink More, <span className="neon-lime-text">Earn More</span></h2>
            <p className="text-white/60 max-w-xl mx-auto mt-4">Every order earns points. Climb the tier ladder for shipping discounts & exclusive perks lah.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Regular */}
            <div className="surface p-8 flex flex-col">
              <FaUserShield size={28} className="text-white/40 mb-5" />
              <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Tier 1</div>
              <div className="display-md mb-4">Regular</div>
              <ul className="space-y-3 text-white/70 text-sm flex-1">
                <li className="flex items-start gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> Earn 1pt per RM10 spent</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> Newsletter promos</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#39ff14] mt-1 shrink-0" size={12} /> WhatsApp support</li>
              </ul>
            </div>

            {/* Gold */}
            <div className="surface p-8 flex flex-col relative overflow-hidden" style={{ borderColor: 'rgba(255,215,0,0.4)', boxShadow: '0 0 40px rgba(255,215,0,0.08)' }}>
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#ffd700]/10 rounded-full blur-3xl" />
              <FaTrophy size={28} className="text-[#ffd700] mb-5" />
              <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-2">Tier 2 · 5,000 pts</div>
              <div className="display-md mb-4 text-[#ffd700]">Gold</div>
              <ul className="space-y-3 text-white/80 text-sm flex-1">
                <li className="flex items-start gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> All Regular perks</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> <strong>RM50 off</strong> every shipping</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> Early access to flash sales</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#ffd700] mt-1 shrink-0" size={12} /> Birthday bonus 200pts</li>
              </ul>
            </div>

            {/* Platinum */}
            <div className="surface p-8 flex flex-col relative overflow-hidden" style={{ borderColor: 'rgba(0,240,255,0.4)', boxShadow: '0 0 40px rgba(0,240,255,0.08)' }}>
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#00f0ff]/10 rounded-full blur-3xl" />
              <FaGem size={28} className="text-[#00f0ff] mb-5" />
              <div className="text-xs uppercase tracking-[0.25em] text-[#00f0ff] mb-2">Tier 3 · 10,000 pts</div>
              <div className="display-md mb-4 neon-cyan-text">Platinum</div>
              <ul className="space-y-3 text-white/80 text-sm flex-1">
                <li className="flex items-start gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> All Gold perks</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> <strong>RM100 off</strong> shipping</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> <strong>3% off</strong> every order</li>
                <li className="flex items-start gap-2"><FaCheck className="text-[#00f0ff] mt-1 shrink-0" size={12} /> Dedicated staff line</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">How It Works</div>
            <h2 className="display-xl">Order → <span className="neon-pink-text">WhatsApp</span> → Settle.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Browse', d: 'Pick your bottles from 500+ premium drops.' },
              { n: '02', t: 'Checkout', d: 'Add to cart, enter delivery address, place order.' },
              { n: '03', t: 'WhatsApp', d: 'You get assigned a staff — chat them direct.' },
              { n: '04', t: 'Settle', d: 'Pay via QR, get delivery same-day (KL area).' },
            ].map((step) => (
              <div key={step.n} className="surface p-8 hover:border-[#ff007f]/40 transition-colors">
                <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-3">{step.n}</div>
                <div className="display-md mb-3">{step.t}</div>
                <p className="text-white/60 text-sm leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#ff007f] via-[#e60073] to-[#9b005a] p-12 lg:p-16">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,215,0,0.5), transparent 40%), radial-gradient(circle at 20% 80%, rgba(0,240,255,0.4), transparent 45%)',
            }} />
            <div className="relative max-w-2xl">
              <div className="eyebrow text-white mb-4">Ready Lah?</div>
              <h2 className="display-xl text-white mb-6">Premium liquor, terus ke pintu anda.</h2>
              <p className="text-white/90 text-lg mb-8">Free delivery for orders above RM1,250 in Peninsular Malaysia. 100% authentic, guaranteed.</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/products" className="btn-lime">
                  Start Shopping <FaArrowRight size={14} />
                </Link>
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
