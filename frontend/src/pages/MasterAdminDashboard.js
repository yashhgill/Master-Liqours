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
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/admin/analytics`, { withCredentials: true }),
        axios.get(`${API}/admin/all-orders`, { withCredentials: true })
      ]);
      setAnalytics(analyticsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };
  
  if (!analytics) {
    return <div className="container mx-auto px-4 py-20 text-center text-white">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Master Admin Dashboard</h1>
      <p className="text-white mb-8">Welcome, Boss {user.name}! Full system control.</p>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
              <FaChartLine className="text-pink-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold">RM{analytics.total_sales.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <FaBox className="text-purple-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{analytics.total_orders}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <FaUsers className="text-yellow-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold">{analytics.pending_orders}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <FaBolt className="text-cyan-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Active Flash Sales</p>
              <p className="text-2xl font-bold">{analytics.active_flash_sales}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Staff Sales */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-6">Sales by Staff</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.staff_sales.map((staff, idx) => (
            <div key={idx} className="border border-gray-200 p-4 rounded-lg">
              <h3 className="font-bold text-lg">{staff.name}</h3>
              <p className="text-2xl font-bold text-pink-600">RM{staff.sales?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-gray-600">{staff.orders} orders</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Orders */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">All Orders</h2>
        <div className="space-y-4">
          {orders.slice(0, 10).map(order => (
            <div key={order.order_id} className="border border-gray-200 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold">Order #{order.order_id.slice(0, 8)}</p>
                <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-pink-600">RM{order.total.toFixed(2)}</p>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
