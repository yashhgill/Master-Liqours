import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaSlidersH, FaTh, FaList, FaHeart, FaRegHeart, FaTimes, FaPhone, FaWhatsapp } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BOSS_WHATSAPP = process.env.REACT_APP_WHATSAPP_NUMBER || '60182085097';
const PAGE_SIZE = 60;
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under RM50', min: 0, max: 50 },
  { label: 'RM50 – RM100', min: 50, max: 100 },
  { label: 'RM100 – RM200', min: 100, max: 200 },
  { label: 'RM200 – RM500', min: 200, max: 500 },
  { label: 'Above RM500', min: 500, max: Infinity },
];
const SORT_OPTIONS = [
  { label: '🔥 Best Sellers', value: 'trending' },
  { label: 'Newest First', value: '' },
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
  if (r && prIdx > 0) {
    out = r.max === Infinity
      ? out.filter(p => p.price >= r.min)
      : out.filter(p => p.price >= r.min && p.price <= r.max);
  }
  if (srt === 'trending') out.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
  else if (srt === 'price_asc') out.sort((a, b) => a.price - b.price);
  else if (srt === 'price_desc') out.sort((a, b) => b.price - a.price);
  else if (srt === 'name_asc') out.sort((a, b) => a.name.localeCompare(b.name));
  else if (srt === 'name_desc') out.sort((a, b) => b.name.localeCompare(a.name));
  return out;
};

