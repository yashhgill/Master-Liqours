import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaComments, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: input,
        conversation_history: messages.slice(-10),
      }, { withCredentials: true });
      setMessages((m) => [...m, { role: 'assistant', content: res.data.response }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry boss, AI cannot respond now. Try WhatsApp our staff lah!' }]);
    } finally { setLoading(false); }
  };

  if (loading) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-[155px] sm:right-[200px] z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#ff007f] to-[#e60073] text-white shadow-[0_8px_24px_-8px_rgba(255,0,127,0.65)] hover:scale-110 transition-all flex items-center justify-center"
          data-testid="chat-open-btn"
        >
          <FaComments size={20} />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] surface flex flex-col z-50 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#ff007f] to-[#e60073] p-4 flex justify-between items-center">
            <div>
              <div className="font-display text-xl uppercase leading-none">AI Assistant</div>
              <div className="text-xs text-white/80 mt-1">Ask about products, orders lah</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"><FaTimes size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-white/50 mt-12">
                <div className="text-lg mb-2">Hi {user.name}!</div>
                <div className="text-xs">Ask me about products, orders, or tier benefits.</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' ? 'bg-[#ff007f] text-white rounded-br-sm' : 'bg-[#0a0a0a] border border-white/10 text-white/90 rounded-bl-sm'
                }`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-white/40 text-xs">Typing...</div>}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask lah..."
              className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#ff007f]"
              data-testid="chat-input"
            />
            <button onClick={send} disabled={loading || !input.trim()} className="w-10 h-10 rounded-full bg-[#ff007f] hover:bg-[#e60073] disabled:opacity-40 flex items-center justify-center" data-testid="chat-send-btn">
              <FaPaperPlane size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
