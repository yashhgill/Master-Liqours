import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaComments, FaTimes, FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi boss! Ask me anything about our drinks — prices, recommendations, what\'s in stock lah.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: input,
        conversation_history: messages.slice(-10),
      }, { withCredentials: true });
      setMessages(m => [...m, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry boss, AI cannot respond now. Try WhatsApp our staff lah!' }]);
    } finally { setLoading(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button onClick={() => setOpen(true)} data-testid="chat-open-btn"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#ff007f,#c8005a)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,0,127,0.5)', transition: 'all 0.3s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <FaComments size={20} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, width: 340, maxHeight: 520, display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s ease' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#ff007f,#c8005a)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FaRobot size={16} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.05em' }}>AI ASSISTANT</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Ask about products, orders lah</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }} data-testid="chat-close-btn">
              <FaTimes size={15} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, maxHeight: 360 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'user' ? 'linear-gradient(135deg,#ff007f,#c8005a)' : 'rgba(255,255,255,0.08)' }}>
                  {m.role === 'user' ? <FaUser size={11} /> : <FaRobot size={11} style={{ color: '#ff007f' }} />}
                </div>
                <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#ff007f,#c8005a)' : 'rgba(255,255,255,0.07)', fontSize: 13, lineHeight: 1.55, color: '#fff' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaRobot size={11} style={{ color: '#ff007f' }} /></div>
                <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.07)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: `pulse 1s ${d}s ease-in-out infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Ask lah..." data-testid="chat-input"
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '9px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,0,127,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            <button onClick={send} disabled={loading || !input.trim()} data-testid="chat-send-btn"
              style={{ width: 38, height: 38, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#ff007f,#c8005a)' : 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
              <FaPaperPlane size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
