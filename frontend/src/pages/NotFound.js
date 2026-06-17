import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaWhatsapp } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="eyebrow mb-4">Error 404</div>
        <h1 className="display-mega neon-pink-text mb-4" style={{ fontSize: '5rem', lineHeight: 1 }}>Lost lah?</h1>
        <p className="text-white/60 mb-10">
          This page doesn't exist boss — maybe the link's broken or the bottle's been moved. Let's get you back on track.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/" className="btn-pink">Back to Home <FaArrowRight size={14} /></Link>
          <Link to="/products" className="btn-ghost">Browse Drops</Link>
        </div>
        <a href="https://wa.me/60126884925?text=Hi%20Masterliqours%2C%20I%20got%20a%20broken%20link"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-[#25d366] transition-colors mt-8">
          <FaWhatsapp size={14} /> Tell us about it on WhatsApp
        </a>
      </div>
    </div>
  );
};

export default NotFound;
