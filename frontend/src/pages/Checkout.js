import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, useCart } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Checkout = () => {
  const { user } = useAuth();
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  // Calculate benefits
  const getTierBenefits = () => {
    if (user.tier === 'platinum') {
      return { shipping: 100, discount: total * 0.03 };
    } else if (user.tier === 'gold') {
      return { shipping: 50, discount: 0 };
    }
    return { shipping: 0, discount: 0 };
  };
  
  const benefits = getTierBenefits();
  const finalTotal = total - benefits.discount;
  const shippingCost = Math.max(0, 15 - benefits.shipping); // Base shipping RM15
  
  const handleCheckout = async () => {
    if (!address.trim()) {
      alert('Please enter shipping address');
      return;
    }
    
    setLoading(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));
      
      const res = await axios.post(
        `${API}/orders/checkout`,
        { items, shipping_address: address },
        { withCredentials: true }
      );
      
      setOrderData(res.data);
      setShowWhatsApp(true);
    } catch (error) {
      alert('Checkout failed: ' + (error.response?.data?.detail || 'Error'));
    } finally {
      setLoading(false);
    }
  };
  
  const completeOrder = () => {
    clearCart();
    navigate('/dashboard');
  };
  
  if (showWhatsApp && orderData) {
    const staffPhone = (orderData.staff_whatsapp || '+60126884925').replace(/\+/g, '');
    const staffName = orderData.staff_name || 'staff';
    const message = `Hi ${staffName}! I've placed order #${orderData.order_id.slice(0, 8)}. Total: RM${(finalTotal + shippingCost).toFixed(2)}. Address: ${address}`;
    const whatsappUrl = `https://wa.me/${staffPhone}?text=${encodeURIComponent(message)}`;
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto card text-center">
          <h2 className="text-3xl font-bold mb-6 gradient-text">Order Placed! 🎉</h2>
          <p className="text-gray-600 mb-4">Order ID: #{orderData.order_id.slice(0, 8)}</p>
          <p className="text-gray-600 mb-8">Now, please proceed dengan payment via WhatsApp:</p>
          
          <div className="bg-pink-50 p-6 rounded-lg mb-8">
            <p className="text-lg font-bold mb-2">Total Amount:</p>
            <p className="text-4xl font-bold text-pink-600 mb-4">RM{(finalTotal + shippingCost).toFixed(2)}</p>
            <p className="text-sm text-gray-600">Please transfer to staff & send screenshot</p>
          </div>
          
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-neon inline-block mb-4" data-testid="checkout-whatsapp-btn">
            Open WhatsApp to Pay
          </a>
          
          <button onClick={completeOrder} className="block w-full btn-outline">
            I've Sent Payment
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 card">
          <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>
          
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your full address"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            rows={4}
            required
          />
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Your Tier: {user.tier.toUpperCase()} 🏆</h3>
            <p className="text-sm text-gray-600">Points: {user.points}</p>
            {benefits.shipping > 0 && (
              <p className="text-green-600 font-semibold">✓ RM{benefits.shipping} off shipping!</p>
            )}
            {benefits.discount > 0 && (
              <p className="text-green-600 font-semibold">✓ 3% discount on products!</p>
            )}
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="card h-fit">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
          
          <div className="space-y-2 mb-4">
            {cart.map(item => (
              <div key={item.product_id} className="flex justify-between text-sm">
                <span>{item.name} x{item.quantity}</span>
                <span>RM{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-2 mb-4 pb-4 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>RM{total.toFixed(2)}</span>
            </div>
            {benefits.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount (3%)</span>
                <span>-RM{benefits.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {benefits.shipping > 0 && <span className="line-through text-gray-400 mr-2">RM15</span>}
                RM{shippingCost.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between text-xl font-bold mb-6 pt-4 border-t">
            <span>Total</span>
            <span className="text-pink-600">RM{(finalTotal + shippingCost).toFixed(2)}</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full btn-neon"
            data-testid="checkout-place-order-btn"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
