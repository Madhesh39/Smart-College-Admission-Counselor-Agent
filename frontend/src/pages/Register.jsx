import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        username,
        email,
        password,
        role
      });
      
      // Auto-redirect to login with credentials
      navigate('/login?registered=true');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Registration failed. Try a different username/email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div class="absolute w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] -top-40 -left-40 animate-pulse"></div>
      <div class="absolute w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div class="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 border border-[#334155]">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4">
            <span class="text-3xl">🎓</span>
          </div>
          <h2 class="text-3xl font-extrabold tracking-tight font-sans bg-gradient-to-r from-brand-300 to-violet-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p class="text-xs text-slate-400 mt-2">Join the smart college counseling agent network</p>
        </div>

        {error && (
          <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 flex items-start space-x-3 mb-6 text-sm animate-fade-in">
            <AlertCircle size={18} class="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
            <div class="relative">
              <User size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Choose username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <div class="relative">
              <Mail size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="yourname@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div class="relative">
              <Lock size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Account Role</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                class={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition ${
                  role === 'student'
                    ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                    : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:text-slate-200'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                class={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition ${
                  role === 'admin'
                    ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                    : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:text-slate-200'
                }`}
              >
                💼 Administrator
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-md shadow-brand-900/20"
          >
            {loading ? (
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div class="mt-6 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link to="/login" class="text-brand-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
