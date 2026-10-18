import React, { useEffect, useRef } from 'react';

/*
 * Seasonal theming.
 * Deepavali 2026 falls on Sunday 8 Nov (Monday 9 Nov is the replacement holiday in most states).
 * Decorations switch on automatically from 22 Oct to 11 Nov 2026 (Malaysia time).
 * Preview any time with ?season=deepavali, force off with ?season=off (remembered for the browser tab).
 */
const WINDOWS = [{ id: 'deepavali', from: '2026-10-22T00:00:00+08:00', to: '2026-11-12T00:00:00+08:00' }];

export function currentSeason() {
  try {
    const q = new URLSearchParams(window.location.search).get('season');
    if (q) sessionStorage.setItem('ml_season', q);
    const forced = sessionStorage.getItem('ml_season');
    if (forced === 'off') return null;
    if (forced && WINDOWS.some(w => w.id === forced)) return forced;
  } catch { /* storage blocked: fall through to dates */ }
  const now = Date.now();
  const w = WINDOWS.find(w => now >= Date.parse(w.from) && now < Date.parse(w.to));
  return w ? w.id : null;
}

/* A small brass diya with a flickering flame */
export const Diya = ({ size = 34, delay = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ overflow: 'visible' }}>
    <defs>
      <radialGradient id="dv-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffd27a" stopOpacity=".9" />
        <stop offset="1" stopColor="#ff8a00" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="dv-brass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe08a" />
        <stop offset=".55" stopColor="#d9902a" />
        <stop offset="1" stopColor="#8a4a0e" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="24" r="20" fill="url(#dv-glow)" className="dv-halo" style={{ animationDelay: `${delay}s` }} />
    <path className="dv-flame" style={{ animationDelay: `${delay}s` }} d="M32 8c5 8 7 12 7 16a7 7 0 0 1-14 0c0-4 2-8 7-16z" fill="#ffb21a" />
    <path className="dv-flame" style={{ animationDelay: `${delay + .15}s` }} d="M32 15c3 5 4 7 4 9.5a4 4 0 0 1-8 0c0-2.5 1-4.5 4-9.5z" fill="#fff3c4" />
    <path d="M6 34c4 10 14 16 26 16s22-6 26-16c-8 3-17 4-26 4S14 37 6 34z" fill="url(#dv-brass)" />
    <path d="M6 34c8 3 17 4 26 4s18-1 26-4" fill="none" stroke="#fff1c2" strokeOpacity=".6" strokeWidth="1.2" />
    <path d="M24 50h16l-3 6H27z" fill="#a85f15" />
  </svg>
);

/* Marigold & mango-leaf garland (toran) that hangs under the header */
export const DeepavaliGarland = () => {
  const swags = 9;
  return (
    <div className="dv-garland" aria-hidden="true">
      <svg viewBox={`0 0 ${swags * 120} 44`} preserveAspectRatio="none" width="100%" height="44">
        <path d={`M0 4 H${swags * 120}`} stroke="#6b3a10" strokeWidth="2" />
        {Array.from({ length: swags }, (_, i) => {
          const x = i * 120;
          const flowers = Array.from({ length: 9 }, (_, k) => {
            const t = k / 8, fx = x + 6 + t * 108, fy = 6 + Math.sin(t * Math.PI) * 22;
            return <circle key={k} cx={fx} cy={fy} r={k % 2 ? 5.2 : 6} fill={k % 3 === 0 ? '#ff9f1a' : k % 3 === 1 ? '#ffc21a' : '#ff6a00'} stroke="#c25a00" strokeWidth=".8" />;
          });
          return (
            <g key={i}>
              {flowers}
              <path d={`M${x + 60} 30 q -7 8 0 14 q 7 -6 0 -14z`} fill="#2f8a3a" />
              <circle cx={x + 120} cy="6" r="4" fill="#ffd700" />
            </g>
          );
        })}
      </svg>
      <div className="dv-garland-diyas">
        <Diya size={30} /><Diya size={30} delay={.4} />
      </div>
    </div>
  );
};

/* Soft gold sparkles drifting up the page — light, pauses when the tab is hidden */
export const DeepavaliSparkles = () => {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current, g = cv.getContext('2d');
    let W = 0, H = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { W = cv.width = window.innerWidth * dpr; H = cv.height = window.innerHeight * dpr; };
    size(); window.addEventListener('resize', size);
    const n = window.innerWidth < 640 ? 18 : 34;
    const dots = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .00025 + Math.random() * .0006, w: Math.random() * 6.28 }));
    const tick = () => {
      g.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.y -= d.v; d.w += .02; if (d.y < -.02) { d.y = 1.02; d.x = Math.random(); }
        const x = (d.x + Math.sin(d.w) * .006) * W, y = d.y * H, r = d.r * dpr, a = .35 + Math.sin(d.w * 2) * .25;
        const grd = g.createRadialGradient(x, y, 0, x, y, r * 5);
        grd.addColorStop(0, `rgba(255,214,110,${a})`); grd.addColorStop(1, 'rgba(255,170,40,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r * 5, 0, 6.29); g.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); };
    document.addEventListener('visibilitychange', vis); vis();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return <canvas ref={ref} className="dv-sparkles" aria-hidden="true" />;
};

/* The greeting card on the home page */
export const DeepavaliGreeting = () => (
  <section className="dv-greet" aria-label="Deepavali greeting">
    <div className="dv-kolam" aria-hidden="true" />
    <div className="dv-greet-diyas" aria-hidden="true"><Diya size={44} /><Diya size={52} delay={.3} /><Diya size={44} delay={.6} /></div>
    <div>
      <div className="dv-greet-kicker">Selamat Hari Deepavali</div>
      <h2 className="dv-greet-title">Light up the celebration</h2>
      <p className="dv-greet-copy">Festive bottles for open house and family gatherings, delivered across KL &amp; Klang Valley. Order early: Deepavali is Sunday 8 November.</p>
    </div>
  </section>
);
