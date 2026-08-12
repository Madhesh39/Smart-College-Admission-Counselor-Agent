import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, ChevronDown, RefreshCw, User, Minimize2, Maximize2, Zap } from 'lucide-react';
import { PUTER_MODELS, chatWithPuter } from '../services/puterAI';
import api from '../services/api';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      message: `Hello! 👋 I am your **Puter.js AI Admission Counselor**.\n\nAsk me anything about college cutoffs, NIRF rankings, stream choices, fees, or admission strategies! Powered by **Free Unlimited AI Models**.`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch profile for context if logged in
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await api.get('/students/profile');
          setProfile(res.data);
        }
      } catch (err) {
        // Guest user or no profile set yet
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isTyping) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    const userMessageId = Date.now().toString();
    const aiMessageId = (Date.now() + 1).toString();

    // Append user message
    setMessages(prev => [
      ...prev,
      { id: userMessageId, sender: 'user', message: userText }
    ]);

    setIsTyping(true);

    // Fetch matching college candidates from API to ground AI response in verified database
    let collegesContext = [];
    try {
      const searchRes = await api.post('/ai/search', { query: userText });
      if (searchRes.data && searchRes.data.colleges) {
        collegesContext = searchRes.data.colleges;
      }
    } catch (err) {
      // Non-critical, fallback to standard LLM reasoning
    }

    // Add placeholder AI message for streaming
    setMessages(prev => [
      ...prev,
      { id: aiMessageId, sender: 'ai', message: '', isStreaming: true }
    ]);

    try {
      let currentOutput = '';
      const responseText = await chatWithPuter({
        userQuery: userText,
        chatHistory: messages,
        model: selectedModel,
        collegesContext,
        profileContext: profile,
        onChunk: (accumulated) => {
          currentOutput = accumulated;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, message: accumulated } : msg
            )
          );
        }
      });

      // Ensure final message state is complete
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, message: responseText || currentOutput, isStreaming: false }
            : msg
        )
      );
    } catch (err) {
      console.error('Puter AI Chatbot Error:', err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                message: `⚠️ **Connection Error**: Failed to consult Puter.js AI (${err.message || 'SDK offline'}). Please verify internet connection.`,
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const currentModelObj = PUTER_MODELS.find(m => m.id === selectedModel) || PUTER_MODELS[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-3 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white p-4 rounded-full shadow-2xl shadow-brand-500/40 transition-all transform hover:scale-105 active:scale-95"
          title="Open Puter.js Free AI Assistant"
        >
          <div className="relative">
            <Bot size={26} className="animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="hidden group-hover:inline-block font-bold text-xs pr-1">Puter AI Chat</span>
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div
          className={`
            bg-[#1e293b] border border-[#334155] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in
            ${isExpanded ? 'w-[90vw] md:w-[700px] h-[85vh]' : 'w-[92vw] sm:w-[420px] h-[600px] max-h-[85vh]'}
          `}
        >
          {/* Top Bar Header */}
          <div className="bg-[#0f172a]/90 backdrop-blur-md p-4 border-b border-[#334155] flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-600 flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-100">Puter AI Counselor</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                    <Zap size={10} />
                    <span>Free Unlimited</span>
                  </span>
                </div>

                {/* Model Selector Dropdown */}
                <div className="relative mt-1">
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center space-x-1 text-[11px] text-brand-300 hover:text-brand-200 font-medium bg-[#1e293b] px-2 py-0.5 rounded-lg border border-[#334155] transition"
                  >
                    <span>{currentModelObj.icon} {currentModelObj.name}</span>
                    <ChevronDown size={12} />
                  </button>

                  {showModelDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1 space-y-1">
                      <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Free Puter.js AI Model:
                      </div>
                      {PUTER_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setShowModelDropdown(false);
                          }}
                          className={`
                            w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition
                            ${selectedModel === m.id ? 'bg-brand-600 text-white font-bold' : 'text-slate-300 hover:bg-[#1e293b]'}
                          `}
                        >
                          <span>{m.icon} {m.name}</span>
                          <span className="text-[9px] opacity-70">{m.provider}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-[#334155] rounded-lg transition text-slate-300"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition text-slate-300"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm
                      ${isUser
                        ? 'bg-brand-600 text-white rounded-br-none font-medium'
                        : 'bg-[#0f172a] border border-[#334155] text-slate-200 rounded-bl-none'}
                    `}
                  >
                    {!isUser && (
                      <div className="flex justify-between items-center mb-1 pb-1 border-b border-[#334155]/40 text-[10px] text-brand-400 font-semibold">
                        <span>Puter AI ({currentModelObj.name})</span>
                        {msg.isStreaming && (
                          <span className="flex items-center space-x-1 text-amber-400 font-mono animate-pulse">
                            <span>Generating...</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      {msg.message.split('\n').map((line, idx) => {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        const content = parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        });

                        if (line.startsWith('### ')) {
                          return <h3 key={idx} className="font-bold text-sm text-brand-300 mt-2 mb-1">{content}</h3>;
                        }
                        if (line.startsWith('#### ')) {
                          return <h4 key={idx} className="font-semibold text-xs text-brand-400 mt-1 mb-0.5">{content}</h4>;
                        }
                        if (line.trim() === '') {
                          return <div key={idx} className="h-1" />;
                        }
                        return <div key={idx}>{content}</div>;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#0f172a] border border-[#334155] rounded-2xl rounded-bl-none px-3.5 py-2.5 flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Query Input Form */}
          <div className="p-3 bg-[#0f172a] border-t border-[#334155] shrink-0">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                placeholder={`Ask ${currentModelObj.name} about colleges, cutoffs, placements...`}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isTyping}
                className="flex-1 bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white rounded-xl font-semibold transition flex items-center justify-center shrink-0"
              >
                {isTyping ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