// ── Order With Boss Modal ─────────────────────────────────────────────────────
const OrderWithBossModal = ({ product, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
    <div className="surface max-w-sm w-full p-6 text-center space-y-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
      <div className="text-4xl">🍾</div>
      <h3 className="display-md">Out of Stock</h3>
      <p className="text-white/60 text-sm">
        <span className="font-bold text-white">{product.name}</span> is currently unavailable from our stock.
        Contact the boss to place a special order!
      </p>
      <a
        href={`https://wa.me/${BOSS_WHATSAPP}?text=${encodeURIComponent(
          `Hi! I'd like to order: ${product.name} (RM${product.price?.toFixed(2)}). Is it available?`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-pink w-full flex items-center justify-center gap-2"
        onClick={onClose}
      >
        <FaWhatsapp size={16} /> Order with Boss
      </a>
      <button onClick={onClose} className="text-white/40 text-xs hover:text-white transition-colors">Maybe later</button>
    </div>
  </div>
);

const Products = () => {
  const [urlParams, setUrlParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [selected, setSelected] = useState(urlParams.get('category') || '');
  // Default sort: "trending" unless URL says otherwise
  const [priceRange, setPriceRange] = useState(0);
  const [sort, setSort] = useState(urlParams.get('sort') || 'trending');
  const [viewMode, setViewMode] = useState('grid');
  const [wishlist, setWishlist] = useState(getWishlist());
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [orderWithBoss, setOrderWithBoss] = useState(null);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ALL_CATS, setAllCats] = useState(['Whiskey', 'Vodka', 'Gin', 'Rum', 'Cognac', 'Brandy', 'Tequila', 'Liqueur', 'Wine', 'Champagne']);
  const debounceRef = useRef(null);

  // Fetch categories dynamically
  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => {
        const names = (res.data || []).map(c => c.name).filter(Boolean);
        if (names.length) setAllCats(names);
      })
      .catch(() => {});
  }, []);

  // ── Server-side fetch: fires whenever search/category/sort/page changes ──
  const fetchProducts = async (opts = {}) => {
    const isNewQuery = opts.reset !== false;
    if (isNewQuery) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: isNewQuery ? 1 : page + 1, limit: PAGE_SIZE };
      if (selected) params.category = selected;
      if (search.trim()) params.search = search.trim();
      // Price filter — done client-side on the returned page (server has no price range endpoint)
      const res = await axios.get(`${API}/products`, { params });
      const data = res.data?.products || res.data || [];
      const total = res.data?.total ?? data.length;
      if (isNewQuery) {
        setAllProducts(data);
        setPage(1);
        // Recent products only on first full load
        const recentIds = getRecent();
        if (recentIds.length) {
          const recent = recentIds.map(id => data.find(p => p.product_id === id)).filter(Boolean);
          setRecentProducts(recent.slice(0, 5));
        }
      } else {
        setAllProducts(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }
      setTotalProducts(total);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  };

  // Initial load and whenever category changes
  useEffect(() => { fetchProducts({ reset: true }); }, [selected]); // eslint-disable-line

  // Debounced search — server-side
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts({ reset: true }), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line

  // Load more
  const loadMore = () => fetchProducts({ reset: false });

  // Client-side price + sort on already-fetched page
  useEffect(() => {
    setProducts(applyFilters(allProducts, '', '', priceRange, sort));
  }, [priceRange, sort, allProducts]); // eslint-disable-line

  const setCat = (c) => {
    setSelected(c);
    const p = new URLSearchParams(urlParams);
    if (c) p.set('category', c); else p.delete('category');
    setUrlParams(p);
  };

  // Sync search to URL as user types (debounced via useEffect above)
  const handleSearchChange = (val) => {
    setSearch(val);
    const p = new URLSearchParams(urlParams);
    if (val.trim()) p.set('search', val.trim()); else p.delete('search');
    setUrlParams(p, { replace: true });
  };

  const toggleWishlist = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const cur = getWishlist();
    const updated = cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id];
    saveWishlist(updated);
    setWishlist(updated);
  };

  const clearAll = () => { setCat(''); setPriceRange(0); setSort('trending'); setSearch(''); };
  const activeCount = [selected, priceRange > 0, sort && sort !== 'trending'].filter(Boolean).length;

  // Helper to determine if a product is out of stock from supplier
  const isOutOfStock = (p) => p.available_stock !== undefined && p.available_stock !== -1 && p.available_stock === 0;

  const renderProduct = (p) => {
    const oos = isOutOfStock(p);
    return (
      <div key={p.product_id} className="relative">
        {/* Sales rank badge for top 3 */}
        {sort === 'trending' && (p.sales_count || 0) > 0 && products.indexOf(p) < 3 && (
          <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-[#ffd700] text-black text-xs font-black flex items-center justify-center shadow-lg">
            {products.indexOf(p) + 1}
          </div>
        )}

        {/* Out of stock overlay */}
        {oos ? (
          <div className="relative cursor-pointer" onClick={() => setOrderWithBoss(p)}>
            <div className="pointer-events-none" style={{ filter: 'blur(2px)', opacity: 0.5 }}>
              <ProductCard product={p} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-4 py-3 text-center border border-[#ff007f30]">
                <div className="text-[#ff007f] font-bold text-xs uppercase tracking-wider mb-1">Out of Stock</div>
                <button className="text-white text-xs font-bold bg-[#ff007f] px-3 py-1 rounded-full hover:brightness-110 transition-all">
                  Order with Boss
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ProductCard product={p} />
        )}

        {/* Wishlist button */}
        {!oos && (
          <button onClick={e => toggleWishlist(e, p.product_id)}
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all"
            title={wishlist.includes(p.product_id) ? 'Remove from wishlist' : 'Save to wishlist'}>
            {wishlist.includes(p.product_id)
              ? <FaHeart size={12} className="text-[#ff007f]" />
              : <FaRegHeart size={12} className="text-white/60" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="border-b border-white/5 bg-gradient-to-b from-black to-[#050505] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="eyebrow mb-3">Shop · Browse</div>
          <h1 className="display-xl">All <span className="neon-pink-text">Drops</span></h1>
          <p className="text-white/60 mt-4 max-w-xl">
            {loading ? '...' : `${products.length} premium bottle${products.length !== 1 ? 's' : ''} — sorted by what everyone's buying.`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">

        {/* Recently Viewed */}
        {recentProducts.length > 0 && (
          <div className="mb-10">
            <div className="eyebrow mb-4">Recently Viewed</div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentProducts.map(p => (
                <Link key={p.product_id} to={`/product/${p.product_id}`}
                  className="shrink-0 w-36 bg-[#111] border border-white/10 rounded-2xl overflow-hidden hover:border-[#ff007f]/40 transition-all">
                  <div className="aspect-square bg-white">
                    <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'}
                      alt={p.name} className="w-full h-full object-cover"
                      onError={e => e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
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
            <span className="text-sm text-white/70">
              <span className="font-bold text-white">{wishlist.length}</span> saved item{wishlist.length > 1 ? 's' : ''}
            </span>
            <button onClick={() => { saveWishlist([]); setWishlist([]); }}
              className="ml-auto text-xs text-white/40 hover:text-[#ff007f] transition-colors">Clear all</button>
          </div>
        )}

        {/* Search + Sort + View + Filter toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search bottles boss..." className="input-dark pl-12"
              data-testid="products-search-input" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <FaTimes size={12} />
              </button>
            )}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="input-dark sm:w-52 cursor-pointer bg-[#111]">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} title="Toggle view"
              className="w-11 h-11 rounded-xl border border-white/15 flex items-center justify-center text-white/60 hover:border-[#ff007f] hover:text-[#ff007f] transition-all">
              {viewMode === 'grid' ? <FaList size={14} /> : <FaTh size={14} />}
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 h-11 rounded-xl border transition-all text-sm font-bold ${showFilters ? 'bg-[#ff007f] border-[#ff007f] text-white' : 'border-white/15 text-white/60 hover:border-[#ff007f]'}`}>
              <FaSlidersH size={12} />
              Filters
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-[#ff007f] text-xs flex items-center justify-center font-black">{activeCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="surface p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="eyebrow mb-3">Category</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCat('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${!selected ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f] text-white/70'}`}>All</button>
                {ALL_CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${selected === c ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f] text-white/70'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-3">Price Range</div>
              <div className="flex flex-col gap-1.5">
                {PRICE_RANGES.map((r, i) => (
                  <button key={i} onClick={() => setPriceRange(i)}
                    className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${priceRange === i ? 'bg-[#ff007f] text-white font-bold' : 'border border-white/10 text-white/60 hover:border-[#ff007f]'}`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-3">Active Filters</div>
              <div className="flex flex-col gap-2">
                {!selected && priceRange === 0 && (!sort || sort === 'trending') && (
                  <p className="text-white/30 text-sm">No filters active</p>
                )}
                {selected && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#ff007f20] border border-[#ff007f30] rounded-xl text-sm">
                    <span className="text-[#ff007f]">📦 {selected}</span>
                    <button onClick={() => setCat('')}><FaTimes size={10} className="text-white/40 hover:text-[#ff007f]" /></button>
                  </div>
                )}
                {priceRange > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#ffd70020] border border-[#ffd70030] rounded-xl text-sm">
                    <span className="text-[#ffd700]">💰 {PRICE_RANGES[priceRange].label}</span>
                    <button onClick={() => setPriceRange(0)}><FaTimes size={10} className="text-white/40 hover:text-[#ff007f]" /></button>
                  </div>
                )}
                {activeCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-white/40 hover:text-[#ff007f] transition-all mt-1 text-left">Clear all filters</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trending label */}
        {sort === 'trending' && !loading && (
          <div className="mb-4 flex items-center gap-2 text-xs text-white/40">
            <span className="text-[#ff007f]">🔥</span>
            Sorted by what's selling most — top bottles first
          </div>
        )}

        {/* Product grid / list */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 surface">
            <div className="text-5xl mb-4">🍾</div>
            <div className="display-md mb-3 text-white/70">No drops found lah</div>
            <p className="text-white/50 mb-6">Try a different search or remove some filters boss.</p>
            <button onClick={clearAll} className="btn-pink">Clear filters</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(p => renderProduct(p))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map(p => {
              const oos = isOutOfStock(p);
              return (
                <div key={p.product_id} className={`relative ${oos ? 'cursor-pointer' : ''}`}
                  onClick={oos ? () => setOrderWithBoss(p) : undefined}>
                  <div style={oos ? { filter: 'blur(1px)', opacity: 0.5, pointerEvents: 'none' } : {}}>
                    <Link to={`/product/${p.product_id}`}
                      className="surface p-4 flex items-center gap-5 hover:border-[#ff007f]/30 transition-all group"
                      onClick={oos ? e => e.preventDefault() : undefined}>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shrink-0">
                        <img src={p.image_url || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'}
                          alt={p.name} className="w-full h-full object-cover"
                          onError={e => e.target.src = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wider text-white/40 mb-1">{p.category}</div>
                        <div className="font-display text-xl uppercase truncate group-hover:text-[#ff007f] transition-colors">{p.name}</div>
                        <div className="text-white/50 text-sm mt-1 line-clamp-1">{p.description || '—'}</div>
                        {sort === 'trending' && (p.sales_count || 0) > 0 && (
                          <div className="text-[10px] text-[#ffd700] mt-1">🔥 {p.sales_count} sold</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display text-2xl neon-pink-text">RM{p.price.toFixed(2)}</div>
                      </div>
                    </Link>
                  </div>
                  {oos && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-4 py-2 border border-[#ff007f30]">
                        <span className="text-[#ff007f] font-bold text-xs uppercase">Out of Stock — Order with Boss</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load More */}
      {!loading && !loadingMore && allProducts.length < totalProducts && (
        <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 32 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-pink"
            style={{ minWidth: 200, opacity: loadingMore ? 0.6 : 1 }}
          >
            {loadingMore ? 'Loading...' : `Load More (${totalProducts - allProducts.length} remaining)`}
          </button>
        </div>
      )}

      {orderWithBoss && (
        <OrderWithBossModal product={orderWithBoss} onClose={() => setOrderWithBoss(null)} />
      )}
    </div>
  );
};

export default Products;
