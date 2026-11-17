import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight, FaTruck, FaGift, FaShieldAlt, FaGlassCheers } from 'react-icons/fa';
import { nextNewYear } from './Seasonal';
import { resolveImageUrl } from '../lib/imageUrl';

/*
 * Christmas (21–28 Dec) and New Year (29 Dec – 3 Jan) decorations.
 * Everything here is original artwork drawn in code, in Masterliqours' own
 * palette (neon pink #ff007f, cyan #00f0ff, gold) with festive red/green/gold accents.
 */

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const prettyName = (raw) => String(raw || '').split(/\s+/).map((w) => {
  const u = w.toUpperCase();
  if (u === 'JW') return 'Johnnie Walker';
  if (/^\d+(\.\d+)?(ML|CL)$/.test(u)) return w.toLowerCase();
  if (/\d/.test(w) || ['XO', 'VS', 'VSOP', 'NV'].includes(u)) return u;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}).join(' ');

/* ───────────────────────── string lights under the header ───────────────────────── */
export const FestiveLights = ({ variant = 'christmas' }) => {
  const n = 28;
  const colors = variant === 'newyear'
    ? ['#ffd27a', '#fff3c4', '#ffb21a', '#ffffff']
    : ['#ff2d55', '#ffd27a', '#2bd96b', '#ff007f', '#00f0ff'];
  return (
    <div className="fx-lights" aria-hidden="true">
      <svg viewBox={`0 0 ${n * 50} 46`} preserveAspectRatio="none" width="100%" height="46">
        <path d={Array.from({ length: n }, (_, i) => `${i ? '' : 'M0 6 '}Q ${i * 50 + 25} 26 ${(i + 1) * 50} 6`).join(' ')} fill="none" stroke="#1b1b1b" strokeWidth="2.2" />
      </svg>
      <div className="fx-bulbs">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="fx-bulb" style={{ left: `${((i + 0.5) / n) * 100}%`, '--c': colors[i % colors.length], animationDelay: `${(i % 7) * 0.37}s` }} />
        ))}
      </div>
    </div>
  );
};

/* ───────────────────────── gentle snowfall (Christmas) ───────────────────────── */
export const Snowfall = () => {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced()) return;
    const cv = ref.current, g = cv.getContext('2d');
    let W = 0, H = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { W = cv.width = window.innerWidth * dpr; H = cv.height = window.innerHeight * dpr; };
    size(); window.addEventListener('resize', size);
    const n = window.innerWidth < 640 ? 34 : 70;
    const flakes = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 2.2, v: .0004 + Math.random() * .0009, w: Math.random() * 6.28, s: .2 + Math.random() * .6 }));
    const tick = () => {
      g.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.y += f.v; f.w += .012;
        if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
        const x = (f.x + Math.sin(f.w) * .01) * W, y = f.y * H;
        g.globalAlpha = f.s; g.fillStyle = '#fff';
        g.beginPath(); g.arc(x, y, f.r * dpr, 0, 6.29); g.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); };
    document.addEventListener('visibilitychange', vis); vis();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return <canvas ref={ref} className="fx-overlay" aria-hidden="true" />;
};

/* ───────────────────────── fireworks (New Year) ───────────────────────── */
function useFireworks(ref, { contained = false, rate = 1 } = {}) {
  useEffect(() => {
    if (reduced()) return;
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, last = 0, next = 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      const b = contained ? cv.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      W = cv.width = b.width * dpr; H = cv.height = b.height * dpr;
    };
    size(); window.addEventListener('resize', size);
    const palette = ['#ffd27a', '#fff3c4', '#ff007f', '#00f0ff', '#ffb21a'];
    let parts = [];
    const burst = () => {
      const x = W * (.12 + Math.random() * .76), y = H * (.12 + Math.random() * .4);
      const c = palette[(Math.random() * palette.length) | 0];
      const n = (window.innerWidth < 640 ? 34 : 56) * (contained ? 1 : .8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283, sp = (1.2 + Math.random() * 2.4) * dpr;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c });
      }
    };
    const tick = (t) => {
      if (t - last > next) { burst(); last = t; next = (1400 + Math.random() * 1800) / rate; }
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += .035 * dpr; p.vx *= .985; p.vy *= .985; p.life -= .013;
        g.globalAlpha = Math.max(p.life, 0) * (contained ? .95 : .55);
        g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 1.6 * dpr, 0, 6.29); g.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); };
    document.addEventListener('visibilitychange', vis); vis();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis); };
  }, [ref, contained, rate]);
}

