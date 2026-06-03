import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaChartLine, FaBoxOpen, FaClock, FaBolt } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAT_CARDS = [
  { key: 'total_sales', label: 'Total Sales', icon: FaChartLine, color: '#ff007f', format: (v) => `RM${(v || 0).toFixed(2)}` },
  { key: 'total_orders', label: 'Total Orders', icon: FaBoxOpen, color: '#00f0ff', format: (v) => v || 0 },
  { key: 'pending_orders', label: 'Pending', icon: FaClock, color: '#ffd700', format: (v) => v || 0 },
  { key: 'active_flash_sales', label: 'Flash Sales', icon: FaBolt, color: '#39ff14', format: (v) => v || 0 },
];

const OverviewTab = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/analytics`, { withCredentials: true }),
      axios.get(`${API}/admin/all-orders`, { withCredentials: true }),
    ])
      .then(([a, o]) => { setAnalytics(a.data); setRecentOrders(o.data); })
      .catch(() => {});
  }, []);

  if (!analytics) return <div className="surface p-10 text-center text-white/60">Loading analytics boss...</div>;

  return (
    <div className="space-y-6" data-testid="admin-overview-panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="surface p-6" data-testid={`overview-stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow !mb-0">{s.label}</div>
              <s.icon style={{ color: s.color }} />
            </div>
            <div className="display-lg" style={{ color: s.color, textShadow: `0 0 25px ${s.color}55` }}>{s.format(analytics[s.key])}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <h2 className="display-md mb-5">Sales by Staff</h2>
          <div className="space-y-3">
            {(analytics.staff_sales || []).length === 0 ? (
              <div className="text-white/40 text-sm">No staff data yet lah. Add staff in the Staff tab.</div>
            ) : (analytics.staff_sales || []).map((s, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between" data-testid="overview-staff-row">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-white/50">{s.orders || 0} orders</div>
                </div>
                <div className="font-display text-xl neon-pink-text">RM{(s.sales || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          <h2 className="display-md mb-5">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.slice(0, 8).map((o) => (
              <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between" data-testid="overview-order-row">
                <div>
                  <div className="font-bold">#{o.order_id.slice(0, 8)}</div>
                  <div className="text-xs text-white/50">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                  <span className={`text-[10px] uppercase font-bold ${
                    o.status === 'delivered' ? 'text-[#39ff14]' : o.status === 'cancelled' ? 'text-[#ff007f]' : 'text-[#ffd700]'
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <div className="text-white/40 text-sm">No orders yet boss.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
