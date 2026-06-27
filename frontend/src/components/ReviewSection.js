import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaStar } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Stars = ({ rating, size = 14 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1,2,3,4,5].map(s => <FaStar key={s} size={size} style={{ color: s <= rating ? '#ffd700' : 'rgba(255,255,255,0.1)' }} />)}
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

  if (!loading && reviews.length === 0) return null;

  return (
    <section style={{ padding: '80px 0', background: 'linear-gradient(180deg,#030303,#060006,#030303)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 48 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 20, height: 1, background: '#ffd700', display: 'inline-block' }} /> Customer Reviews
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(36px,5vw,58px)', letterSpacing: '0.02em', lineHeight: 1 }}>
              What Bosses <span style={{ color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.3)' }}>Say</span>
            </h2>
          </div>

          {/* Rating summary */}
          {stats.total > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '20px 28px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, lineHeight: 1, color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>{stats.average?.toFixed(1)}</div>
              <Stars rating={Math.round(stats.average || 0)} size={16} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{stats.total} reviews</div>
            </div>
          )}
        </div>

        {/* Review cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, height: 140, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {reviews.slice(0, 6).map((r, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 22px', transition: 'border-color 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Stars rating={r.rating} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(r.created_at).toLocaleDateString('en-MY')}</span>
                </div>
                {r.comment && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, marginBottom: 14 }}>"{r.comment}"</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#ff007f,#ffd700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>
                    {(r.customer_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.customer_name || 'Verified Customer'}</div>
                    {r.product_name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.product_name}</div>}
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
