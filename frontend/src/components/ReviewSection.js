import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaStar } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Stars = ({ rating, size = 16 }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <FaStar key={s} size={size} className={s <= rating ? 'text-[#ffd700]' : 'text-white/15'} />
    ))}
  </div>
);

const ReviewSection = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(API + '/reviews/public').catch(() => ({ data: [] })),
      axios.get(API + '/reviews/stats').catch(() => ({ data: { average: 0, total: 0 } })),
    ]).then(([r, s]) => {
      setReviews(r.data || []);
      setStats(s.data || { average: 0, total: 0 });
    }).finally(() => setLoading(false));
  }, []);

  // Don't show section if no reviews yet
  if (!loading && reviews.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow mb-3">What Customers Say</div>
            <h2 className="display-xl">Real <span className="neon-pink-text">Reviews</span></h2>
          </div>
          {stats.total > 0 && (
            <div className="flex items-center gap-4 surface px-6 py-4 shrink-0">
              <div className="text-center">
                <div className="font-display text-5xl neon-pink-text">{stats.average.toFixed(1)}</div>
                <Stars rating={Math.round(stats.average)} size={14} />
                <div className="text-xs text-white/40 mt-1">{stats.total} review{stats.total !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                {[5,4,3,2,1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-white/40 w-3">{star}</span>
                      <FaStar size={10} className="text-[#ffd700] shrink-0" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#ffd700] rounded-full transition-all" style={{ width: pct + '%' }} />
                      </div>
                      <span className="text-white/30 w-6 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Review cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="surface p-6 animate-pulse space-y-3">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-3 bg-white/10 rounded w-full" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.slice(0, 6).map(r => (
              <div key={r.review_id} className="surface p-6 flex flex-col gap-3 hover:border-[#ffd700]/20 transition-all">
                <Stars rating={r.rating} />
                {r.comment && (
                  <p className="text-white/80 text-sm leading-relaxed flex-1">"{r.comment}"</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="font-bold text-sm">{r.user_name}</div>
                  <div className="text-xs text-white/30">
                    {new Date(r.created_at).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewSection;
