import React from 'react';
import { currentSeason } from './Seasonal';

const items = [
  'Low prices & value for money in one place',
  '100% authentic, original & genuine — guaranteed boss',
  'FREE delivery for orders above RM1,250 in Peninsular Malaysia',
  'Settle payment via WhatsApp — fast & easy lah',
  'Earn points on every order — climb to Gold & Platinum tier',
];

const festive = [
  'Selamat Hari Deepavali — festive bottles delivered across KL & Klang Valley',
  'Open house sorted: order early, Deepavali is Sunday 8 November',
  'FREE delivery for orders above RM1,250 in Peninsular Malaysia',
  '100% authentic, original & genuine — guaranteed boss',
];

const AnnouncementBar = () => {
  const deepavali = currentSeason() === 'deepavali';
  const list = deepavali ? festive : items;
  return (
    <div className={`w-full overflow-hidden text-white border-b border-black/30 relative ${deepavali ? 'dv-bar' : 'bg-[#ff007f]'}`}>
      <div
        className="flex whitespace-nowrap py-2.5 animate-marquee gap-12 text-xs sm:text-sm font-bold uppercase tracking-[0.18em]"
        data-testid="announcement-bar"
      >
        {[...list, ...list].map((t, i) => (
          <span key={i} className="flex items-center gap-12 shrink-0">
            <span className={deepavali ? "text-[#fff3c4]" : "text-[#ffd700]"}>✦</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;
