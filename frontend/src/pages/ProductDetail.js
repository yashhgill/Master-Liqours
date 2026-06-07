import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingBag, FaArrowLeft, FaMinus, FaPlus, FaCheckCircle, FaWhatsapp, FaHeart, FaRegHeart, FaShare, FaSearch } from 'react-icons/fa';
import { useCart } from '../context';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BOSS_WA = process.env.REACT_APP_PREORDER_WHATSAPP || '60182085097';

const getWishlist = () => { try { return JSON.parse(localStorage.getItem('ml_wishlist') || '[]'); } catch { return []; } };
const setWishlistLS = (ids) => localStorage.setItem('ml_wishlist', JSON.stringify(ids));

const trackRecent = (id) => {
  try {
    const prev = JSON.parse(localStorage.getItem('ml_recent') || '[]');
    const updated = [id, ...prev.filter(i => i !== id)].slice(0, 10);
    localStorage.setItem('ml_recent', JSON.stringify(updated));
  } catch {}
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [wishlist, setWishlistState] = useState(getWishlist());
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
      trackRecent(id);
      // Load related products from same category
      const allRes = await axios.get(`${API}/products`, { params: { category: res.data.category } });
      const allData = allRes.data?.products || allRes.data || [];
      setRelated(allData.filter(p => p.product_id !== id).slice(0, 4));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = () => { addToCart(product, qty); navigate('/cart'); };

  const toggleWishlist = () => {
    const cur = getWishlist();
    const updated = cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id];
    setWishlistLS(updated);
    setWishlistState(updated);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out ${product.name} on Masterliqours — RM${product.price.toFixed(2)}`;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-white/60">Loading...</div>;
  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="display-lg mb-4">Product not found lah</div>
      <Link to="/products" className="btn-pink">Back to shop</Link>
    </div>
  );

  const isWished = wishlist.includes(id);
  const isPreorder = product.is_preorder;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/60 hover:text-[#ff007f] mb-8 transition-colors">
          <FaArrowLeft size={14} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image with zoom */}
          <div className="relative">
            <div className="bg-white rounded-3xl overflow-hidden aspect-square relative cursor-zoom-in" onClick={() => setZoomed(true)}>
              <img src={product.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800'}
                alt={product.name} className="w-full h-full object-cover"
                onError={e => e.target.src='https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800'} />
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white/70 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <FaSearch size={10} /> Tap to zoom
              </div>
            </div>
            {/* Wishlist + Share on image */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button onClick={toggleWishlist}
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all"
                title={isWished ? 'Remove from wishlist' : 'Save to wishlist'}>
                {isWished ? <FaHeart size={14} className="text-[#ff007f]" /> : <FaRegHeart size={14} className="text-white/70" />}
              </button>
              <button onClick={handleShare}
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all"
                title="Share this product">
                <FaShare size={12} className="text-white/70" />
              </button>
            </div>
            {shareMsg && (
              <div className="absolute top-4 left-4 bg-[#39ff14] text-black text-xs font-bold px-3 py-1.5 rounded-full">{shareMsg}</div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[#ffd700] mb-3">{product.category}</div>
            <h1 className="display-xl mb-5">{product.name}</h1>

            {isPreorder ? (
              <div className="mb-6 p-4 bg-[#ffd70015] border border-[#ffd700]/30 rounded-2xl">
                <div className="font-bold text-[#ffd700] mb-1">🕐 Pre-order Item — Check Boss First</div>
                <p className="text-white/60 text-sm mb-3">This product needs to be confirmed before ordering. Price may vary.</p>
                <a href={`https://wa.me/${BOSS_WA.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi! I'm interested in pre-ordering ${product.name}. Is it available?`)}`}
                  target="_blank" rel="noopener noreferrer" className="btn-whatsapp inline-flex">
                  <FaWhatsapp size={16} /> Contact Boss — +{BOSS_WA.replace(/\D/g,'')}
                </a>
              </div>
            ) : (
              <div className="display-mega neon-pink-text mb-8" style={{fontSize:'4rem',lineHeight:1}}>RM{product.price.toFixed(2)}</div>
            )}

            <p className="text-white/70 leading-relaxed mb-8">{product.description}</p>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[['100% Authentic','#39ff14'],['Same-day Delivery (KL)','#39ff14'],['WhatsApp Support','#39ff14'],['Earn Points on Purchase','#39ff14']].map(([t,c]) => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/70">
                  <FaCheckCircle style={{color:c}} /> {t}
                </div>
              ))}
            </div>

            {!isPreorder && (
              <>
                {/* Qty */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Qty</div>
                  <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-full p-1">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center"><FaMinus size={12} /></button>
                    <div className="font-display text-2xl min-w-[40px] text-center">{qty}</div>
                    <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center"><FaPlus size={12} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={handleAdd} className="btn-pink flex-1 min-w-[200px]">
                    <FaShoppingBag size={16} /> Add to Cart Boss
                  </button>
                  <a href={`https://wa.me/${BOSS_WA.replace(/\D/g,'')}?text=${encodeURIComponent('Hi! I want to enquire about ' + product.name)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <FaWhatsapp size={16} /> Ask Staff
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20">
            <div className="eyebrow mb-3">More Like This</div>
            <h2 className="display-lg mb-8">You might also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => <ProductCard key={p.product_id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Zoom lightbox */}
      {zoomed && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomed(false)}>
          <img src={product.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1200'}
            alt={product.name} className="max-w-full max-h-full object-contain rounded-2xl"
            onError={e => e.target.src='https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1200'} />
          <button className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all text-xl">✕</button>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
