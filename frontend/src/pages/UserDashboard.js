import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context';
import { FaTrophy, FaBox, FaChartLine, FaGem, FaHeart } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const wishlistCount = (() => { try { return JSON.parse(localStorage.getItem('ml_wishlist')||'[]').length; } catch { return 0; } })();

  useEffect(() => {
    axios.get(`${API}/orders/my-orders`, { withCredentials: true })
      .then((r) => setOrders(r.data)).catch(() => {});
  }, []);

  const nextTier = user?.tier === 'platinum' ? null : user?.tier === 'gold' ? { name: 'Platinum', goal: 10000 } : { name: 'Gold', goal: 5000 };
  const progress = nextTier ? Math.min(100, ((user.points || 0) / nextTier.goal) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.4em",textTransform:"uppercase",color:"rgba(255,215,0,0.7)",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:20,height:1,background:"#ffd700",display:"inline-block"}} /> My Account
      </div>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(40px,6vw,64px)",letterSpacing:"0.02em",lineHeight:1,marginBottom:8}}>
        Hi <span style={{color:"#ff007f",textShadow:"0 0 30px rgba(255,0,127,0.4)"}}>{user?.name}</span>
      </h1>
      <p style={{color:"rgba(255,255,255,0.45)",marginBottom:40}}>Welcome back boss. Here's your shopping recap.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow !mb-0">Tier</div>
            <FaTrophy className="text-[#ffd700]" />
          </div>
          <div className="display-lg uppercase">{user?.tier}</div>
        </div>
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow !mb-0">Points</div>
            <FaChartLine className="text-[#00f0ff]" />
          </div>
          <div className="display-lg neon-cyan-text">{user?.points || 0}</div>
        </div>
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow !mb-0">Orders</div>
            <FaBox className="text-[#39ff14]" />
          </div>
          <div className="display-lg neon-lime-text">{orders.length}</div>
        </div>
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow !mb-0">Wishlist</div>
            <FaHeart className="text-[#ff007f]" />
          </div>
          <div className="display-lg neon-pink-text">{wishlistCount}</div>
          {wishlistCount > 0 && <Link to="/products" className="text-xs text-white/40 hover:text-[#ff007f] transition-colors">Browse saved items →</Link>}
        </div>
      </div>

      {nextTier && (
        <div className="surface p-6 mb-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow !mb-1">Progress</div>
              <div className="font-bold">Climb to {nextTier.name}</div>
            </div>
            <FaGem className="text-[#00f0ff]" size={20} />
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ff007f] via-[#ffd700] to-[#00f0ff]" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-white/50 mt-2">{Math.max(0, nextTier.goal - (user?.points || 0))} points lagi to {nextTier.name} tier!</div>
        </div>
      )}

      <div className="surface p-6">
<h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:"0.02em",marginBottom:20}}>Recent Orders</h2>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-white/40">No orders yet boss. Start shopping lah!</div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 8).map((o) => (
              <Link
                key={o.order_id}
                to={`/orders/${o.order_id}`}
                className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-[#ff007f]/40 transition-colors block"
                data-testid={`dash-order-${o.order_id}`}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="font-bold">#{o.order_id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-xs text-white/50 mb-1">{new Date(o.created_at).toLocaleDateString()} · {o.points_earned}pts earned</div>
                  {(o.items || []).length > 0 && (
                    <div className="text-xs text-white/70 truncate">
                      {o.items.map(it => `${it.quantity}× ${it.product_name || 'Item'}`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-display text-xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 ${
                    o.status === 'delivered' ? 'bg-[#39ff14]/20 text-[#39ff14]' :
                    o.status === 'cancelled' ? 'bg-[#ff007f]/20 text-[#ff007f]' : 'bg-[#ffd700]/20 text-[#ffd700]'
                  }`}>{o.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
