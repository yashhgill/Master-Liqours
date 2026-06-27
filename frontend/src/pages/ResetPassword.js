import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

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

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '14px 18px', color: '#fff', fontSize: 15, outline: 'none',
  };

  const submit = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError("Passwords don't match lah"); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email, token, new_password: password });
      alert('Password reset! You can now log in.');
      navigate('/login');
    } catch (e) { setError(e.response?.data?.detail || 'Reset failed — try requesting a new link'); }
    finally { setLoading(false); }
  };

  const sharedPage = (content) => (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', background: '#030303', position: 'relative' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.07), transparent 65%)', filter: 'blur(100px)' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>{content}</div>
    </div>
  );

  if (!token || !email) return sharedPage(
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,0,127,0.3)', marginBottom: 20 }}>INVALID LINK</div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: '#ff007f', marginBottom: 12 }}>Invalid Link</div>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>This reset link is invalid or expired. Request a new one boss.</p>
      <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', padding: '14px 28px', borderRadius: 50, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
        Request New Link
      </Link>
    </div>
  );

  return sharedPage(
    <>
      <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginBottom: 32, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        <FaArrowLeft size={10} /> Back to Sign In
      </Link>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 10 }}>Reset Password</div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: '0.02em', lineHeight: 1, marginBottom: 8 }}>NEW PASSWORD.</div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 }}>Resetting for <span style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</span></p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same again"
            onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        </div>
        {error && <div style={{ background: 'rgba(255,0,127,0.08)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ff007f', fontSize: 14 }}>{error}</div>}
        <button onClick={submit} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 28px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 0 24px rgba(255,0,127,0.3)' }}>
          {loading ? 'Resetting...' : <><span>Reset Password</span><FaArrowRight size={13} /></>}
        </button>
      </div>
    </>
  );
};

export default ResetPassword;
