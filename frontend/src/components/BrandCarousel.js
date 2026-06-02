import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

/**
 * Brand carousel — premium liquor brands featured on the home page.
 *
 * Each brand card is a styled white panel with brand's signature color tone.
 * Clicks navigate to /products?search={brand} (uses existing Products search filter).
 *
 * To swap to real image logos later, replace the `font`/`color` config with
 * an `image_url` prop and render <img> instead of styled text.
 */
const BRANDS = [
  { name: 'Johnnie Walker',  short: 'Walker',    color: '#d4af37', subtitle: 'Striding Man',  tone: 'gold' },
  { name: 'Chivas Regal',    short: 'Chivas',    color: '#1f4a8c', subtitle: 'Since 1801',    tone: 'blue' },
  { name: 'Jack Daniel\'s',  short: "Jack D's",  color: '#000000', subtitle: 'Old No. 7',     tone: 'noir' },
  { name: 'Hennessy',        short: 'Hennessy',  color: '#4a2c14', subtitle: 'V.S Cognac',    tone: 'brown' },
  { name: 'Heineken',        short: 'Heineken',  color: '#01703f', subtitle: 'Open Your World', tone: 'green' },
  { name: 'Absolut',         short: 'Absolut',   color: '#1a47ce', subtitle: 'Vodka · Sweden', tone: 'cobalt' },
  { name: 'Bombay Sapphire', short: 'Bombay',    color: '#1f7cb8', subtitle: 'Premium Gin',   tone: 'sapphire' },
  { name: 'Bacardi',         short: 'Bacardi',   color: '#000000', subtitle: 'Caribbean Rum', tone: 'noir' },
  { name: 'Tiger Beer',      short: 'Tiger',     color: '#e87722', subtitle: 'Singapore SG',  tone: 'amber' },
  { name: 'Carlsberg',       short: 'Carlsberg', color: '#00513f', subtitle: 'Probably Best', tone: 'green' },
  { name: 'Moët & Chandon',  short: 'Moët',      color: '#1a1a1a', subtitle: 'Champagne',     tone: 'noir' },
  { name: 'Don Julio',       short: 'Don Julio', color: '#7a5c1c', subtitle: 'Tequila',       tone: 'gold' },
];

const BrandCarousel = () => {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });

  return (
    <section className="py-20 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <div className="eyebrow mb-3">Top Shelf</div>
            <h2 className="display-xl">Shop By <span className="neon-cyan-text">Brand</span></h2>
            <p className="text-white/60 mt-3 max-w-xl text-sm">100% authentic premium brands — all the heavyweights in one shop boss.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => scroll(-1)} className="w-11 h-11 rounded-full border border-white/15 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" aria-label="Scroll left">
              <FaArrowLeft size={12} />
            </button>
            <button onClick={() => scroll(1)} className="w-11 h-11 rounded-full border border-white/15 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" aria-label="Scroll right">
              <FaArrowRight size={12} />
            </button>
          </div>
        </div>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
          data-testid="brand-carousel"
        >
          {BRANDS.map((b) => (
            <Link
              key={b.name}
              to={`/products?search=${encodeURIComponent(b.name)}`}
              className="group shrink-0 snap-start w-[220px] aspect-[4/5] rounded-3xl overflow-hidden relative transition-all hover:scale-[1.02]"
              data-testid={`brand-card-${b.short.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              {/* Brand color backdrop */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${b.color} 0%, ${b.color}cc 60%, ${b.color}88 100%)`,
                }}
              />
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-25 mix-blend-overlay"
                style={{
                  backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5) 0%, transparent 40%)',
                }}
              />
              {/* Foil shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">{b.subtitle}</div>
                  <div className="text-white/60 text-xs">★</div>
                </div>

                <div>
                  <div className="font-display text-4xl leading-[0.85] uppercase text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                    {b.short}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.25em] font-bold text-white/70 flex items-center gap-1.5">
                    Shop now <FaArrowRight size={9} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.25em] text-white/40 flex-wrap">
          <span>✓ 100% Authentic</span>
          <span className="text-white/15">·</span>
          <span>✓ Direct from Distributors</span>
          <span className="text-white/15">·</span>
          <span>✓ Sealed & Verified</span>
        </div>
      </div>
    </section>
  );
};

export default BrandCarousel;
