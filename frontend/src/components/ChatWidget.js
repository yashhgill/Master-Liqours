import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaComments, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../context';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await axios.post(
        `${API}/ai/chat`,
        {
          message: input,
          conversation_history: messages.slice(-10)
        },
        { withCredentials: true }
      );
      
      const aiMessage = { role: 'assistant', content: res.data.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I\'m having trouble right now. Try again later!' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) return null;
  
  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-50 pulse-glow"
        >
          <FaComments size={24} />
        </button>
      )}
      
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold">AI Assistant</h3>
              <p className="text-xs opacity-80">Here to help! 🚀</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition">
              <FaTimes size={20} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p>Hi {user.name}! 👋</p>
                <p className="text-sm mt-2">Ask me anything about products, orders, or your account!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-black'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-black p-3 rounded-lg">
                  Typing...
                </div>
              </div>
            )}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-pink-500 text-white p-2 rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
              >
                <FaPaperPlane size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
