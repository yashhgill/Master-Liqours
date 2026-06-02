import React, { useState } from 'react';
import axios from 'axios';
import { Facebook, Instagram, Twitter } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Footer = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setMessage('Subscribed! Check your email 📧');
      setEmail('');
    } catch (error) {
      setMessage('Failed to subscribe');
    }
  };
  
  return (
    <footer className="bg-gray-900 border-t border-white/10 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold gradient-text mb-4">Masterliqours</h3>
            <p className="text-gray-400">Your premium liquor destination in Malaysia. Serving quality drinks dengan harga terbaik!</p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/products" className="text-gray-400 hover:text-pink-500 transition">Products</a></li>
              <li><a href="/about" className="text-gray-400 hover:text-pink-500 transition">About Us</a></li>
              <li><a href="/contact" className="text-gray-400 hover:text-pink-500 transition">Contact</a></li>
            </ul>
          </div>
          
          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-400">WhatsApp: +60126884925</span></li>
              <li><span className="text-gray-400">Email: support@masterliqours.my</span></li>
              <li><span className="text-gray-400">Mon-Sat: 10AM - 10PM</span></li>
            </ul>
          </div>
          
          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4">Get weekly deals & promotions!</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="input-field"
                required
              />
              <button type="submit" className="btn-neon w-full">Subscribe</button>
            </form>
            {message && <p className="text-sm text-green-400 mt-2">{message}</p>}
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">© 2026 Masterliqours. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-pink-500 transition"><Facebook size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-pink-500 transition"><Instagram size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-pink-500 transition"><Twitter size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
