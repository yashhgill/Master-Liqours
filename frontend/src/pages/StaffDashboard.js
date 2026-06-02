import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaUsers, FaBox, FaWhatsapp } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StaffDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    axios.get(`${API}/staff/my-orders`, { withCredentials: true }).then((r) => setOrders(r.data)).catch(() => {});
    axios.get(`${API}/staff/my-stock`, { withCredentials: true }).then((r) => setStock(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Staff Console</div>
      <h1 className="display-xl mb-2">Hi <span className="neon-cyan-text">{user?.name}</span></h1>
      <p className="text-white/60 mb-10">Your customers, your orders, your stock — all in one place lah.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="surface p-6"><div className="eyebrow mb-3">Assigned Orders</div><div className="display-lg neon-pink-text">{orders.length}</div></div>
        <div className="surface p-6"><div className="eyebrow mb-3">Stock Items</div><div className="display-lg neon-lime-text">{stock.length}</div></div>
        <div className="surface p-6"><div className="eyebrow mb-3">WhatsApp</div><a href="https://wa.me/60126884925" className="display-md text-[#39ff14] flex items-center gap-2"><FaWhatsapp /> Open</a></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <h2 className="display-md mb-5">Recent Orders</h2>
          {orders.length === 0 ? <div className="text-white/40 text-sm">No orders assigned yet.</div> : (
            <div className="space-y-3">
              {orders.slice(0, 6).map((o) => (
                <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
                  <div>
                    <div className="font-bold">#{o.order_id.slice(0, 8)}</div>
                    <div className="text-xs text-white/50">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="font-display text-xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface p-6">
          <h2 className="display-md mb-5">My Stock</h2>
          {stock.length === 0 ? <div className="text-white/40 text-sm">No stock assigned yet boss.</div> : (
            <div className="space-y-3">
              {stock.map((s, idx) => (
                <div key={idx} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
                  <div>
                    <div className="font-bold">{s.product_name}</div>
                    <div className="text-xs text-white/50">{s.category}</div>
                  </div>
                  <div className="font-display text-xl neon-lime-text">×{s.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
