import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: email.trim() });
      setSent(true);
    } catch (e) {
      setSent(true); // still show success to prevent email enumeration
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="surface p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <div className="eyebrow mb-2">Check your inbox</div>
        <h1 className="display-lg mb-4">Reset link sent!</h1>
        <p className="text-white/50 text-sm mb-6">If that email exists, we've sent a reset link. Check your inbox (and spam folder).</p>
        <Link to="/login" className="btn-pink w-full block text-center">Back to Login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="surface p-10 max-w-md w-full">
        <div className="eyebrow mb-2">Account</div>
        <h1 className="display-xl mb-2">Forgot Password</h1>
        <p className="text-white/50 text-sm mb-8">Enter your email and we'll send a reset link.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Email</label>
            <input type="email" className="input-dark" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <button onClick={submit} disabled={loading} className="btn-pink w-full disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Remember it? <Link to="/login" className="text-[#ff007f] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
