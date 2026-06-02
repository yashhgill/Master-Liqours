import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Zap, TrendingUp, Award } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Home = () => {
  const [banners, setBanners] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [bannersRes, salesRes, productsRes] = await Promise.all([
        axios.get(`${API}/hero-banners`),
        axios.get(`${API}/flash-sales/active`),
        axios.get(`${API}/products`)
      ]);
      setBanners(bannersRes.data);
      setFlashSales(salesRes.data);
      setProducts(productsRes.data.slice(0, 8));
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-black via-gray-900 to-black py-20">
        <div className="container mx-auto px-4">
          {banners.length > 0 ? (
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text animate-fade-in">
                {banners[0].title}
              </h1>
              {banners[0].subtitle && (
                <p className="text-xl md:text-2xl text-gray-300 mb-8">{banners[0].subtitle}</p>
              )}
              {banners[0].cta_text && (
                <Link to={banners[0].cta_link || '/products'} className="btn-neon inline-flex items-center space-x-2">
                  <span>{banners[0].cta_text}</span>
                  <ArrowRight size={20} />
                </Link>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text animate-fade-in">
                Premium Liquor <br />Terus ke Pintu Anda
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8">
                Top quality drinks dengan harga best! Order now & enjoy 🍻
              </p>
              <Link to="/products" className="btn-neon inline-flex items-center space-x-2">
                <span>Shop Now</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          )}
        </div>
      </section>
      
      {/* Flash Sales */}
      {flashSales.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center mb-8">
              <Zap className="text-pink-500 mr-2" size={32} />
              <h2 className="text-3xl md:text-4xl font-bold text-white">Flash Sales!</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {flashSales.map(sale => (
                <ProductCard key={sale.sale_id} product={sale.product} flashSale={sale} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-dark text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Zap className="text-pink-500" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fast Delivery</h3>
              <p className="text-gray-400">Same day delivery untuk order before 6PM</p>
            </div>
            
            <div className="card-dark text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Award className="text-purple-500" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Rewards Program</h3>
              <p className="text-gray-400">Earn points & get Gold/Platinum benefits!</p>
            </div>
            
            <div className="card-dark text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-cyan-500" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Best Prices</h3>
              <p className="text-gray-400">Guaranteed lowest prices in Malaysia</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
            Popular Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/products" className="btn-outline">View All Products</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
