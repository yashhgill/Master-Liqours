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
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
};

const pad = (n) => String(n).padStart(2, '0');

const FlashSaleStripItem = ({ sale }) => {
  const c = useCountdown(sale.end_time);
  return (
    <Link
      to={`/product/${sale.product.product_id}`}
      className="group shrink-0 w-[280px] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#ff007f]/60 transition-all"
      data-testid={`my-flash-${sale.product.product_id}`}
    >
      <div className="relative aspect-[16/10] bg-white overflow-hidden">
        <img
          src={sale.product.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400'}
          alt={sale.product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400'; }}
        />
        <div className="absolute top-3 left-3 bg-[#ff007f] text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
          <FaBolt size={10} /> -{sale.discount_percentage}%
        </div>
        {c && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#39ff14] font-bold flex items-center gap-1"><FaClock size={9} />Ends</span>
            <span className="font-display text-base">{pad(c.h)}<span className="text-white/30 animate-pulse">:</span>{pad(c.m)}<span className="text-white/30 animate-pulse">:</span><span className="neon-pink-text">{pad(c.s)}</span></span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">{sale.product.category}</div>
        <h4 className="font-display text-lg uppercase leading-tight mt-1 line-clamp-2 group-hover:text-[#ff007f] transition-colors">{sale.product.name}</h4>
        <div className="flex items-end justify-between mt-2">
          <div className="text-xs text-white/40 line-through">RM{sale.original_price.toFixed(2)}</div>
          <div className="font-display text-2xl neon-pink-text">RM{sale.discounted_price.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
};

const MyFlashSales = ({ user }) => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/flash-sales/active`).then((r) => setSales(r.data || [])).catch(() => {});
  }, [user]);

  if (!user || sales.length === 0) return null;

  return (
    <section className="py-14 bg-gradient-to-r from-[#1a0010] via-[#0a0a0a] to-[#001318] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="eyebrow mb-2 text-[#39ff14]">For You · {user.name}</div>
            <h2 className="display-lg">Your <span className="neon-pink-text">Active Drops</span></h2>
            <p className="text-white/60 mt-2 max-w-xl text-sm">Flash sales running right now boss — grab them before timer habis lah.</p>
          </div>
          <Link to="/products?promo=1" className="inline-flex items-center gap-2 text-sm uppercase tracking-wider font-bold text-white/70 hover:text-[#ff007f] transition-colors" data-testid="my-flash-view-all">
            View All <FaArrowRight size={12} />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }} data-testid="my-flash-strip">
          {sales.map((sale) => <FlashSaleStripItem key={sale.sale_id} sale={sale} />)}
        </div>
      </div>
    </section>
  );
};

export default MyFlashSales;
