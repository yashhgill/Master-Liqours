import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaArrowRight, FaGoogle, FaWhatsapp } from 'react-icons/fa';

const GlowInput = ({ label, ...props }) => (
  <div>
    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>{label}</label>
    <input {...props} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }}
      onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err) { setError(err.response?.data?.detail || 'Cannot login lah, try again'); }
    finally { setLoading(false); }
  };

  const googleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin + '/auth/google/callback';
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('g_oauth_state', state);
    sessionStorage.setItem('g_oauth_return_to', '/');
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', access_type: 'online', include_granted_scopes: 'true', prompt: 'select_account', state });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#030303' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-end relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0008 0%, #030303 100%)' }}>
        {/* Orb */}
        <div style={{ position: 'absolute', width: 600, height: 600, top: -100, left: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.2), transparent 65%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, bottom: 0, right: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.12), transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Floating bottle */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', fontSize: 180, opacity: 0.6, animation: 'bottleFloat 6s ease-in-out infinite', filter: 'drop-shadow(0 0 40px rgba(255,0,127,0.3))' }}>🥃</div>
        {/* Bottom copy */}
        <div className="relative z-10 p-14 pb-16">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 1, background: '#ffd700', display: 'inline-block' }} /> Welcome Back Boss
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 16 }}>
            SIGN IN &<br/><span style={{ color: '#ff007f', textShadow: '0 0 40px rgba(255,0,127,0.5)' }}>DRINK UP.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 360 }}>Login to track orders, earn points & climb the reward tiers lah.</p>
        </div>
        <style>{`@keyframes bottleFloat{0%,100%{transform:translateX(-50%) rotate(-4deg)}50%{transform:translateX(-50%) translateY(-20px) rotate(4deg)}}`}</style>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, height: 1, background: '#ffd700', display: 'inline-block' }} /> Sign In
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: '0.02em', lineHeight: 1 }}>WELCOME BACK.</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,0,127,0.08)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: 14, padding: '14px 18px', color: '#ff007f', fontSize: 14, marginBottom: 20 }} data-testid="login-error">{error}</div>
          )}

          {/* Google */}
          <button type="button" onClick={googleLogin} data-testid="login-google-btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#030303', borderRadius: 50, padding: '13px 20px', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 20, transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            <FaGoogle size={16} style={{ color: '#ff007f' }} /> Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)' }}>or email lah</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlowInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" data-testid="login-email-input" />
            <GlowInput label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" data-testid="login-password-input" />

            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} data-testid="login-submit-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? 'rgba(255,0,127,0.5)' : 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 28px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 0 30px rgba(255,0,127,0.35)', transition: 'all 0.3s' }}>
              {loading ? 'Signing in...' : <><span>Sign In</span><FaArrowRight size={13} /></>}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: '#ff007f', fontWeight: 700, textDecoration: 'none' }}>Register free →</Link>
          </div>

          <a href="https://wa.me/60126884925" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, fontSize: 13, color: 'rgba(37,211,102,0.7)', textDecoration: 'none' }}>
            <FaWhatsapp size={14} /> Need help? Chat us lah
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
