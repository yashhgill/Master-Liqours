import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { Plus, Edit, Trash2, Zap } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showFlashSaleForm, setShowFlashSaleForm] = useState(false);
  
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', cta_text: '', cta_link: '', background_image: '', is_active: true, order_position: 0 });
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', category: '', image_url: '', is_active: true });
  const [flashSaleForm, setFlashSaleForm] = useState({ product_id: '', discount_percentage: 0, start_time: '', end_time: '' });
  
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    try {
      if (activeTab === 'banners') {
        const res = await axios.get(`${API}/admin/hero-banners`, { withCredentials: true });
        setBanners(res.data);
      } else if (activeTab === 'products') {
        const res = await axios.get(`${API}/products`);
        setProducts(res.data);
      } else if (activeTab === 'flash-sales') {
        const res = await axios.get(`${API}/admin/flash-sales?include_expired=true`, { withCredentials: true });
        setFlashSales(res.data);
      }
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };
  
  const createBanner = async () => {
    try {
      await axios.post(`${API}/admin/hero-banners`, bannerForm, { withCredentials: true });
      alert('Banner created!');
      setShowBannerForm(false);
      loadData();
    } catch (error) {
      alert('Failed: ' + error.response?.data?.detail);
    }
  };
  
  const createProduct = async () => {
    try {
      await axios.post(`${API}/admin/products`, productForm, { withCredentials: true });
      alert('Product created!');
      setShowProductForm(false);
      loadData();
    } catch (error) {
      alert('Failed: ' + error.response?.data?.detail);
    }
  };
  
  const createFlashSale = async () => {
    try {
      await axios.post(`${API}/admin/flash-sales`, flashSaleForm, { withCredentials: true });
      alert('Flash sale created!');
      setShowFlashSaleForm(false);
      loadData();
    } catch (error) {
      alert('Failed: ' + error.response?.data?.detail);
    }
  };
  
  const deleteBanner = async (id) => {
    if (!window.confirm('Delete banner?')) return;
    try {
      await axios.delete(`${API}/admin/hero-banners/${id}`, { withCredentials: true });
      loadData();
    } catch (error) {
      alert('Failed to delete');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Super Admin Dashboard</h1>
      <p className="text-white mb-8">Welcome, {user.name}! Manage everything here.</p>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-8">
        <button
          onClick={() => setActiveTab('banners')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'banners' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          Hero Banners
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'products' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('flash-sales')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'flash-sales' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          Flash Sales
        </button>
      </div>
      
      {/* Hero Banners Tab */}
      {activeTab === 'banners' && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Hero Banners</h2>
            <button onClick={() => setShowBannerForm(!showBannerForm)} className="btn-neon">
              <Plus size={20} className="inline mr-2" />
              Add Banner
            </button>
          </div>
          
          {showBannerForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4">Create Banner</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm({...bannerForm, subtitle: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="CTA Text" value={bannerForm.cta_text} onChange={(e) => setBannerForm({...bannerForm, cta_text: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="CTA Link" value={bannerForm.cta_link} onChange={(e) => setBannerForm({...bannerForm, cta_link: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Background Image URL" value={bannerForm.background_image} onChange={(e) => setBannerForm({...bannerForm, background_image: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <button onClick={createBanner} className="btn-neon">Create</button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {banners.map(banner => (
              <div key={banner.banner_id} className="border p-4 rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{banner.title}</h3>
                  <p className="text-gray-600">{banner.subtitle}</p>
                  <span className={`text-sm ${banner.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button onClick={() => deleteBanner(banner.banner_id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Products</h2>
            <button onClick={() => setShowProductForm(!showProductForm)} className="btn-neon">
              <Plus size={20} className="inline mr-2" />
              Add Product
            </button>
          </div>
          
          {showProductForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4">Create Product</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Name" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})} className="px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Category" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Image URL" value={productForm.image_url} onChange={(e) => setProductForm({...productForm, image_url: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className="col-span-2 px-4 py-2 border rounded-lg" rows={3} />
                <button onClick={createProduct} className="col-span-2 btn-neon">Create Product</button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => (
              <div key={product.product_id} className="border p-4 rounded-lg">
                <h3 className="font-bold">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
                <p className="text-xl font-bold text-pink-600 mt-2">RM{product.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Flash Sales Tab */}
      {activeTab === 'flash-sales' && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Flash Sales</h2>
            <button onClick={() => setShowFlashSaleForm(!showFlashSaleForm)} className="btn-neon">
              <Zap size={20} className="inline mr-2" />
              Create Flash Sale
            </button>
          </div>
          
          {showFlashSaleForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4">Create Flash Sale</h3>
              <div className="space-y-4">
                <select value={flashSaleForm.product_id} onChange={(e) => setFlashSaleForm({...flashSaleForm, product_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Discount %" value={flashSaleForm.discount_percentage} onChange={(e) => setFlashSaleForm({...flashSaleForm, discount_percentage: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="datetime-local" placeholder="Start Time" value={flashSaleForm.start_time} onChange={(e) => setFlashSaleForm({...flashSaleForm, start_time: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <input type="datetime-local" placeholder="End Time" value={flashSaleForm.end_time} onChange={(e) => setFlashSaleForm({...flashSaleForm, end_time: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                <button onClick={createFlashSale} className="btn-neon">Create Sale</button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {flashSales.map(sale => (
              <div key={sale.sale_id} className="border p-4 rounded-lg">
                <h3 className="font-bold">{sale.product_id}</h3>
                <p className="text-2xl font-bold text-pink-600">{sale.discount_percentage}% OFF</p>
                <p className="text-sm text-gray-600">Start: {new Date(sale.start_time).toLocaleString()}</p>
                <p className="text-sm text-gray-600">End: {new Date(sale.end_time).toLocaleString()}</p>
                <span className={`text-sm ${sale.is_active && new Date(sale.end_time) > new Date() ? 'text-green-600' : 'text-gray-400'}`}>
                  {sale.is_active && new Date(sale.end_time) > new Date() ? 'Active' : 'Expired'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
