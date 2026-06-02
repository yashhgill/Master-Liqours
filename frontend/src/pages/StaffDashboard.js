import React from 'react';
import { useAuth } from '../context';

const StaffDashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Staff Dashboard</h1>
      
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h2>
        <p className="text-gray-600 mb-4">Staff dashboard features coming soon...</p>
        <p className="text-sm text-gray-500">You will be able to manage your assigned customers and orders here.</p>
      </div>
    </div>
  );
};

export default StaffDashboard;
