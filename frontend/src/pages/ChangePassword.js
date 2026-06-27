import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PasswordField = ({ label, value, onChange, placeholder, show, onToggle, onEnter }) => (
  <div>
    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input-dark pr-12"
        placeholder={placeholder || ''}
        value={value}
        onChange={onChange}
        onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
      >
        {show ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
      </button>
    </div>
  </div>
);

const ChangePassword = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleShow = (key) => setShow(s => ({ ...s, [key]: !s[key] }));

  const strength = (() => {
    const p = form.newPass;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['#ff007f', '#ffd700', '#00f0ff', '#39ff14'];

  const submit = async () => {
    if (!form.current) { setError('Enter your current password lah'); return; }
    if (form.newPass.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPass !== form.confirm) { setError("Passwords don't match lah"); return; }
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: form.current,
        new_password: form.newPass,
      }, { withCredentials: true });
      setSuccess(true);
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (e) {
      setError(e.response?.data?.detail || 'Change failed — try again');
    } finally { setLoading(false); }
  };

  const isGoogleOnly = user && !user.password_hash && user.picture;

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.4em",textTransform:"uppercase",color:"rgba(255,215,0,0.7)",marginBottom:10,display:"flex",alignItems:"center",gap:10}}><span style={{width:20,height:1,background:"#ffd700",display:"inline-block"}} /> Account Settings</div>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(36px,5vw,60px)",letterSpacing:"0.02em",lineHeight:1,marginBottom:8}}>Change <span style={{color:"#ff007f",textShadow:"0 0 30px rgba(255,0,127,0.4)"}}>Password</span></h1>
      <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:32}}>Keep your account secure boss.</p>

      {isGoogleOnly ? (
        <div className="surface p-8 text-center">
          <FaLock size={32} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50">You signed in with Google — no password to change.</p>
        </div>
      ) : success ? (
        <div className="surface p-8 text-center">
          <FaCheckCircle size={48} className="text-[#39ff14] mx-auto mb-4" />
          <h2 className="display-md mb-2">Password Changed!</h2>
          <p className="text-white/50 mb-6">Your new password is active. Use it next time you log in.</p>
          <button onClick={() => setSuccess(false)} className="btn-pink">Change Again</button>
        </div>
      ) : (
        <div className="surface p-8 space-y-5">
          <PasswordField
            label="Current Password"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            show={show.current}
            onToggle={() => toggleShow('current')}
          />
          <PasswordField
            label="New Password"
            value={form.newPass}
            placeholder="Min 6 characters"
            onChange={e => setForm({ ...form, newPass: e.target.value })}
            show={show.newPass}
            onToggle={() => toggleShow('newPass')}
          />

          {/* Password strength bar */}
          {form.newPass && (
            <div>
              <div className="flex gap-1 mb-1">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i < strength ? strengthColor[strength - 1] : '#333' }} />
                ))}
              </div>
              <div className="text-xs" style={{ color: strengthColor[strength - 1] }}>
                {strengthLabel[strength - 1]}
              </div>
            </div>
          )}

          <PasswordField
            label="Confirm New Password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            show={show.confirm}
            onToggle={() => toggleShow('confirm')}
            onEnter={submit}
          />

          {form.confirm && form.newPass !== form.confirm && (
            <p className="text-[#ff007f] text-xs">Passwords don't match</p>
          )}
          {form.confirm && form.newPass === form.confirm && form.confirm.length > 0 && (
            <p className="text-[#39ff14] text-xs">✓ Passwords match</p>
          )}

          {error && <p className="text-[#ff007f] text-sm bg-[#ff007f10] px-4 py-3 rounded-xl">{error}</p>}

          <button onClick={submit} disabled={loading} className="btn-pink w-full disabled:opacity-50">
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChangePassword;
