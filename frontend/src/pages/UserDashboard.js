import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaTrophy, FaBox, FaChartLine } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [rewards, setRewards] = useState([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [ordersRes, rewardsRes] = await Promise.all([
        axios.get(`${API}/orders/my-orders`, { withCredentials: true }),
        axios.get(`${API}/users/rewards`, { withCredentials: true })
      ]);
      setOrders(ordersRes.data);
      setRewards(rewardsRes.data);
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };
  
  const getTierProgress = () => {
    if (user.tier === 'platinum') return 100;
    if (user.tier === 'gold') return Math.min(100, (user.points / 10000) * 100);
    return Math.min(100, (user.points / 5000) * 100);
  };
  
  const getNextTier = () => {
    if (user.tier === 'platinum') return null;
    if (user.tier === 'gold') return { name: 'Platinum', points: 10000 };
    return { name: 'Gold', points: 5000 };
  };
  
  const nextTier = getNextTier();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
              <FaTrophy className="text-pink-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Your Tier</p>
              <p className="text-2xl font-bold">{user.tier.toUpperCase()}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <FaChartLine className="text-purple-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Points</p>
              <p className="text-2xl font-bold">{user.points}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <FaBox className="text-cyan-500" size={24} />
            </div>
            <div>
              <p className="text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tier Progress */}
      {nextTier && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Progress to {nextTier.name}</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-4 rounded-full transition-all"
              style={{ width: `${getTierProgress()}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {nextTier.points - user.points} points to {nextTier.name} tier!
          </p>
        </div>
      )}
      
      {/* Recent Orders */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Recent Orders</h2>
        
        {orders.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No orders yet. Start shopping!</p>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div key={order.order_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">Order #{order.order_id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-pink-600">RM{order.total.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-2">
                  +{order.points_earned} points earned!
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
