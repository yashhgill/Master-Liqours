import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context';
import { FaShoppingBag, FaBolt, FaClock } from 'react-icons/fa';

const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState(() => endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!endTime) return;
    const t = setInterval(() => {
      setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (!endTime || remaining <= 0) return null;
  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s, expired: false };
};

const ProductCard = ({ product, flashSale }) => {
  const { addToCart } = useCart();
  const countdown = useCountdown(flashSale?.end_time);

  const price = flashSale ? flashSale.discounted_price : product.price;
  const hasDiscount = flashSale && flashSale.discount_percentage > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <Link
      to={`/product/${product.product_id}`}
      className="product-card-white group block relative"
      data-testid={`product-card-${product.product_id}`}
    >
      {hasDiscount && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-[#ff007f] text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <FaBolt size={10} />
            -{flashSale.discount_percentage}%
          </div>
        </div>
      )}

      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
        )}
        {/* Countdown overlay */}
        {countdown && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm text-white px-3 py-2 flex items-center justify-between gap-2"
            data-testid={`countdown-${product.product_id}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-bold text-[#39ff14]">
              <FaClock size={10} /> Ends in
            </div>
            <div className="flex items-center gap-1 font-display text-base leading-none">
              {countdown.d > 0 && <><span>{countdown.d}d</span><span className="text-white/30">:</span></>}
              <span>{pad(countdown.h)}</span>
              <span className="text-white/30 animate-pulse">:</span>
              <span>{pad(countdown.m)}</span>
              <span className="text-white/30 animate-pulse">:</span>
              <span className="neon-pink-text">{pad(countdown.s)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-2">{product.category}</div>
        <h3 className="font-display text-2xl uppercase leading-none mb-3 line-clamp-2 group-hover:text-[#ff007f] transition-colors">
          {product.name}
        </h3>

        <div className="flex items-end justify-between gap-3">
          <div>
            {hasDiscount && (
              <div className="text-xs text-gray-400 line-through">RM{product.price.toFixed(2)}</div>
            )}
            <div className="font-display text-3xl text-[#ff007f]">RM{price.toFixed(2)}</div>
          </div>
          <button
            onClick={handleAdd}
            className="bg-black text-white p-3 rounded-full hover:bg-[#ff007f] transition-all hover:scale-110"
            data-testid={`product-card-add-btn-${product.product_id}`}
          >
            <FaShoppingBag size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
