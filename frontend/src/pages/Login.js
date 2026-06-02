import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { FaArrowRight, FaGoogle } from 'react-icons/fa';

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
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Cannot login lah, try again');
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-[#ff007f]/30" />
        <div className="relative z-10 p-12 lg:p-16 h-full flex flex-col justify-end">
          <div className="eyebrow mb-4">Welcome Back Boss</div>
          <h1 className="display-mega text-glow-white mb-4">Sign in &<br/><span className="neon-pink-text">drink up.</span></h1>
          <p className="text-white/70 max-w-md">Login dengan account anda untuk track orders, earn points & climb tiers.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="eyebrow mb-3">Sign In</div>
          <h2 className="display-xl mb-8">Welcome Back.</h2>

          {error && (
            <div className="bg-[#ff007f]/10 border border-[#ff007f]/40 text-[#ff007f] px-5 py-4 rounded-2xl mb-5 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          {/* Google Auth */}
          <button
            type="button"
            onClick={googleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black rounded-full py-3.5 font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-all mb-5"
            data-testid="login-google-btn"
          >
            <FaGoogle size={16} className="text-[#ff007f]" /> Continue with Google
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs uppercase tracking-[0.25em] text-white/40">or email lah</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-dark" data-testid="login-email-input" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-dark" data-testid="login-password-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-pink w-full disabled:opacity-50" data-testid="login-submit-btn">
              {loading ? 'Logging in...' : <>Sign In <FaArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/60">
            Belum ada account?{' '}
            <Link to="/register" className="text-[#ff007f] font-bold hover:underline">Register sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
