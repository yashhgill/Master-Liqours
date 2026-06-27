import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaFacebookF, FaInstagram, FaWhatsapp, FaEnvelope, FaTelegram, FaArrowRight, FaHeart } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Footer = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setMsg("You're in! Welcome to the family.");
      setEmail('');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Cannot subscribe, try again');
    }
  };

  return (
    <footer style={{ background: '#030303', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* CTA Strip */}
      <div style={{ background: 'linear-gradient(135deg, #ff007f, #c8005a)', padding: '20px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-wrap items-center justify-between gap-4">
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(20px,3vw,28px)', letterSpacing: '0.02em' }}>
            Settle Order? WhatsApp Us Lah.
          </div>
          <a href="https://wa.me/60126884925?text=Hi%20Masterliqours" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#030303', color: '#fff', padding: '12px 24px', borderRadius: 50, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.2s' }}
            data-testid="footer-whatsapp-btn">
            <FaWhatsapp size={16} /> Chat Now
          </a>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" style={{ padding: '64px 48px' }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand */}
          <div className="md:col-span-4">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, textDecoration: 'none' }}>
              <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                <img src="/logo-m.png" alt="Masterliqours" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <span style={{ display: 'none', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#ffd700,#b8860b)', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: 18 }}>M</span>
              </div>
              <div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,215,0,0.6)', fontWeight: 600 }}>Premium Liquor</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '0.08em', color: '#fff' }}>MASTERLIQOURS</div>
              </div>
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, marginBottom: 24, fontSize: 14 }}>
              Top quality drops, best prices. Your drinks, your doorstep — settle already. Serving KL & Klang Valley.
            </p>
            {/* Socials */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { Icon: FaFacebookF, href: 'https://www.facebook.com' },
                { Icon: FaInstagram, href: 'https://www.instagram.com' },
                { Icon: FaWhatsapp, href: 'https://wa.me/60126884925' },
                { Icon: FaEnvelope, href: 'mailto:hello@masterliqours.my' },
                { Icon: FaTelegram, href: 'https://t.me/masterliqours' },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff007f'; e.currentTarget.style.color = '#ff007f'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                  <Icon size={13} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="md:col-span-2">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Shop</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Whiskey','Vodka','Gin','Rum','Cognac','Brandy','Tequila','Liqueur','Wine','Champagne'].map(c => (
                <li key={c}>
                  <Link to={`/products?category=${c}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#ff007f'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="md:col-span-2">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Info</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Rewards Program', '/dashboard'],
                ['Bulk & Event Orders', '/bulk-order'],
                ['All Products', '/products'],
                ['Promotions', '/products?promo=1'],
                ['Contact Us', 'https://wa.me/60126884925'],
              ].map(([label, to]) => (
                <li key={label}>
                  {to.startsWith('http') ? (
                    <a href={to} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#ff007f'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                      {label}
                    </a>
                  ) : (
                    <Link to={to} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#ff007f'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-4">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Newsletter</div>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 1.7, fontSize: 14 }}>
              Subscribe for flash sales, new drops, and exclusive deals — first to know, first to order.
            </p>
            <form onSubmit={subscribe} style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '12px 18px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                data-testid="footer-newsletter-input" />
              <button type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0, boxShadow: '0 0 20px rgba(255,0,127,0.3)' }}
                data-testid="footer-newsletter-btn">
                Join <FaArrowRight size={11} />
              </button>
            </form>
            {msg && (
              <p style={{ marginTop: 12, padding: '10px 16px', borderRadius: 12, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.25)', color: '#39ff14', fontSize: 13, fontWeight: 600 }}
                data-testid="footer-newsletter-msg">
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" style={{ padding: '20px 48px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} Masterliqours · masterliqours.my · All Rights Reserved · Drink Responsibly
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Built with <FaHeart size={10} style={{ color: '#ff007f' }} /> by{' '}
            <a href="https://harnova.my" target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#ff007f'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>
              Harnova.my
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
