import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context';
import { FaFaShoppingBag, FaBolt } from 'react-icons/fa';

const ProductCard = ({ product, flashSale }) => {
  const { addToCart } = useCart();
  
  const price = flashSale ? flashSale.discounted_price : product.price;
  const hasDiscount = flashSale && flashSale.discount_percentage > 0;
  
  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product);
  };
  
  return (
    <Link to={`/product/${product.product_id}`} className="product-card group">
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1 pulse-glow">
            <FaBolt />
            <span>-{flashSale.discount_percentage}%</span>
          </div>
        </div>
      )}
      
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-1">{product.category}</div>
        <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-pink-600 transition">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-pink-600">RM{price.toFixed(2)}</div>
            {hasDiscount && (
              <div className="text-sm text-gray-400 line-through">RM{product.price.toFixed(2)}</div>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-pink-500 transition flex items-center space-x-2"
          >
            <FaFaShoppingBag size={18} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
