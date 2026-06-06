import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaSlidersH, FaTh, FaList, FaHeart, FaRegHeart, FaTimes } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ALL_CATS = ['Wine', 'Beer', 'Whiskey', 'Gin', 'Rum', 'Vodka', 'Champagne', 'Tequila', 'Sake'];
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under RM50', min: 0, max: 50 },
  { label: 'RM50 – RM100', min: 50, max: 100 },
  { label: 'RM100 – RM200', min: 100, max: 200 },
  { label: 'RM200 – RM500', min: 200, max: 500 },
  { label: 'Above RM500', min: 500, max: Infinity },
];
const SORT_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
];

const getWishlist = () => { try { return JSON.parse(localStorage.getItem('ml_wishlist') || '[]'); } catch { return []; } };
const setWishlist = (ids) => localStorage.setItem('ml_wishlist', JSON.stringify(ids));
const getRecentlyViewed = () => { try { return JSON.parse(localStorage.getItem('ml_recent') || '[]'); } catch { return []; } };

const Products = () => {
  const [params, setParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [selected, setSelected] = useState(params.get('category') || '');
  const [priceRange, setPriceRange] = useState(0);
  const [sort, setSort] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [wishlist, setWishlistState] = useState(getWishlist());
  const [recentIds, setRecentIds] = useState(getRecentlyViewed());
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { loadCategories(); loadProducts(); }, []);

  // Debounced search
  const debouncedSearch = useCallback((val) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters(allProducts, val, selected, priceRange, sort), 300);
  }, [allProducts, selected, priceRange, sort]);

  useEffect(() => { debouncedSearch(search); }, [search]);
  useEffect(() => { applyFilters(allProducts, search, selected, priceRange, sort); }, [selected, priceRange, sort, allProducts]);

  // Recently viewed
  useEffect(() => {
    if (recentIds.length && allProducts.length) {
      const recent = recentIds.map(id => allProducts.find(p => p.product_id === id)).filter(Boolean);
      setRecentProducts(recent);
    }
  }, [recentIds, allProducts]);

  const loadCategories = async () => {
    try { const r = await axios.get(`${API}/categories`); setCategories(r.data.categories || []); } catch {}
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/products`);
      const data = res.data?.products || res.data || [];
      setAllProducts(data);
      applyFilters(data, search, selected, priceRange, sort);
    } catch {}
    finally { setLoading(false); }
  };

  const applyFilters = (source, q, cat, prIdx, srt) => {
    let filtered = [...source];
    if (cat) filtered = filtered.filter(p => p.category === cat);
    if (q.trim()) filtered = filtered.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.description || '').toLowerCase().includes(q.toLowerCase()));
    const range = PRICE_RANGES[prIdx];
    if (range && range.max !== Infinity) filtered = filtered.filter(p => p.price >= range.min && p.price <= range.max);
    else if (range && range.min > 0) filtered = filtered.filter(p => p.price >= range.min);
    if (srt === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if (srt === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if (srt === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (srt === 'name_desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
    setProducts(filtered);
  };

  const setCat = (c) => {
    setSelected(c);
    if (c) params.set('category', c); else params.delete('category');
    setParams(params);
  };

  const toggleWishlist = (id) => {
    const cur = getWishlist();
    const updated = cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id];
    setWishlist(updated);
    setWishlistState(updated);
  };

  const activeFilterCount = [selected, priceRange > 0, sort].filter(Boolean).length;

  return (
    <div>
      <div className="border-b border-white/5 bg-gradient-to-b from-black to-[#050505] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="eyebrow mb-3">Shop · Browse</div>
          <h1 className="display-xl">All <span className="neon-pink-text">Drops</span></h1>
          <p className="text-white/60 mt-4 max-w-xl">{products.length} premium bottles boss — wine, whiskey, beer, gin, all here lah.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">

        {/* Recently Viewed */}
        {recentProducts.length > 0 && (
          <div className="mb-10">
            <div className="eyebrow mb-4">Recently Viewed</div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recentProducts.slice(0, 5).map(p => (
                <Link key={p.product_id} to={`/product/${p.product_id}`}
                  className="shrink-0 w-40 bg-[#111] border border-white/10 rounded-2xl overflow-hidden hover:border-[#ff007f]/40 transition-all">
                  <div className="aspect-square bg-white">
                    <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.src='https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold truncate">{p.name}</div>
                    <div className="text-[#ff007f] text-xs font-display">RM{p.price.toFixed(2)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Wishlist strip */}
        {wishlist.length > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-[#ff007f10] border border-[#ff007f30] rounded-2xl">
            <FaHeart className="text-[#ff007f] shrink-0" size={14} />
            <span className="text-sm text-white/70">You have <span className="font-bold text-white">{wishlist.length}</span> saved item{wishlist.length > 1 ? 's' : ''}</span>
            <button onClick={() => { setWishlist([]); setWishlistState([]); }} className="ml-auto text-xs text-white/40 hover:text-[#ff007f]">Clear all</button>
          </div>
        )}

        {/* Search bar + view + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search bottles boss..." className="input-dark pl-12" data-testid="products-search-input" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <FaTimes size={12} />
              </button>
            )}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="input-dark sm:w-52 cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-11 h-11 rounded-xl border border-white/15 flex items-center justify-center text-white/60 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">
              {viewMode === 'grid' ? <FaList size={14} /> : <FaTh size={14} />}
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 h-11 rounded-xl border transition-all text-sm font-bold ${showFilters ? 'bg-[#ff007f] border-[#ff007f] text-white' : 'border-white/15 text-white/60 hover:border-[#ff007f] hover:text-[#ff007f]'}`}>
              <FaSlidersH size={12} /> Filters {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-white text-[#ff007f] text-xs flex items-center justify-center font-black">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="surface p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category */}
            <div>
              <div className="eyebrow mb-3">Category</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCat('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${!selected ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'}`}>All</button>
                {ALL_CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${selected === c ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'}`}>{c}</button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <div className="eyebrow mb-3">Price Range</div>
              <div className="flex flex-col gap-2">
                {PRICE_RANGES.map((r, i) => (
                  <button key={i} onClick={() => setPriceRange(i)}
                    className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${priceRange === i ? 'bg-[#ff007f] text-white font-bold' : 'border border-white/10 text-white/70 hover:border-[#ff007f]'}`}>{r.label}</button>
                ))}
              </div>
            </div>

            {/* Active filters + reset */}
            <div>
              <div className="eyebrow mb-3">Active Filters</div>
              <div className="flex flex-col gap-2">
                {selected && <div className="flex items-center justify-between text-sm bg-[#ff007f20] border border-[#ff007f30] rounded-xl px-3 py-2"><span className="text-[#ff007f]">📦 {selected}</span><button onClick={() => setCat('')} className="text-white/40 hover:text-[#ff007f]"><FaTimes size={10} /></button></div>}
                {priceRange > 0 && <div className="flex items-center justify-between text-sm bg-[#ffd70020] border border-[#ffd70030] rounded-xl px-3 py-2"><span className="text-[#ffd700]">💰 {PRICE_RANGES[priceRange].label}</span><button onClick={() => setPriceRange(0)} className="text-white/40 hover:text-[#ff007f]"><FaTimes size={10} /></button></div>}
                {sort && <div className="flex items-center justify-between text-sm bg-[#00f0ff20] border border-[#00f0ff30] rounded-xl px-3 py-2"><span className="text-[#00f0ff]">↕ {SORT_OPTIONS.find(o => o.value === sort)?.label}</span><button onClick={() => setSort('')} className="text-white/40 hover:text-[#ff007f]"><FaTimes size={10} /></button></div>}
                {activeFilterCount > 0 && (
                  <button onClick={() => { setCat(''); setPriceRange(0); setSort(''); setSearch(''); }}
                    className="text-xs text-white/40 hover:text-[#ff007f] transition-all mt-1">Clear all filters</button>
                )}
                {activeFilterCount === 0 && <p className="text-white/30 text-xs">No filters active</p>}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5' : 'flex flex-col gap-3'}>
            {Array(8).fill(0).map((_, i) => <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 surface">
            <div className="text-5xl mb-4">🍾</div>
            <div className="display-md mb-3 text-white/70">No drops found lah</div>
            <p className="text-white/50 mb-6">Try a different search or remove some filters boss.</p>
            <button onClick={() => { setCat(''); setPriceRange(0); setSort(''); setSearch(''); }} className="btn-pink">Clear filters</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(p => (
              <div key={p.product_id} className="relative">
                <ProductCard product={p} />
                <button onClick={() => toggleWishlist(p.product_id)}
                  className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all"
                  title={wishlist.includes(p.product_id) ? 'Remove from wishlist' : 'Save to wishlist'}>
                  {wishlist.includes(p.product_id) ? <FaHeart size={12} className="text-[#ff007f]" /> : <FaRegHeart size={12} className="text-white/60" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map(p => (
              <div key={p.product_id} className="surface p-4 flex items-center gap-5 hover:border-[#ff007f]/30 transition-all cursor-pointer group"
                onClick={() => window.location.href = `/product/${p.product_id}`}>
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shrink-0">
                  <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.src='https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-1">{p.category}</div>
                  <div className="font-display text-xl uppercase truncate group-hover:text-[#ff007f] transition-colors">{p.name}</div>
                  <div className="text-white/50 text-sm mt-1 line-clamp-1">{p.description || '—'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl neon-pink-text">RM{p.price.toFixed(2)}</div>
                  <button onClick={() => toggleWishlist(p.product_id)} className="mt-1 text-white/40 hover:text-[#ff007f] transition-colors">
                    {wishlist.includes(p.product_id) ? <FaHeart size={12} className="text-[#ff007f]" /> : <FaRegHeart size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
