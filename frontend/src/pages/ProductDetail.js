import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingBag, FaArrowLeft } from 'react-icons/fa';
import { useCart } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProduct();
  }, [id]);
  
  const loadProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToCart = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-20 text-center text-white">Loading...</div>;
  }
  
  if (!product) {
    return <div className="container mx-auto px-4 py-20 text-center text-white">Product not found</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-white hover:text-pink-500 mb-6 transition">
        <FaArrowLeft size={20} className="mr-2" />
        Back
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div className="bg-white rounded-xl overflow-hidden">
          <img
            src={product.image_url || 'https://via.placeholder.com/600'}
            alt={product.name}
            className="w-full h-96 object-cover"
            onError={(e) => e.target.src = 'https://via.placeholder.com/600'}
          />
        </div>
        
        {/* Details */}
        <div className="card">
          <div className="text-sm text-gray-500 mb-2">{product.category}</div>
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
          
          <div className="text-4xl font-bold text-pink-600 mb-8">RM{product.price.toFixed(2)}</div>
          
          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                -
              </button>
              <span className="text-xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                +
              </button>
            </div>
          </div>
          
          <button onClick={handleAddToCart} className="w-full btn-neon flex items-center justify-center space-x-2">
            <FaShoppingBag size={20} />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
