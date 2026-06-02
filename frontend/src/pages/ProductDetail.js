import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingBag, FaArrowLeft, FaMinus, FaPlus, FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import { useCart } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = () => {
    addToCart(product, qty);
    navigate('/cart');
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-white/60">Loading...</div>;
  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="display-lg mb-4">Product not found lah</div>
      <Link to="/products" className="btn-pink">Back to shop</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/60 hover:text-[#ff007f] mb-8 transition-colors" data-testid="pd-back-btn">
        <FaArrowLeft size={14} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div className="bg-white rounded-3xl overflow-hidden aspect-square relative">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800'}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800'; }}
          />
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-3">{product.category}</div>
          <h1 className="display-xl mb-5">{product.name}</h1>
          <div className="display-mega neon-pink-text mb-8" style={{fontSize:'4rem',lineHeight:1}}>RM{product.price.toFixed(2)}</div>

          <p className="text-white/70 leading-relaxed mb-8">{product.description}</p>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-white/70"><FaCheckCircle className="text-[#39ff14]" /> 100% Authentic</div>
            <div className="flex items-center gap-2 text-sm text-white/70"><FaCheckCircle className="text-[#39ff14]" /> Same-day Delivery (KL)</div>
            <div className="flex items-center gap-2 text-sm text-white/70"><FaCheckCircle className="text-[#39ff14]" /> WhatsApp Support</div>
            <div className="flex items-center gap-2 text-sm text-white/70"><FaCheckCircle className="text-[#39ff14]" /> Earn Points on Purchase</div>
          </div>

          {/* Qty */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Qty</div>
            <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-full p-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center" data-testid="pd-qty-minus"><FaMinus size={12} /></button>
              <div className="font-display text-2xl min-w-[40px] text-center" data-testid="pd-qty-value">{qty}</div>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center" data-testid="pd-qty-plus"><FaPlus size={12} /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={handleAdd} className="btn-pink flex-1 min-w-[200px]" data-testid="pd-add-to-cart-btn">
              <FaShoppingBag size={16} /> Add to Cart Boss
            </button>
            <a
              href={`https://wa.me/60126884925?text=${encodeURIComponent('Hi! I want to enquire about ' + product.name)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-ghost"
            >
              <FaWhatsapp size={16} /> Ask Staff
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
