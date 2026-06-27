import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaArrowRight, FaWhatsapp } from 'react-icons/fa';

const GlowInput = ({ label, hint, ...props }) => (
  <div>
    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8 }}>{label}</label>
    <input {...props} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }}
      onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.6)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
    {hint && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{hint}</p>}
  </div>
);

const Register = () => {
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', referral_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await register(form); navigate('/'); }
    catch (err) { setError(err.response?.data?.detail || 'Cannot register lah, try again'); }
    finally { setLoading(false); }
  };

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#030303' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-end relative overflow-hidden">
        <div style={{ position: 'absolute', width: 600, height: 600, top: -100, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.18), transparent 65%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.1), transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', fontSize: 160, opacity: 0.5, animation: 'bottleFloat 7s ease-in-out infinite', filter: 'drop-shadow(0 0 40px rgba(0,240,255,0.3))' }}>🍾</div>
        <div className="relative z-10 p-14 pb-16">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 1, background: '#ffd700', display: 'inline-block' }} /> Join The Family
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 0.95, letterSpacing: '0.02em', marginBottom: 16 }}>
            CREATE &<br/><span style={{ color: '#00f0ff', textShadow: '0 0 40px rgba(0,240,255,0.5)' }}>EARN POINTS.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>Sign up and get 100 welcome points + a dedicated staff member for fast WhatsApp orders.</p>
          <div className="flex gap-3 mt-6">
            {['100 Welcome Points', 'Dedicated Staff', 'Flash Sale Access'].map(b => (
              <div key={b} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>✓ {b}</div>
            ))}
          </div>
        </div>
        <style>{`@keyframes bottleFloat{0%,100%{transform:translateX(-50%) rotate(-4deg)}50%{transform:translateX(-50%) translateY(-20px) rotate(4deg)}}`}</style>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.7)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, height: 1, background: '#ffd700', display: 'inline-block' }} /> Register
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: '0.02em', lineHeight: 1 }}>JOIN LAH.</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,0,127,0.08)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: 14, padding: '14px 18px', color: '#ff007f', fontSize: 14, marginBottom: 20 }}>{error}</div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <GlowInput label="Full Name" name="name" value={form.name} onChange={change} required placeholder="Ahmad, Raj, David..." data-testid="reg-name-input" />
            <GlowInput label="Email" type="email" name="email" value={form.email} onChange={change} required placeholder="your@email.com" data-testid="reg-email-input" />
            <GlowInput label="Password" type="password" name="password" value={form.password} onChange={change} required minLength={6} placeholder="Min 6 characters" data-testid="reg-password-input" />
            <GlowInput label="Phone (Optional)" type="tel" name="phone" value={form.phone} onChange={change} placeholder="+60 12 345 6789" />
            <GlowInput label="Referral Code (Optional)" name="referral_code" value={form.referral_code} onChange={change} placeholder="Enter your referral code"
              hint="Got a staff referral? Enter here for direct WhatsApp service lah." data-testid="reg-referral-input" />

            <button type="submit" disabled={loading} data-testid="register-submit-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? 'rgba(255,0,127,0.5)' : 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', border: 'none', borderRadius: 50, padding: '16px 28px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 0 30px rgba(255,0,127,0.35)', marginTop: 4 }}>
              {loading ? 'Creating Account...' : <><span>Create Account</span><FaArrowRight size={13} /></>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ff007f', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </div>

          <a href="https://wa.me/60126884925" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, fontSize: 13, color: 'rgba(37,211,102,0.7)', textDecoration: 'none' }}>
            <FaWhatsapp size={14} /> Need help? Chat us lah
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;
