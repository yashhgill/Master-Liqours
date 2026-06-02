import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FALLBACK_BRANDS = [
  { name: 'Johnnie Walker', short_name: 'Walker', color_hex: '#d4af37', subtitle: 'Striding Man' },
  { name: 'Chivas Regal',   short_name: 'Chivas', color_hex: '#1f4a8c', subtitle: 'Since 1801' },
];

const BrandCard = ({ brand }) => {
  const display = brand.short_name || brand.name;
  const color = brand.color_hex || '#1a1a1a';
  const slug = (brand.short_name || brand.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const searchTerm = brand.search_term || brand.name;

  return (
    <Link
      to={`/products?search=${encodeURIComponent(searchTerm)}`}
      className="group shrink-0 snap-start w-[220px] aspect-[4/5] rounded-3xl overflow-hidden relative transition-all hover:scale-[1.02]"
      data-testid={`brand-card-${slug}`}
    >
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 60%, ${color}88 100%)` }}
      />
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5) 0%, transparent 40%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

      {brand.logo_url && (
        <img
          src={brand.logo_url}
          alt={brand.name}
          className="absolute inset-0 w-full h-full object-contain p-8 mix-blend-screen opacity-90"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}

      <div className="relative h-full flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">{brand.subtitle || ''}</div>
          <div className="text-white/60 text-xs">★</div>
        </div>
        <div>
          {!brand.logo_url && (
            <div className="font-display text-4xl leading-[0.85] uppercase text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              {display}
            </div>
          )}
          <div className={`mt-3 text-[10px] uppercase tracking-[0.25em] font-bold flex items-center gap-1.5 ${brand.logo_url ? 'text-white' : 'text-white/70'}`}>
            Shop now <FaArrowRight size={9} />
          </div>
        </div>
      </div>
    </Link>
  );
};

const BrandCarousel = () => {
  const ref = useRef(null);
  const [brands, setBrands] = useState(FALLBACK_BRANDS);

  useEffect(() => {
    axios.get(`${API}/brands`).then((r) => {
      if (Array.isArray(r.data) && r.data.length > 0) setBrands(r.data);
    }).catch(() => {});
  }, []);

  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });

  if (brands.length === 0) return null;

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
            <button onClick={() => scroll(-1)} className="w-11 h-11 rounded-full border border-white/15 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" aria-label="Scroll left"><FaArrowLeft size={12} /></button>
            <button onClick={() => scroll(1)} className="w-11 h-11 rounded-full border border-white/15 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center transition-all" aria-label="Scroll right"><FaArrowRight size={12} /></button>
          </div>
        </div>

        <div ref={ref} className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }} data-testid="brand-carousel">
          {brands.map((b) => <BrandCard key={b.brand_id || b.name} brand={b} />)}
        </div>

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
