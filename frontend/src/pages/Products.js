import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaSearch, FaSlidersH, FaTh, FaList, FaHeart, FaRegHeart,
  FaTimes, FaTag, FaSortAmountDown, FaBoxOpen, FaWineGlass,
  FaChevronRight,
} from 'react-icons/fa';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const trackClick = (productId, fromSearch) => {
  axios.post(`${API}/products/track?product_id=${productId}&event_type=${fromSearch ? 'search_click' : 'view'}`).catch(() => {});
};

const ALL_CATS = ['Whiskey','Vodka','Gin','Rum','Cognac','Brandy','Tequila','Liqueur','Wine','Champagne','Beer','Sake'];
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under RM100', min: 0, max: 100 },
  { label: 'RM100 – RM300', min: 100, max: 300 },
  { label: 'RM300 – RM600', min: 300, max: 600 },
  { label: 'RM600 – RM1,000', min: 600, max: 1000 },
  { label: 'Above RM1,000', min: 1000, max: Infinity },
];
const SORT_OPTIONS = [
  { label: 'Best Match', value: '' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
];

const getWishlist = () => { try { return JSON.parse(localStorage.getItem('ml_wishlist') || '[]'); } catch { return []; } };
const saveWishlist = (ids) => localStorage.setItem('ml_wishlist', JSON.stringify(ids));
const getRecent = () => { try { return JSON.parse(localStorage.getItem('ml_recent') || '[]'); } catch { return []; } };

const applyFilters = (source, q, cat, prIdx, srt) => {
  let out = [...source];
  if (cat) out = out.filter(p => p.category === cat);
  if (q.trim()) out = out.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(q.toLowerCase())
  );
  const r = PRICE_RANGES[prIdx];
  if (r && prIdx > 0) out = r.max === Infinity ? out.filter(p => p.price >= r.min) : out.filter(p => p.price >= r.min && p.price <= r.max);
  if (srt === 'price_asc') out.sort((a, b) => a.price - b.price);
  else if (srt === 'price_desc') out.sort((a, b) => b.price - a.price);
  else if (srt === 'name_asc') out.sort((a, b) => a.name.localeCompare(b.name));
  else if (srt === 'name_desc') out.sort((a, b) => b.name.localeCompare(a.name));
  return out;
};

const S = {
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  line: { width: 20, height: 1, background: '#ffd700', display: 'inline-block' },
  h1: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(40px,6vw,72px)', letterSpacing: '0.02em', lineHeight: 1 },
};

