import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaBolt, FaArrowRight, FaClock } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState(() => endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!endTime) return;
    const t = setInterval(() => setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (!endTime || remaining <= 0) return null;
  const totalSec = Math.floor(remaining / 1000);
  return { h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 };
};

const pad = (n) => String(n).padStart(2, '0');

const DrinkReveal = () => {
  const [data, setData] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const c = useCountdown(data?.reveal_end);

  useEffect(() => {
    axios.get(`${API}/drink-reveal/today`).then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data?.available) return null;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 30% 50%, rgba(255,0,127,0.15), transparent 50%), radial-gradient(circle at 80% 60%, rgba(0,240,255,0.12), transparent 55%)',
      }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff007f]/10 border border-[#ff007f]/40 mb-5">
            <FaBolt className="text-[#ff007f] animate-pulse" size={12} />
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#ff007f]">Daily Drop · 8 PM MY · 24h Only</span>
          </div>
          <h2 className="display-xl">Today's <span className="neon-pink-text">Drink Reveal</span></h2>
          <p className="text-white/60 mt-3 max-w-xl mx-auto text-sm">One bottle, one day, one mega discount. Tap to reveal lah boss.</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#150018] to-[#001520] grid grid-cols-1 md:grid-cols-2">
            {/* Image side with reveal overlay */}
            <div className="relative aspect-square md:aspect-auto bg-black overflow-hidden">
              <img
                src={data.product.image_url}
                alt={revealed ? data.product.name : 'Mystery drop'}
                className={`w-full h-full object-cover transition-all duration-700 ${revealed ? 'scale-100 blur-0' : 'scale-110 blur-2xl'}`}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'; }}
              />
              {!revealed && (
                <button
                  onClick={() => setRevealed(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all hover:bg-black/40"
                  data-testid="drink-reveal-tap"
                >
                  <div className="text-center px-6">
                    <div className="text-6xl mb-4 animate-pulse">✦</div>
                    <div className="display-lg neon-pink-text mb-2">Tap to Reveal</div>
                    <div className="text-white/60 text-xs uppercase tracking-[0.25em]">Mystery Drop Boss</div>
                  </div>
                </button>
              )}
              {revealed && (
                <div className="absolute top-4 left-4 bg-[#ff007f] text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg animate-fade-in">
                  <FaBolt size={10} /> -{data.discount_percentage}% Today Only
                </div>
              )}
            </div>

            {/* Details side */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              {revealed ? (
                <div className="animate-fade-in" data-testid="drink-reveal-detail">
                  <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-3">{data.product.category}</div>
                  <h3 className="display-lg mb-4">{data.product.name}</h3>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">{data.product.description}</p>

                  <div className="flex items-baseline gap-4 mb-6">
                    <div className="text-white/40 line-through text-lg">RM{data.product.price.toFixed(2)}</div>
                    <div className="display-mega neon-pink-text" style={{fontSize:'3rem',lineHeight:1}}>RM{data.discounted_price.toFixed(2)}</div>
                  </div>

                  {c && (
                    <div className="mb-6 bg-black/40 border border-white/10 rounded-2xl p-4">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[#39ff14] font-bold mb-2 flex items-center gap-1.5">
                        <FaClock size={10} /> Drop Ends In
                      </div>
                      <div className="flex items-end gap-2 font-display text-4xl leading-none" data-testid="drink-reveal-countdown">
                        <div><span className="neon-cyan-text">{pad(c.h)}</span><span className="text-xs text-white/40 ml-1">h</span></div>
                        <div className="text-white/30">:</div>
                        <div><span className="neon-cyan-text">{pad(c.m)}</span><span className="text-xs text-white/40 ml-1">m</span></div>
                        <div className="text-white/30">:</div>
                        <div><span className="neon-pink-text">{pad(c.s)}</span><span className="text-xs text-white/40 ml-1">s</span></div>
                      </div>
                    </div>
                  )}

                  <Link to={`/product/${data.product.product_id}`} className="btn-pink w-full" data-testid="drink-reveal-cta">
                    Grab Yours Lah <FaArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="text-center md:text-left">
                  <div className="eyebrow mb-3">Hint</div>
                  <div className="display-md text-white/40 mb-6">A premium {data.product.category} drop · {data.discount_percentage}% off</div>
                  <button onClick={() => setRevealed(true)} className="btn-pink" data-testid="drink-reveal-button">
                    Reveal Drop <FaArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DrinkReveal;
