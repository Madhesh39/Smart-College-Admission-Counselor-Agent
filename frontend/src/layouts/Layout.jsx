import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, UserCircle, School, Award, Sparkles, 
  GitCompare, MessageSquare, Bookmark, FileText, Settings, 
  LogOut, Menu, X, Bell, UserCheck, ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import FloatingChatbot from '../components/FloatingChatbot';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'student');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'User');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sync local storage details
    setUserRole(localStorage.getItem('role') || 'student');
    setUsername(localStorage.getItem('username') || 'User');

    // Fetch initial dummy/system notifications
    setNotifications([
      { id: 1, title: "Welcome back!", message: "Get started by checking your eligibility.", read: false },
      { id: 2, title: "System Fallback Active", message: "AI Counselor is currently running in local rule-based mode.", read: true }
    ]);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const studentNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
    { name: 'Colleges Search', path: '/colleges', icon: School },
    { name: 'Recommendations', path: '/recommendations', icon: Sparkles },
    { name: 'Compare Colleges', path: '/compare', icon: GitCompare },
    { name: 'What-If Analysis', path: '/what-if', icon: Award },
    { name: 'AI Counselor Chat', path: '/ai-counselor', icon: MessageSquare },
    { name: 'Shortlisted Colleges', path: '/saved-colleges', icon: Bookmark },
    { name: 'Track Applications', path: '/applications', icon: FileText },
    { name: 'Account Settings', path: '/settings', icon: Settings },
  ];

  const adminNav = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students Directory', path: '/admin/students', icon: UserCheck },
    { name: 'Manage Colleges', path: '/admin/colleges', icon: School },
    { name: 'Manage Courses', path: '/admin/courses', icon: FileText },
    { name: 'Manage Cutoffs', path: '/admin/cutoffs', icon: Award },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  const currentNav = userRole === 'admin' ? adminNav : studentNav;

  return (
    <div class="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <header class="md:hidden bg-[#1e293b] border-b border-[#334155] px-4 py-3 flex items-center justify-between z-50">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🎓</span>
          <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-400 to-violet-500 bg-clip-text text-transparent">Smart Counselor</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} class="p-1 hover:bg-[#334155] rounded-md transition">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside class={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#1e293b] border-r border-[#334155] transform transition-transform duration-300 ease-in-out flex flex-col justify-between
        md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo Brand Header */}
          <div class="hidden md:flex items-center space-x-3 px-6 py-6 border-b border-[#334155]">
            <span class="text-3xl">🎓</span>
            <div>
              <span class="font-extrabold text-lg leading-tight tracking-tight bg-gradient-to-r from-brand-400 to-violet-500 bg-clip-text text-transparent block">Smart Counselor</span>
              <span class="text-xs text-brand-300 font-semibold tracking-wider uppercase">{userRole} Panel</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav class="mt-6 px-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)} // Auto close on click for mobile
                  class={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#334155]/50'}
                  `}
                >
                  <Icon size={18} class={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile section at the bottom */}
        <div class="p-4 border-t border-[#334155] bg-[#1e293b]">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3 overflow-hidden">
              <div class="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500 flex items-center justify-center text-brand-300 font-bold uppercase shrink-0">
                {username.substring(0, 2)}
              </div>
              <div class="overflow-hidden">
                <p class="text-sm font-semibold truncate text-slate-200">{username}</p>
                <p class="text-xs text-slate-400 capitalize">{userRole}</p>
              </div>
            </div>
            {userRole === 'admin' && (
              <span class="p-1 bg-amber-500/10 text-amber-500 rounded" title="Admin User">
                <ShieldAlert size={14} />
              </span>
            )}
          </div>
          <button 
            onClick={handleLogout}
            class="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-xs font-semibold transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header navbar */}
        <header class="hidden md:flex bg-[#1e293b]/50 backdrop-blur-md border-b border-[#334155] px-8 py-4 items-center justify-between sticky top-0 z-30">
          <div class="flex items-center space-x-2">
            <h1 class="text-xl font-bold text-slate-200 font-sans capitalize">
              {location.pathname.split('/').filter(Boolean).pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          
          <div class="flex items-center space-x-4">
            {/* Notification bell dropdown */}
            <div class="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                class="p-2 hover:bg-[#334155] rounded-full text-slate-300 hover:text-slate-100 transition relative"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-[#1e293b]"></span>
                )}
              </button>

              {showNotifications && (
                <div class="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div class="px-4 py-3 border-b border-[#334155] flex justify-between items-center">
                    <span class="font-bold text-sm">Notifications</span>
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                      class="text-xs text-brand-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div class="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div class="px-4 py-6 text-center text-slate-400 text-xs">No notifications.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} class={`px-4 py-3 border-b border-[#334155]/30 hover:bg-[#334155]/20 ${!n.read ? 'bg-brand-500/5' : ''}`}>
                          <p class="text-xs font-semibold text-slate-200">{n.title}</p>
                          <p class="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User details */}
            <div class="flex items-center space-x-2 border-l border-[#334155] pl-4">
              <span class="text-sm font-semibold text-slate-300">{username}</span>
              <span class="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{userRole}</span>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Floating Puter.js AI Chatbot Widget */}
      <FloatingChatbot />
    </div>
  );
}
