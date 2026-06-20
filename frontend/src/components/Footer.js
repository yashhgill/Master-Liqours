import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaFacebookF, FaInstagram, FaWhatsapp, FaEnvelope, FaTelegram } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Footer = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setMsg('Settle! You\'re in lah 🎉');
      setEmail('');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Cannot subscribe lah, try again');
    }
  };

  return (
    <footer className="bg-[#050505] border-t border-white/10 mt-20">
      {/* Top CTA strip */}
      <div className="bg-gradient-to-r from-[#ff007f] via-[#e60073] to-[#ff007f] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-wrap items-center justify-between gap-4">
          <div className="display-md text-white">Settle Order? WhatsApp Us Lah.</div>
          <a
            href="https://wa.me/60126884925?text=Hi%20Masterliqours"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp bg-black hover:bg-[#1a1a1a]"
            data-testid="footer-whatsapp-btn"
          >
            <FaWhatsapp size={18} /> Chat Now
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand */}
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img
                src="/logo-m.png"
                alt="Masterliqours"
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <span className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] items-center justify-center text-black font-black text-2xl">M</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#ffd700]/80">Premium Liquor</div>
              <div className="logo-text text-3xl">Masterliqours</div>
            </div>
          </div>
          <p className="text-white/60 leading-relaxed mb-6">
            Top quality drinks dengan harga best. Premium liquor delivery, terus ke pintu anda — straight up.
          </p>
          <div className="flex items-center gap-2">
            {[
              { icon: FaFacebookF, href: 'https://www.facebook.com' },
              { icon: FaInstagram, href: 'https://www.instagram.com' },
              { icon: FaWhatsapp, href: 'https://wa.me/60126884925' },
              { icon: FaEnvelope, href: 'mailto:hello@masterliqours.my' },
              { icon: FaTelegram, href: 'https://t.me/masterliqours' },
            ].map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-[#ff007f] hover:text-[#ff007f] transition-all">
                <s.icon size={14} />
              </a>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="md:col-span-2">
          <div className="eyebrow mb-5">Shop</div>
          <ul className="space-y-3 text-white/70">
            {['Whiskey', 'Vodka', 'Gin', 'Rum', 'Cognac', 'Brandy', 'Tequila', 'Liqueur', 'Wine', 'Champagne', 'Beer', 'Sake'].map((c) => (
              <li key={c}>
                <Link to={`/products?category=${c}`} className="hover:text-[#ff007f] transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info */}
        <div className="md:col-span-2">
          <div className="eyebrow mb-5">Info</div>
          <ul className="space-y-3 text-white/70">
            <li><Link to="/rewards" className="hover:text-[#ff007f] transition-colors">Welcome & Rewards</Link></li>
            <li><Link to="/products" className="hover:text-[#ff007f] transition-colors">Order & Delivery</Link></li>
            <li><Link to="/payment" className="hover:text-[#ff007f] transition-colors">Payment & Refunds</Link></li>
            <li><Link to="/bulk-order" className="hover:text-[#ff007f] transition-colors">Bulk &amp; Event Orders</Link></li>
            <li><Link to="/products" className="hover:text-[#ff007f] transition-colors">Contact Us</Link></li>
            <li><Link to="/" className="hover:text-[#ff007f] transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-4">
          <div className="eyebrow mb-5">Newsletter</div>
          <p className="text-white/60 mb-5 leading-relaxed">
            Subscribe lah, get news on flash sales, new drops, and party drops first.
          </p>
          <form onSubmit={subscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="input-dark flex-1"
              data-testid="footer-newsletter-input"
            />
            <button type="submit" className="btn-pink" data-testid="footer-newsletter-btn">Join</button>
          </form>
          {msg && (
            <p
              className="mt-4 px-4 py-3 rounded-2xl bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14] text-sm font-bold animate-fade-in"
              data-testid="footer-newsletter-msg"
            >
              {msg}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div>© {new Date().getFullYear()} Masterliqours · masterliqours.my · Drink Responsibly</div>
          <div>Made with ✦ in Malaysia</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
