import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const FloatingWhatsApp = () => {
  const message = encodeURIComponent("Hi Masterliqours! I want to enquire about your products lah.");
  return (
    <a
      href={`https://wa.me/60126884925?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-float"
      data-testid="floating-whatsapp"
    >
      <FaWhatsapp size={22} />
      <span className="hidden sm:inline text-sm uppercase tracking-wider">WhatsApp</span>
    </a>
  );
};

export default FloatingWhatsApp;
