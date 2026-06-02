import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 * Handles the `#session_id=...` URL fragment returned by Emergent Google Auth,
 * exchanges it for a session cookie via /api/auth/google-session, then redirects home.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUserDirect } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate('/login', { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(match[1]);

    (async () => {
      try {
        const res = await axios.post(
          `${API}/auth/google-session`,
          { session_id: sessionId },
          { withCredentials: true }
        );
        if (setUserDirect) setUserDirect(res.data.user);
        // Clean fragment then navigate to dashboard
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (e) {
        console.error('Google auth exchange failed', e);
        navigate('/login?error=google', { replace: true });
      }
    })();
  }, [navigate, setUserDirect]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="display-lg neon-cyan-text mb-3">Signing You In...</div>
        <div className="text-white/50 text-sm">Hold on lah boss, settling your session.</div>
      </div>
    </div>
  );
};

export default AuthCallback;
