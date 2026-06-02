import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context';
import { FaShoppingBag, FaBolt } from 'react-icons/fa';

const ProductCard = ({ product, flashSale }) => {
  const { addToCart } = useCart();

  const price = flashSale ? flashSale.discounted_price : product.price;
  const hasDiscount = flashSale && flashSale.discount_percentage > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

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
