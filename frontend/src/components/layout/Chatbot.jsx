import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Zap, Bot, User, Compass, HelpCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Vanakkam! வணக்கம்! I am MobiTN\'s custom-built AI Transport Assistant. 🚌\n\nI can help you search routes, check digital bus pass guidelines, track live bus status, or answer general FAQs in English or Tamil. Ask me anything or select a suggestion below!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    { label: 'Which bus goes to Kelambakkam?', text: 'Which bus goes to Kelambakkam?' },
    { label: 'How to apply for a student pass?', text: 'How do I apply for a student bus pass?' },
    { label: 'டிக்கெட் புக் செய்வது எப்படி?', text: 'டிக்கெட் முன்பதிவு செய்வது எப்படி?' },
    { label: 'Where is bus 102?', text: 'Where is bus 102?' }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.strip?.() && !text.trim?.()) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message
    const userMsg = { sender: 'user', text: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tn_token') || ''}`
        },
        body: JSON.stringify({ message: text })
      });
      
      const data = await response.json();
      
      const botMsg = {
        sender: 'bot',
        text: data.response || "Sorry, I encountered an issue processing your query.",
        intent: data.intent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Connection issue. Please make sure the backend FastAPI server is running.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[500px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col mb-4 animate-scale-in transition-all">
          {/* Header */}
          <div className="bg-[#d92c2c] text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 p-2 rounded-xl">
                <Bot className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="font-display font-bold text-sm leading-none tracking-wide uppercase">MobiTN Assistant</h4>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-semibold text-red-100">Bilingual ML RAG Engine</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                } animate-fade-in`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center shadow-sm text-xs font-bold ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-red-100 text-red-600 border border-red-200'
                }`}>
                  {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`rounded-2xl p-3 text-xs shadow-sm border whitespace-pre-line leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white border-blue-600 rounded-tr-none'
                    : 'bg-white text-slate-700 border-slate-200/60 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2.5 max-w-[85%] animate-pulse">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                  <Bot className="h-4 w-4 text-red-500 animate-spin" />
                </div>
                <div className="bg-white text-slate-500 rounded-2xl rounded-tl-none p-3.5 text-xs border border-slate-200/60 flex items-center gap-1.5">
                  <span className="font-semibold">AI is analyzing context...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions Chips */}
          <div className="p-3 bg-slate-100 border-t border-slate-200/60 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-shrink-0">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                disabled={loading}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full px-3 py-1.5 text-[10px] font-bold shadow-sm transition-all duration-200"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3.5 border-t border-slate-200 flex gap-2 items-center bg-white">
            <input
              type="text"
              placeholder="Ask a question in English or Tamil..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="form-input !py-2.5 !px-3.5 text-xs bg-slate-50 focus:bg-white flex-grow !rounded-2xl"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading}
              className="bg-[#d92c2c] hover:bg-red-700 text-white p-2.5 rounded-2xl shadow hover:shadow-glow transition-all shrink-0 flex items-center justify-center"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-[#d92c2c] hover:bg-red-700 text-white p-4 rounded-full shadow-2xl border-2 border-white ring-4 ring-red-500/20 flex items-center justify-center hover:scale-105 transition-transform duration-300 ${
          isOpen ? 'rotate-90 bg-slate-700 hover:bg-slate-800 ring-slate-500/20' : 'animate-bounce-slow hover:animate-none'
        }`}
        title="MobiTN AI Assistant"
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}
      </button>

    </div>
  );
}
