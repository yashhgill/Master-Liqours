import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords don\'t match lah'); return; }
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email, token, new_password: password });
      alert('Password reset! You can now log in.');
      navigate('/login');
    } catch (e) {
      setError(e.response?.data?.detail || 'Reset failed — try requesting a new link');
    } finally { setLoading(false); }
  };

  if (!token || !email) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="surface p-10 max-w-md w-full text-center">
        <h1 className="display-lg mb-4 text-[#ff007f]">Invalid Link</h1>
        <p className="text-white/50 mb-6">This reset link is invalid. Request a new one.</p>
        <Link to="/forgot-password" className="btn-pink">Request New Link</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="surface p-10 max-w-md w-full">
        <div className="eyebrow mb-2">Account</div>
        <h1 className="display-xl mb-2">New Password</h1>
        <p className="text-white/50 text-sm mb-8">Resetting password for <span className="text-white">{email}</span></p>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">New Password</label>
            <input type="password" className="input-dark" placeholder="Min 6 characters"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Confirm Password</label>
            <input type="password" className="input-dark" placeholder="Same again"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          {error && <p className="text-[#ff007f] text-sm">{error}</p>}
          <button onClick={submit} disabled={loading} className="btn-pink w-full disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