export const Fireworks = () => {
  const ref = useRef(null);
  useFireworks(ref, { rate: .6 });
  return <canvas ref={ref} className="fx-overlay" aria-hidden="true" />;
};

/* ───────────────────────── countdown ───────────────────────── */
function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const { at, year } = nextNewYear(now);
  const ms = Math.max(0, at - now);
  return { year, done: ms === 0, d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
}

const Countdown = () => {
  const c = useCountdown();
  if (c.done) return <div className="fx-ny-cheers"><FaGlassCheers /> Cheers to {c.year}!</div>;
  return (
    <div className="fx-count" aria-label={`Countdown to ${c.year}`}>
      {[['Days', c.d], ['Hrs', c.h], ['Min', c.m], ['Sec', c.s]].map(([l, v]) => (
        <div key={l} className="fx-count-cell"><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>
      ))}
    </div>
  );
};

/* ───────────────────────── a tree drawn from fairy lights ───────────────────────── */
const LightTree = () => {
  const pts = [];
  const turns = 6.5, N = 120;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = 30 + t * 330;
    const r = 6 + t * 130;
    const a = t * turns * 6.283;
    pts.push({ x: 200 + Math.cos(a) * r, y: y + Math.sin(a) * r * .12, z: Math.sin(a), i });
  }
  const cols = ['#ff007f', '#ffd27a', '#00f0ff', '#ff2d55', '#2bd96b'];
  return (
    <svg className="fx-tree" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="fx-star"><stop offset="0" stopColor="#fff8dc" /><stop offset=".5" stopColor="#ffd27a" /><stop offset="1" stopColor="#ffb21a" stopOpacity="0" /></radialGradient>
      </defs>
      {pts.filter((p) => p.z < 0).map((p) => <circle key={p.i} cx={p.x} cy={p.y} r="2.2" fill={cols[p.i % 5]} opacity=".35" />)}
      {pts.filter((p) => p.z >= 0).map((p) => <circle key={p.i} className="fx-twinkle" style={{ animationDelay: `${(p.i % 9) * .27}s` }} cx={p.x} cy={p.y} r="3.4" fill={cols[p.i % 5]} />)}
      <circle cx="200" cy="22" r="26" fill="url(#fx-star)" className="fx-pulse" />
      <path d="M200 6l4.7 9.6 10.6 1.5-7.6 7.5 1.8 10.5L200 30l-9.5 5.1 1.8-10.5-7.6-7.5 10.6-1.5z" fill="#fff3c4" />
      <rect x="186" y="372" width="28" height="18" rx="3" fill="#3a1d0a" opacity=".7" />
    </svg>
  );
};

/* ───────────────────────── bottle tiles (real shop photos) ───────────────────────── */
const BottleFan = ({ items, ribbon }) => (
  <div className="fx-fan">
    {items.slice(0, 3).map((p, i) => (
      <Link key={p.product_id} to={`/product/${p.product_id}`} className={`fx-tile fx-tile-${i}`} aria-label={prettyName(p.name)}>
        <img src={resolveImageUrl(p.image_url)} alt={prettyName(p.name)} loading="lazy" />
        {ribbon && <span className="fx-ribbon" aria-hidden="true" />}
        <span className="fx-tag">RM{Math.round(p.price).toLocaleString('en-MY')}</span>
      </Link>
    ))}
  </div>
);

function useFestiveBottles(season) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const params = season === 'newyear'
      ? { page: 1, limit: 12, sort: 'random', category: 'Champagne' }
      : { page: 1, limit: 12, sort: 'random', available_only: true };
    axios.get(API + '/products', { params })
      .then((r) => {
        let list = (r.data?.products || []).filter((p) => p.image_url);
        // In-stock first so the poster sells what can go out today
        list = [...list.filter((p) => !p.is_preorder), ...list.filter((p) => p.is_preorder)];
        if (list.length >= 3 || season !== 'newyear') return setItems(list);
        return axios.get(API + '/products', { params: { page: 1, limit: 12, sort: 'random', available_only: true } })
          .then((r2) => setItems([...list, ...(r2.data?.products || []).filter((p) => p.image_url)]));
      })
      .catch(() => {});
  }, [season]);
  return items;
}

