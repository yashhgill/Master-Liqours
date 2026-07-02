import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const CartContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// --- Token-based auth ---------------------------------------------------
// We keep the session token in localStorage and send it as an Authorization
// header on every request. This survives page refreshes on ANY domain,
// even when the browser blocks the cross-site session cookie. The cookie is
// still set by the backend as a fallback.
const TOKEN_KEY = 'session_token';

const applyToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Restore any saved token before the app makes its first request.
applyToken(localStorage.getItem(TOKEN_KEY));

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    if (response.data.session_token) applyToken(response.data.session_token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    await login(data.email, data.password);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {}
    applyToken(null);
    setUser(null);
    // Clear cart on logout so roles don't share cart data
    localStorage.removeItem('cart');
  };

  // Used by the Google OAuth callback: persist token + user in one shot.
  const setUserDirect = (u, token) => {
    if (token) applyToken(token);
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, setUserDirect }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Cart Provider
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const s = localStorage.getItem('cart');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1, flashSalePrice = null) => {
    // Track add-to-cart signal for ranking algorithm — fire and forget
    axios.post(`${API}/products/track?product_id=${product.product_id}&event_type=add_to_cart`).catch(() => {});
    // Use flash sale price if provided, otherwise use product base price
    const effectivePrice = flashSalePrice ?? product.price;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.product_id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity, price: effectivePrice }
            : item
        );
      }
      return [...prev, { ...product, price: effectivePrice, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
