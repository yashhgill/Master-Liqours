import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaSlidersH } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ALL_CATS = ['Wine', 'Beer', 'Whiskey', 'Gin', 'Rum', 'Vodka', 'Champagne', 'Tequila', 'Sake'];

const Products = () => {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [selected, setSelected] = useState(params.get('category') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadProducts(); }, [selected, search]);

  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data.categories || []);
    } catch (e) { console.error(e); }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const p = {};
      if (selected) p.category = selected;
      if (search) p.search = search;
      const res = await axios.get(`${API}/products`, { params: p });
      setProducts(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const setCat = (c) => {
    setSelected(c);
    if (c) params.set('category', c); else params.delete('category');
    setParams(params);
  };

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-black to-[#050505] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="eyebrow mb-3">Shop · Browse</div>
          <h1 className="display-xl">All <span className="neon-pink-text">Drops</span></h1>
          <p className="text-white/60 mt-4 max-w-xl">{products.length} premium bottles boss — wine, whiskey, beer, gin, all here lah.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
        {/* Search + filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bottles boss..."
              className="input-dark pl-12"
              data-testid="products-search-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {/* Sidebar */}
          <aside>
            <div className="flex items-center gap-2 mb-5">
              <FaSlidersH className="text-[#ffd700]" />
              <div className="eyebrow !mb-0">Categories</div>
            </div>
            <div className="flex lg:flex-col gap-2 flex-wrap">
              <button
                onClick={() => setCat('')}
                className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all text-left ${!selected ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'}`}
                data-testid="filter-cat-all"
              >
                All
              </button>
              {ALL_CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all text-left ${selected === c ? 'bg-[#ff007f] text-white' : 'border border-white/15 hover:border-[#ff007f]'}`}
                  data-testid={`filter-cat-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </aside>

          {/* Grid */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {Array(6).fill(0).map((_, i) => <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 surface">
                <div className="display-md mb-3 text-white/70">No drops found lah</div>
                <p className="text-white/50">Try a different search or category boss.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {products.map((p) => <ProductCard key={p.product_id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
