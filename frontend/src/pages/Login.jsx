import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('expired')) {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use URLSearchParams for OAuth2 standard Form encoding
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);

      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Failed to sign in. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill helper for demonstrations
  const handleQuickFill = (roleType) => {
    if (roleType === 'student') {
      setUsername('student');
      setPassword('student123');
    } else {
      setUsername('admin');
      setPassword('admin123');
    }
  };

  return (
    <div class="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div class="absolute w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] -top-40 -left-40 animate-pulse"></div>
      <div class="absolute w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div class="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 border border-[#334155]">
        {/* Title Header */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4">
            <span class="text-3xl">🎓</span>
          </div>
          <h2 class="text-3xl font-extrabold tracking-tight font-sans bg-gradient-to-r from-brand-300 to-violet-400 bg-clip-text text-transparent">
            Smart Counselor
          </h2>
          <p class="text-xs text-slate-400 mt-2">AI-Driven College Admission counselor Agent</p>
        </div>

        {error && (
          <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 flex items-start space-x-3 mb-6 text-sm animate-fade-in">
            <AlertCircle size={18} class="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <div class="relative">
              <Mail size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter username (e.g. student)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div class="relative">
              <Lock size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-md shadow-brand-900/20"
          >
            {loading ? (
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div class="mt-8 pt-6 border-t border-[#334155]/60">
          <p class="text-xs text-slate-400 font-semibold mb-3 text-center">Demo Quick Accounts:</p>
          <div class="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickFill('student')}
              class="py-2 px-3 bg-[#0f172a] border border-brand-500/20 hover:border-brand-500/40 text-brand-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <span>Alex (Student)</span>
            </button>
            <button
              onClick={() => handleQuickFill('admin')}
              class="py-2 px-3 bg-[#0f172a] border border-violet-500/20 hover:border-violet-500/40 text-violet-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        <div class="mt-6 text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <Link to="/register" class="text-brand-400 hover:underline font-semibold">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
