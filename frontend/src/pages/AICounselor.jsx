import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Send, Sparkles, Trash2, ChevronDown, Zap, Bot, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { PUTER_MODELS, chatWithPuter } from '../services/puterAI';

export default function AICounselor() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [profile, setProfile] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/students/profile');
      setProfile(res.data);
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/ai/chat/sessions');
      setSessions(response.data);
      if (response.data.length > 0 && !activeSessionId) {
        setActiveSessionId(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (sessionId) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/ai/chat/sessions/${sessionId}`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const title = newSessionTitle.trim() || 'New Counseling Session';
    try {
      const response = await api.post('/ai/chat/sessions', { title });
      setSessions(prev => [response.data, ...prev]);
      setActiveSessionId(response.data.id);
      setNewSessionTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await api.delete(`/ai/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeSessionId || sending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    
    const studentMsgId = Date.now();
    const aiMsgId = Date.now() + 1;

    // Optimistic local add
    setMessages(prev => [...prev, { id: studentMsgId, sender: 'student', message: messageText }]);
    setSending(true);

    // Fetch verified college database match context
    let dbColleges = [];
    try {
      const searchRes = await api.post('/ai/search', { query: messageText });
      if (searchRes.data && searchRes.data.colleges) {
        dbColleges = searchRes.data.colleges;
      }
    } catch (err) {
      console.warn('DB Search context fetch error:', err);
    }

    // Add streaming AI placeholder
    setMessages(prev => [
      ...prev,
      { id: aiMsgId, sender: 'ai', message: '', isStreaming: true }
    ]);

    try {
      let accumulatedText = '';
      const responseText = await chatWithPuter({
        userQuery: messageText,
        chatHistory: messages,
        model: selectedModel,
        collegesContext: dbColleges,
        profileContext: profile,
        onChunk: (accumulated) => {
          accumulatedText = accumulated;
          setMessages(prev =>
            prev.map(m => (m.id === aiMsgId ? { ...m, message: accumulated } : m))
          );
        }
      });

      const finalContent = responseText || accumulatedText;

      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, message: finalContent, isStreaming: false }
            : m
        )
      );

      // Save messages to backend session history in background
      try {
        await api.post(`/ai/chat/${activeSessionId}`, { message: messageText });
      } catch (err) {
        // Backend store optional
      }
    } catch (err) {
      console.error('Puter AI Counseling error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                message: `⚠️ **Connection Error**: Failed to consult Puter.js AI model (${selectedModel}). Please verify internet connection.`,
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentModelObj = PUTER_MODELS.find(m => m.id === selectedModel) || PUTER_MODELS[0];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fade-in">
      
      {/* Left Column: Chat Sessions list */}
      <div className="w-full md:w-64 glass-panel rounded-2xl border border-[#334155] flex flex-col justify-between shrink-0 h-1/3 md:h-full">
        {/* Create session box */}
        <div className="p-4 border-b border-[#334155]">
          <form onSubmit={handleCreateSession} className="flex space-x-2">
            <input
              type="text"
              placeholder="Session Topic..."
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shrink-0"
              title="Create Session"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide px-2 mb-2">Previous Counseling Sessions</span>
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-medium">No sessions created.</div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition select-none
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#334155]/40'}
                  `}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <MessageSquare size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                    <span className="truncate pr-1">{s.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className={`p-1 rounded hover:bg-black/20 text-slate-400 hover:text-rose-300 transition shrink-0 ${
                      isActive ? 'text-white/80 hover:text-white' : ''
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active Conversation area */}
      <div className="flex-1 glass-panel rounded-2xl border border-[#334155] flex flex-col justify-between overflow-hidden h-2/3 md:h-full">
        {activeSessionId ? (
          <>
            {/* Header with Model Selector */}
            <div className="px-6 py-4 border-b border-[#334155] flex justify-between items-center bg-[#1e293b]/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-200">{activeSession?.title}</h4>
                  <span className="text-[10px] text-slate-400">Powered by Puter.js Free Unlimited AI Models</span>
                </div>
              </div>
              
              {/* Model Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-brand-300 bg-[#0f172a] px-3 py-1.5 rounded-xl border border-[#334155] hover:border-brand-500 transition"
                >
                  <Zap size={14} className="text-amber-400" />
                  <span>{currentModelObj.icon} {currentModelObj.name}</span>
                  <ChevronDown size={14} />
                </button>

                {showModelDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
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
                          w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition
                          ${selectedModel === m.id ? 'bg-brand-600 text-white font-bold' : 'text-slate-300 hover:bg-[#1e293b]'}
                        `}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span>{m.icon}</span>
                            <span>{m.name}</span>
                          </div>
                          <span className="text-[9px] opacity-70 block mt-0.5">{m.badge}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-80">{m.provider}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-8 h-8 border-3 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400">Fetching session records...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-3xl">🤖</div>
                  <h4 className="font-bold text-sm text-slate-300">Start Your Academic Counseling Session</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ask me about suitable colleges, average placement packages, cutoffs, or compare top options using Puter.js <strong>{currentModelObj.name}</strong>.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isStudent = msg.sender === 'student';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isStudent ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className={`
                        max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans shadow-md
                        ${isStudent 
                          ? 'bg-brand-600 text-white rounded-br-none font-medium' 
                          : 'bg-[#1e293b] border border-[#334155]/60 text-slate-200 rounded-bl-none'}
                      `}>
                        {!isStudent && (
                          <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-[#334155]/40 text-[9px] font-black uppercase text-brand-400 tracking-wider">
                            <span>Puter AI Counselor ({currentModelObj.name})</span>
                            {msg.isStreaming && <span className="text-amber-400 animate-pulse font-mono">Generating...</span>}
                          </div>
                        )}
                        <div className={!isStudent ? 'leading-relaxed space-y-1' : ''}>
                          {msg.message.split('\n').map((line, idx) => {
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            const content = parts.map((part, pIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
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
                })
              )}

              {/* Typing indicator */}
              {sending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-[#1e293b] border border-[#334155]/60 rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-1.5 h-10 shadow-md">
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef}></div>
            </div>

            {/* Input form */}
            <div className="p-4 border-t border-[#334155]/60 bg-[#1e293b]/20">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  placeholder={`Ask ${currentModelObj.name} a question about admissions, placements, or budgets...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="p-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white rounded-xl font-semibold transition shadow-md shadow-brand-900/10"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-3">
            <span className="text-4xl">💬</span>
            <h4 className="font-bold text-sm text-slate-300">No Session Selected</h4>
            <p className="text-xs text-slate-400">Create a new counseling topic in the sidebar to begin consulting Puter.js free AI models.</p>
          </div>
        )}
      </div>

    </div>
  );
}
