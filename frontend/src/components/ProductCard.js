import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context';
import { FaShoppingBag, FaBolt, FaClock, FaWhatsapp } from 'react-icons/fa';
import { resolveImageUrl } from '../lib/imageUrl';

const PREORDER_WA = process.env.REACT_APP_PREORDER_WHATSAPP || '60126884925';

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
  return { d, h, m, s };
};

const ProductCard = ({ product, flashSale, totalStock }) => {
  const { addToCart } = useCart();
  const countdown = useCountdown(flashSale?.end_time);

  const price = flashSale ? flashSale.discounted_price : product.price;
  const hasDiscount = flashSale && flashSale.discount_percentage > 0;

  // totalStock: number passed in from parent, undefined = unknown (don't show OOS)
  const isOutOfStock = typeof totalStock === 'number' && totalStock === 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product);
  };

  const handlePreorder = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = `Hi! I'd like to pre-order *${product.name}* (RM${price.toFixed(2)}). Is it available soon?`;
    window.open(`https://wa.me/${PREORDER_WA.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <Link
      to={`/product/${product.product_id}`}
      className={`product-card-white group block relative ${isOutOfStock ? 'opacity-80' : ''}`}
      data-testid={`product-card-${product.product_id}`}
    >
      {hasDiscount && !isOutOfStock && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-[#ff007f] text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <FaBolt size={10} />
            -{flashSale.discount_percentage}%
          </div>
        </div>
      )}

      {isOutOfStock && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/80 text-white/70 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/20">
            Out of Stock
          </div>
        </div>
      )}

      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
        )}
        {countdown && !isOutOfStock && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm text-white px-3 py-2 flex items-center justify-between gap-2"
            data-testid={`countdown-${product.product_id}`}>
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
            {hasDiscount && !isOutOfStock && (
              <div className="text-xs text-gray-400 line-through">RM{product.price.toFixed(2)}</div>
            )}
            <div className={`font-display text-3xl ${isOutOfStock ? 'text-gray-500' : 'text-[#ff007f]'}`}>
              RM{price.toFixed(2)}
            </div>
          </div>

          {isOutOfStock ? (
            <button
              onClick={handlePreorder}
              className="flex items-center gap-1.5 bg-[#25d366] text-white px-3 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all"
              data-testid={`product-card-preorder-btn-${product.product_id}`}
              title="Pre-order via WhatsApp"
            >
              <FaWhatsapp size={13} /> Pre-order
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className="bg-black text-white p-3 rounded-full hover:bg-[#ff007f] transition-all hover:scale-110"
              data-testid={`product-card-add-btn-${product.product_id}`}
            >
              <FaShoppingBag size={16} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
