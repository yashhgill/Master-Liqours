import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context';
import { FaTrash, FaPlus, Minus } from 'react-icons/fa';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, total } = useCart();
  const navigate = useNavigate();
  
  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Your Cart is Empty</h1>
        <p className="text-gray-400 mb-8">Add some products untuk start shopping!</p>
        <button onClick={() => navigate('/products')} className="btn-neon">
          Browse Products
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.product_id} className="card flex items-center space-x-4">
              <img
                src={item.image_url || 'https://via.placeholder.com/100'}
                alt={item.name}
                className="w-24 h-24 object-cover rounded-lg"
                onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
              />
              
              <div className="flex-grow">
                <h3 className="text-lg font-bold">{item.name}</h3>
                <p className="text-gray-600">{item.category}</p>
                <p className="text-pink-600 font-bold">RM{item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  <FaMinus size={16} />
                </button>
                <span className="w-12 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  <FaPlus size={16} />
                </button>
              </div>
              
              <button
                onClick={() => removeFromCart(item.product_id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <FaTrash size={20} />
              </button>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="card h-fit">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
          
          <div className="space-y-2 mb-4 pb-4 border-b">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold">RM{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          
          <div className="flex justify-between text-xl font-bold mb-6">
            <span>Total</span>
            <span className="text-pink-600">RM{total.toFixed(2)}</span>
          </div>
          
          <button
            onClick={() => navigate('/checkout')}
            className="w-full btn-neon"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
