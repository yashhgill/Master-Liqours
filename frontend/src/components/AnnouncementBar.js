import React from 'react';

const items = [
  'Low prices & value for money in one place',
  '100% authentic, original & genuine — guaranteed boss',
  'FREE delivery for orders above RM1,250 across the Klang Valley',
  'Settle payment via WhatsApp — fast & easy lah',
  'Earn points on every order — climb to Gold & Platinum tier',
];

const AnnouncementBar = () => {
  return (
    <div className="w-full overflow-hidden bg-[#ff007f] text-white border-b border-black/30 relative">
      <div
        className="flex whitespace-nowrap py-2.5 animate-marquee gap-12 text-xs sm:text-sm font-bold uppercase tracking-[0.18em]"
        data-testid="announcement-bar"
      >
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-12 shrink-0">
            <span className="text-[#ffd700]">✦</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;
