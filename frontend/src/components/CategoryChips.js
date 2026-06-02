import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const chips = [
  { name: 'Wine', img: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=200' },
  { name: 'Whiskey', img: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { name: 'Beer', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { name: 'Vodka', img: 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=200' },
  { name: 'Gin', img: 'https://images.unsplash.com/photo-1614963366795-973eb8748ebb?w=200' },
  { name: 'Rum', img: 'https://images.unsplash.com/photo-1582819509237-d6f8a0a73f5d?w=200' },
  { name: 'Champagne', img: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=200' },
  { name: 'Tequila', img: 'https://images.unsplash.com/photo-1516535794938-6063878f08cc?w=200' },
  { name: 'Sake', img: 'https://images.unsplash.com/photo-1582553081877-d59b3c11b1a3?w=200' },
];

const CategoryChips = () => {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  return (
    <div className="relative bg-[#0a0a0a] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 relative">
        <button onClick={() => scroll(-1)} className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-black items-center justify-center shadow-lg hover:bg-[#39ff14] transition-all">
          <FaArrowLeft size={12} />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scroll-smooth no-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {chips.map((c) => (
            <Link
              key={c.name}
              to={`/products?category=${encodeURIComponent(c.name)}`}
              className="shrink-0 flex items-center gap-3 pl-1 pr-5 py-1 rounded-full bg-white text-black hover:bg-[#39ff14] transition-all group"
              data-testid={`cat-chip-${c.name}`}
            >
              <img src={c.img} alt={c.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#ffd700]/40 group-hover:ring-[#ff007f]/60 transition-all" />
              <span className="font-display text-xl uppercase">{c.name}</span>
            </Link>
          ))}
        </div>
        <button onClick={() => scroll(1)} className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-black items-center justify-center shadow-lg hover:bg-[#39ff14] transition-all">
          <FaArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default CategoryChips;
