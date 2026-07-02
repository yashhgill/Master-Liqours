import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const { setUserDirect } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const exchange = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateParam = params.get('state') || '';
        const savedState = localStorage.getItem('g_oauth_state');
        const errParam = params.get('error');

        if (errParam) throw new Error(errParam);
        if (!code) throw new Error('Missing code from Google');
        if (savedState && stateParam !== savedState) throw new Error('State mismatch — possible CSRF lah');

        const redirectUri = window.location.origin + '/auth/google/callback';
        const res = await axios.post(
          `${API}/auth/google/exchange`,
          { code, redirect_uri: redirectUri },
          { withCredentials: true },
        );

        localStorage.removeItem('g_oauth_state');
        const returnTo = localStorage.getItem('g_oauth_return_to') || '/';
        localStorage.removeItem('g_oauth_return_to');

        if (res.data?.user) setUserDirect(res.data.user, res.data.session_token);
        // Redirect staff/admin to their dashboard
        const role = res.data?.user?.role || '';
        if (role === 'staff') navigate('/staff', { replace: true });
        else if (role === 'super_admin' || role === 'master_admin') navigate('/admin', { replace: true });
        else navigate(returnTo || '/', { replace: true });
      } catch (e) {
        setError(e.response?.data?.detail || e.message || 'Google login failed lah');
      }
    };
    exchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4" data-testid="google-callback-page">
      {error ? (
        <div className="surface p-8 max-w-md text-center">
          <div className="eyebrow text-[#ff007f] mb-3">Aiyo Error</div>
          <div className="text-white/80 mb-5 text-sm">{error}</div>
          <button onClick={() => navigate('/login')} className="btn-pink" data-testid="google-callback-back">Back to Login</button>
        </div>
      ) : (
        <div className="text-center">
          <div className="eyebrow text-[#39ff14] mb-3">Hold On Boss</div>
          <div className="display-md text-white">Signing you in...</div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthCallback;
