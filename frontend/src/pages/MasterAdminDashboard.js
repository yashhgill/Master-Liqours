import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaChartLine, FaBox, FaUsers, FaBolt } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MasterAdminDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/analytics`, { withCredentials: true }),
      axios.get(`${API}/admin/all-orders`, { withCredentials: true }),
    ]).then(([a, o]) => { setAnalytics(a.data); setOrders(o.data); }).catch(() => {});
  }, []);

  if (!analytics) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-white/60">Loading boss...</div>;

  const stats = [
    { label: 'Total Sales', val: `RM${(analytics.total_sales || 0).toFixed(2)}`, icon: FaChartLine, color: '#ff007f' },
    { label: 'Total Orders', val: analytics.total_orders || 0, icon: FaBox, color: '#00f0ff' },
    { label: 'Pending', val: analytics.pending_orders || 0, icon: FaUsers, color: '#ffd700' },
    { label: 'Flash Sales', val: analytics.active_flash_sales || 0, icon: FaBolt, color: '#39ff14' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Boss Console</div>
      <h1 className="display-xl mb-2">Welcome <span className="neon-pink-text">{user?.name}</span></h1>
      <p className="text-white/60 mb-10">Full system view — sales, staff, orders, all here.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="surface p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow !mb-0">{s.label}</div>
              <s.icon style={{ color: s.color }} />
            </div>
            <div className="display-lg" style={{ color: s.color, textShadow: `0 0 25px ${s.color}55` }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <h2 className="display-md mb-5">Sales by Staff</h2>
          <div className="space-y-3">
            {(analytics.staff_sales || []).map((s, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
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
            {orders.slice(0, 8).map((o) => (
              <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
