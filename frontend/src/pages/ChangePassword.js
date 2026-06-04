import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChangePassword = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (form.newPass.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPass !== form.confirm) { setError("Passwords don't match lah"); return; }
    setError(''); setMsg(null);
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: form.current,
        new_password: form.newPass,
      }, { withCredentials: true });
      setMsg('Password changed successfully!');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (e) {
      setError(e.response?.data?.detail || 'Change failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="eyebrow mb-2">Account Settings</div>
      <h1 className="display-xl mb-8">Change Password</h1>

      {user && !user.picture?.includes('google') && !user.password_hash === null ? (
        <p className="text-white/50">You signed in with Google — no password to change.</p>
      ) : (
        <div className="surface p-8 space-y-5">
          {['current', 'newPass', 'confirm'].map((key, i) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">
                {i === 0 ? 'Current Password' : i === 1 ? 'New Password' : 'Confirm New Password'}
              </label>
              <input type="password" className="input-dark"
                placeholder={i === 1 ? 'Min 6 characters' : ''}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          ))}
          {error && <p className="text-[#ff007f] text-sm">{error}</p>}
          {msg && <p className="text-[#39ff14] text-sm">{msg}</p>}
          <button onClick={submit} disabled={loading} className="btn-pink w-full disabled:opacity-50">
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChangePassword;