const Products = () => {
  const [urlParams, setUrlParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [selected, setSelected] = useState(urlParams.get('category') || '');
  const [priceRange, setPriceRange] = useState(0);
  const [sort, setSort] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [wishlist, setWishlist] = useState(getWishlist());
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products`);
        const data = res.data?.products || res.data || [];
        setAllProducts(data);
        setProducts(applyFilters(data, search, selected, priceRange, sort));
        const recentIds = getRecent();
        if (recentIds.length) setRecentProducts(recentIds.map(id => data.find(p => p.product_id === id)).filter(Boolean).slice(0, 5));
      } catch {}
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line

  useEffect(() => { setProducts(applyFilters(allProducts, search, selected, priceRange, sort)); }, [selected, priceRange, sort, allProducts]); // eslint-disable-line

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setProducts(applyFilters(allProducts, search, selected, priceRange, sort)), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line

  const setCat = (c) => {
    setSelected(c);
    const p = new URLSearchParams(urlParams);
    if (c) p.set('category', c); else p.delete('category');
    setUrlParams(p);
  };

  const toggleWishlist = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const updated = getWishlist().includes(id) ? getWishlist().filter(i => i !== id) : [...getWishlist(), id];
    saveWishlist(updated); setWishlist(updated);
  };

  const clearAll = () => { setCat(''); setPriceRange(0); setSort(''); setSearch(''); };
  const activeCount = [selected, priceRange > 0, sort].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: '#030303' }}>

      {/* Page header */}
      <div style={{ background: 'linear-gradient(180deg, #080008, #030303)', padding: '60px 0 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div style={S.eyebrow}><span style={S.line} /> Shop · Browse</div>
          <h1 style={S.h1}>All <span style={{ color: '#ff007f', textShadow: '0 0 30px rgba(255,0,127,0.4)' }}>Drops</span></h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 }}>
            {loading ? 'Loading...' : `${products.length} premium bottle${products.length !== 1 ? 's' : ''} — wine, whiskey, gin, all here lah.`}
          </p>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mt-6">
            <button onClick={() => setCat('')}
              style={{ padding: '7px 16px', borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: !selected ? '#ff007f' : 'rgba(255,255,255,0.06)', color: !selected ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              All
            </button>
            {ALL_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: '7px 16px', borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: selected === c ? '#ff007f' : 'rgba(255,255,255,0.06)', color: selected === c ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">

        {/* Recently viewed */}
        {recentProducts.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ ...S.eyebrow, marginBottom: 12 }}><span style={S.line} /> Recently Viewed</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {recentProducts.map(p => (
                <Link key={p.product_id} to={`/product/${p.product_id}`} onClick={() => trackClick(p.product_id, false)}
                  style={{ flexShrink: 0, width: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.2s' }}>
                  <div style={{ aspectRatio: '1', background: '#111' }}>
                    <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#ff007f', fontWeight: 800 }}>RM{p.price.toFixed(0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} size={13} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bottles..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 50, padding: '11px 16px 11px 42px', color: '#fff', fontSize: 14, outline: 'none' }}
              data-testid="products-search-input" />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><FaTimes size={12} /></button>}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 50, padding: '11px 18px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>)}
          </select>

          {/* View toggle */}
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            style={{ width: 44, height: 44, borderRadius: 50, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            {viewMode === 'grid' ? <FaList size={13} /> : <FaTh size={13} />}
          </button>

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: showFilters ? '#ff007f' : 'rgba(255,255,255,0.05)', color: showFilters ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            <FaSlidersH size={13} /> Filters
            {activeCount > 0 && <span style={{ background: showFilters ? '#fff' : '#ff007f', color: showFilters ? '#ff007f' : '#fff', borderRadius: 50, width: 18, height: 18, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeCount}</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '24px 28px', marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FaTag size={10} /> Price Range</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRICE_RANGES.map((r, i) => (
                  <button key={i} onClick={() => setPriceRange(i)}
                    style={{ textAlign: 'left', padding: '8px 14px', borderRadius: 12, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: priceRange === i ? '#ff007f' : 'rgba(255,255,255,0.04)', color: priceRange === i ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: priceRange === i ? 700 : 400 }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FaSortAmountDown size={10} /> Active Filters</div>
              {!selected && priceRange === 0 && !sort
                ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>No active filters</p>
                : <>
                  {selected && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: 'rgba(255,0,127,0.1)', border: '1px solid rgba(255,0,127,0.25)', fontSize: 13, color: '#ff007f', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaBoxOpen size={11} /> {selected}</span>
                    <button onClick={() => setCat('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,0,127,0.6)' }}><FaTimes size={10} /></button>
                  </div>}
                  {priceRange > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', fontSize: 13, color: '#ffd700', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaTag size={11} /> {PRICE_RANGES[priceRange].label}</span>
                    <button onClick={() => setPriceRange(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,215,0,0.6)' }}><FaTimes size={10} /></button>
                  </div>}
                  {activeCount > 0 && <button onClick={clearAll} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>Clear all</button>}
                </>
              }
            </div>
          </div>
        )}

        {/* Wishlist strip */}
        {wishlist.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,0,127,0.06)', border: '1px solid rgba(255,0,127,0.2)', borderRadius: 14, marginBottom: 20 }}>
            <FaHeart size={13} style={{ color: '#ff007f', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}><strong style={{ color: '#fff' }}>{wishlist.length}</strong> saved item{wishlist.length > 1 ? 's' : ''}</span>
            <button onClick={() => { saveWishlist([]); setWishlist([]); }} style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
        )}

        {/* Grid / List */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
            {Array(8).fill(0).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 24, aspectRatio: '3/4', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 28 }}>
            <FaWineGlass size={48} style={{ color: 'rgba(255,255,255,0.1)', display: 'block', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>No Drops Found</div>
            <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 24, fontSize: 14 }}>Try a different search or remove some filters boss.</p>
            <button onClick={clearAll} style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 28px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Clear Filters</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
            {products.map(p => (
              <div key={p.product_id} style={{ position: 'relative' }} onClick={() => trackClick(p.product_id, !!search)}>
                <ProductCard product={p} />
                <button onClick={e => toggleWishlist(e, p.product_id)}
                  style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {wishlist.includes(p.product_id) ? <FaHeart size={12} style={{ color: '#ff007f' }} /> : <FaRegHeart size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {products.map(p => (
              <Link key={p.product_id} to={`/product/${p.product_id}`} onClick={() => trackClick(p.product_id, !!search)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, textDecoration: 'none', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,0,127,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', background: '#111', flexShrink: 0 }}>
                  <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,215,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 3 }}>{p.category}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: '#ff007f' }}>RM{p.price.toFixed(2)}</div>
                  <button onClick={e => toggleWishlist(e, p.product_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: wishlist.includes(p.product_id) ? '#ff007f' : 'rgba(255,255,255,0.25)' }}>
                    {wishlist.includes(p.product_id) ? <FaHeart size={13} /> : <FaRegHeart size={13} />}
                  </button>
                  <FaChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
