import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context';
import { FaShoppingBag, FaBolt, FaClock, FaWhatsapp, FaHourglassHalf } from 'react-icons/fa';
import { resolveImageUrl } from '../lib/imageUrl';

const BOSS_WA = process.env.REACT_APP_PREORDER_WHATSAPP || '60182085097';
const BOSS_NAME = process.env.REACT_APP_BOSS_NAME || 'Boss';

const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState(() => endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!endTime) return;
    const t = setInterval(() => setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (!endTime || remaining <= 0) return null;
  const totalSec = Math.floor(remaining / 1000);
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
};

const pad = (n) => String(n).padStart(2, '0');

const ProductCard = ({ product, flashSale, totalStock }) => {
  const { addToCart } = useCart();
  const countdown = useCountdown(flashSale?.end_time);

  // Use explicit flashSale prop if given, otherwise derive from product.original_price
  const derivedDiscountPct = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  const price = flashSale ? flashSale.discounted_price : product.price;
  const originalPrice = flashSale ? product.price : product.original_price;
  const discountPct = flashSale ? flashSale.discount_percentage : derivedDiscountPct;
  const hasDiscount = discountPct > 0;
  const isOutOfStock = typeof totalStock === 'number' && totalStock === 0;
  const isPreorder = product.is_preorder;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isPreorder) return;
    addToCart(product);
  };

  const handlePreorder = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = `Hi! I'm interested in *${product.name}* (RM${price.toFixed(2)}). Is it available / can I pre-order?`;
    window.open(`https://wa.me/${BOSS_WA.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOutOfStock = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = `Hi! I'd like to pre-order *${product.name}* (RM${price.toFixed(2)}). When will it be back in stock?`;
    window.open(`https://wa.me/${BOSS_WA.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Determine card state
  const cardState = isPreorder ? 'preorder' : isOutOfStock ? 'oos' : 'available';

  return (
    <Link
      to={`/product/${product.product_id}`}
      className={`product-card-white group block relative ${cardState !== 'available' ? 'opacity-90' : ''}`}
      data-testid={`product-card-${product.product_id}`}
    >
      {/* Flash sale badge */}
      {hasDiscount && cardState === 'available' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-[#ff007f] text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <FaBolt size={10} /> -{discountPct}%
          </div>
        </div>
      )}

      {/* State badges */}
      {cardState === 'preorder' && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-[#ffd70020] border border-[#ffd700] text-[#ffd700] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
            <FaHourglassHalf size={9} /> Pre-order
          </div>
        </div>
      )}
      {cardState === 'oos' && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/80 text-white/70 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/20">
            Out of Stock
          </div>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              cardState !== 'available' ? 'grayscale-[40%]' : 'group-hover:scale-110'
            }`}
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
        )}

        {/* Flash countdown */}
        {countdown && cardState === 'available' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm text-white px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-bold text-[#39ff14]">
              <FaClock size={10} /> Ends in
            </div>
            <div className="flex items-center gap-1 font-display text-base leading-none">
              {countdown.d > 0 && <><span>{countdown.d}d</span><span className="text-white/30">:</span></>}
              <span>{pad(countdown.h)}</span><span className="text-white/30 animate-pulse">:</span>
              <span>{pad(countdown.m)}</span><span className="text-white/30 animate-pulse">:</span>
              <span className="neon-pink-text">{pad(countdown.s)}</span>
            </div>
          </div>
        )}

        {/* Preorder overlay */}
        {cardState === 'preorder' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center px-4">
              <FaHourglassHalf size={28} className="text-[#ffd700] mx-auto mb-2" />
              <p className="text-white font-bold text-sm">Pre-order — Check Boss</p>
              <p className="text-[#25d366] text-xs mt-1 font-bold">+{BOSS_WA.replace(/\D/g, '')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-2">{product.category}</div>
        <h3 className="font-display text-2xl uppercase leading-none mb-3 line-clamp-2 group-hover:text-[#ff007f] transition-colors">
          {product.name}
        </h3>

        <div className="flex items-end justify-between gap-3">
          <div>
            {hasDiscount && cardState === 'available' && (
              <div className="text-xs text-gray-400 line-through">RM{(originalPrice || product.price).toFixed(2)}</div>
            )}
            <div className={`font-display text-3xl ${cardState !== 'available' ? 'text-gray-500' : 'text-[#ff007f]'}`}>
              {cardState === 'preorder' ? (
                <span className="text-[#ffd700]">TBC</span>
              ) : (
                `RM${price.toFixed(2)}`
              )}
            </div>
          </div>

          {/* Action button */}
          {cardState === 'preorder' && (
            <button onClick={handlePreorder}
              className="flex items-center gap-1.5 bg-[#ffd700] text-black px-3 py-2 rounded-full text-xs font-black hover:brightness-110 transition-all whitespace-nowrap"
              data-testid={`product-card-preorder-btn-${product.product_id}`}>
              <FaWhatsapp size={13} /> Check Boss
            </button>
          )}
          {cardState === 'oos' && (
            <button onClick={handleOutOfStock}
              className="flex items-center gap-1.5 bg-[#25d366] text-white px-3 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all whitespace-nowrap"
              data-testid={`product-card-oos-btn-${product.product_id}`}>
              <FaWhatsapp size={13} /> Pre-order
            </button>
          )}
          {cardState === 'available' && (
            <button onClick={handleAdd}
              className="bg-black text-white p-3 rounded-full hover:bg-[#ff007f] transition-all hover:scale-110"
              data-testid={`product-card-add-btn-${product.product_id}`}>
              <FaShoppingBag size={16} />
            </button>
          )}
        </div>

        {/* Preorder note with boss contact */}
        {cardState === 'preorder' && (
          <div className="mt-3 bg-[#ffd70010] rounded-lg px-3 py-2 border border-[#ffd700]/20 space-y-1">
            <div className="text-[10px] text-[#ffd700]/80">🕐 Wait first lah — check with boss before ordering.</div>
            <div className="flex items-center gap-1.5">
              <FaWhatsapp size={10} className="text-[#25d366]" />
              <span className="text-[10px] text-white/60">Boss: </span>
              <a href={`https://wa.me/${BOSS_WA.replace(/\D/g, '')}`} onClick={e => e.stopPropagation()}
                className="text-[10px] text-[#25d366] font-bold hover:underline">
                +{BOSS_WA.replace(/\D/g, '')}
              </a>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
