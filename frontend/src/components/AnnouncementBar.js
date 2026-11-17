import React from 'react';
import { currentSeason } from './Seasonal';

const items = [
  'Low prices & value for money in one place',
  '100% authentic, original & genuine — guaranteed boss',
  'FREE delivery for orders above RM1,250 in KL & Klang Valley',
  'Settle payment via WhatsApp — fast & easy lah',
  'Earn points on every order — climb to Gold & Platinum tier',
];

const festive = [
  'Selamat Hari Deepavali — festive bottles delivered across KL & Klang Valley',
  'Open house sorted: order early, Deepavali is Sunday 8 November',
  'FREE delivery for orders above RM1,250 in KL & Klang Valley',
  '100% authentic, original & genuine — guaranteed boss',
];

const christmas = [
  'Merry Christmas — party bottles delivered same-day across KL & Klang Valley',
  'Hosting on Christmas Eve? Order early and skip the rush',
  'FREE delivery for orders above RM1,250',
  'Office party or family dinner? Bulk orders welcome',
  '100% authentic, original & genuine — guaranteed boss',
];

const newyear = [
  'Countdown to New Year — champagne & party stock delivered same-day',
  "New Year's Eve plans? Order before the 31st rush",
  'FREE delivery for orders above RM1,250',
  'Drink responsibly — 21+ only, never drink and drive',
];

const SEASON = {
  deepavali: { list: festive, bar: 'dv-bar', star: 'text-[#fff3c4]' },
  christmas: { list: christmas, bar: 'xm-bar', star: 'text-[#ffd27a]' },
  newyear: { list: newyear, bar: 'ny-bar', star: 'text-[#fff6d6]' },
};

const AnnouncementBar = () => {
  const cfg = SEASON[currentSeason()];
  const list = cfg ? cfg.list : items;
  return (
    <div className={`w-full overflow-hidden text-white border-b border-black/30 relative ${cfg ? cfg.bar : 'bg-[#ff007f]'}`}>
      <div
        className="flex whitespace-nowrap py-2.5 animate-marquee gap-12 text-xs sm:text-sm font-bold uppercase tracking-[0.18em]"
        data-testid="announcement-bar"
      >
        {[...list, ...list].map((t, i) => (
          <span key={i} className="flex items-center gap-12 shrink-0">
            <span className={cfg ? cfg.star : "text-[#ffd700]"}>✦</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;