/* ───────────────────────── home-page hero posters ───────────────────────── */
export const ChristmasHero = () => {
  const bottles = useFestiveBottles('christmas');
  return (
    <div className="fx-hero fx-xmas">
      <div className="fx-bokeh" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i, top: `${8 + ((i * 37) % 80)}%` }} />)}</div>
      <div className="fx-hero-copy">
        <div className="fx-kicker">Masterliqours · Festive Season</div>
        <h2 className="fx-title"><span>Merry</span><em>Christmas</em></h2>
        <p className="fx-sub">Party bottles and gifts delivered the same day across KL &amp; Klang Valley. Order early for Christmas Eve.</p>
        <div className="fx-ctas">
          <Link to="/products?available=1" className="fx-btn">Shop festive bottles <FaArrowRight size={12} /></Link>
          <Link to="/bulk-order" className="fx-btn-ghost">Party &amp; bulk orders</Link>
        </div>
        <div className="fx-chips">
          <span><FaTruck /> Same-day delivery</span>
          <span><FaGift /> Free delivery over RM1,250</span>
          <span><FaShieldAlt /> 100% authentic</span>
        </div>
      </div>
      <div className="fx-hero-art">
        <LightTree />
        {bottles.length >= 3 && <BottleFan items={bottles} ribbon />}
      </div>
    </div>
  );
};

export const NewYearHero = () => {
  const ref = useRef(null);
  useFireworks(ref, { contained: true, rate: 1 });
  const bottles = useFestiveBottles('newyear');
  const { year } = nextNewYear();
  return (
    <div className="fx-hero fx-ny">
      <canvas ref={ref} className="fx-hero-fw" aria-hidden="true" />
      <div className="fx-hero-copy">
        <div className="fx-kicker">Masterliqours · Countdown</div>
        <h2 className="fx-title fx-title-ny"><span>Happy New Year</span><em className="fx-year">{year}</em></h2>
        <Countdown />
        <p className="fx-sub">Champagne, spirits and party stock delivered the same day across KL &amp; Klang Valley. Order before the rush.</p>
        <div className="fx-ctas">
          <Link to="/products?category=Champagne" className="fx-btn fx-btn-gold">Shop champagne <FaArrowRight size={12} /></Link>
          <Link to="/products?available=1" className="fx-btn-ghost">All in-stock bottles</Link>
        </div>
      </div>
      <div className="fx-hero-art">
        <div className="fx-glow-ring" aria-hidden="true" />
        {bottles.length >= 3 && <BottleFan items={bottles} />}
      </div>
    </div>
  );
};

/* ───────────────────────── greeting cards further down the home page ───────────────────────── */
export const ChristmasGreeting = () => (
  <section className="fx-greet fx-greet-xmas" aria-label="Christmas greeting">
    <div>
      <div className="fx-kicker">Season's greetings</div>
      <h2 className="fx-greet-title">Merry Christmas from Masterliqours</h2>
      <p className="fx-greet-copy">Hosting this week? Stock up early: same-day delivery across KL &amp; Klang Valley, free delivery on orders above RM1,250, and bulk orders for office parties and family dinners.</p>
    </div>
    <Link to="/bulk-order" className="fx-btn">Plan a party order <FaArrowRight size={12} /></Link>
  </section>
);

export const NewYearGreeting = () => {
  const { year } = nextNewYear();
  return (
    <section className="fx-greet fx-greet-ny" aria-label="New Year greeting">
      <div>
        <div className="fx-kicker">Countdown to {year}</div>
        <h2 className="fx-greet-title">Ring in {year} with the right bottle</h2>
        <p className="fx-greet-copy">Champagne for midnight, spirits for the party. Order before the 31st to beat the New Year's Eve rush. 21+ only, drink responsibly.</p>
      </div>
      <Countdown />
    </section>
  );
};
