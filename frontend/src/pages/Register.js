import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaArrowRight } from 'react-icons/fa';

const Register = () => {
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', referral_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Cannot register lah, try again');
    } finally { setLoading(false); }
  };

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1200" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-[#00f0ff]/20" />
        <div className="relative z-10 p-12 lg:p-16 h-full flex flex-col justify-end">
          <div className="eyebrow mb-4">Join The Family</div>
          <h1 className="display-mega text-glow-white mb-4">Create &<br/><span className="neon-cyan-text">earn points.</span></h1>
          <p className="text-white/70 max-w-md">Sign up & get 100 welcome points + a dedicated staff member for fast WhatsApp orders.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="eyebrow mb-3">Register</div>
          <h2 className="display-xl mb-8">Join Lah.</h2>

          {error && <div className="bg-[#ff007f]/10 border border-[#ff007f]/40 text-[#ff007f] px-5 py-4 rounded-2xl mb-5 text-sm">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Name</label>
              <input name="name" value={form.name} onChange={change} required className="input-dark" data-testid="reg-name-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Email</label>
              <input type="email" name="email" value={form.email} onChange={change} required className="input-dark" data-testid="reg-email-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Password</label>
              <input type="password" name="password" value={form.password} onChange={change} required minLength={6} className="input-dark" data-testid="reg-password-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Phone (Optional)</label>
              <input type="tel" name="phone" value={form.phone} onChange={change} className="input-dark" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-[#ffd700] block mb-2">Referral Code (Optional)</label>
              <input name="referral_code" value={form.referral_code} onChange={change} placeholder="SAM001, LOGEN002..." className="input-dark" />
              <p className="text-xs text-white/40 mt-1.5">Got a staff referral? Enter here for direct WhatsApp service lah.</p>
            </div>
            <button type="submit" disabled={loading} className="btn-pink w-full disabled:opacity-50" data-testid="register-submit-btn">
              {loading ? 'Creating...' : <>Create Account <FaArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/60">
            Dah ada account? <Link to="/login" className="text-[#ff007f] font-bold hover:underline">Login sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
