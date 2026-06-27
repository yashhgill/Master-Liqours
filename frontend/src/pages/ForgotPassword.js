import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setMsg('Check your email boss — reset link is on the way lah.');
    } catch (err) { setError(err.response?.data?.detail || 'Cannot send reset email, try again'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', background: '#030303', position: 'relative' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.07), transparent 65%)', filter: 'blur(100px)' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', marginBottom: 36, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          <FaArrowLeft size={11} /> Back to Sign In
        </Link>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 20, height: 1, background: '#ffd700', display: 'inline-block' }} /> Forgot Password
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: '0.02em', lineHeight: 1, marginBottom: 12 }}>RESET ACCESS.</div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>Enter your email and we'll send a reset link lah. Check spam if it doesn't arrive boss.</p>

        {msg && <div style={{ background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.3)', borderRadius: 14, padding: '14px 18px', color: '#39ff14', fontSize: 14, marginBottom: 20 }}>{msg}</div>}
        {error && <div style={{ background: 'rgba(255,0,127,0.08)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: 14, padding: '14px 18px', color: '#ff007f', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', color: '#fff', fontSize: 15, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
          <button type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 28px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 0 24px rgba(255,0,127,0.3)' }}>
            {loading ? 'Sending...' : <><span>Send Reset Link</span><FaArrowRight size={13} /></>}
          </button>
        </form>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>
    </div>
  );
};

export default ForgotPassword;
