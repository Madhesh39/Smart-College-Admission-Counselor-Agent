import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Award, ShieldCheck, HelpCircle, ArrowUpRight, 
  DollarSign, Sparkles, Plus, AlertCircle, MessageSquare 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, ComposedChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar 
} from 'recharts';
import api from '../services/api';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [savedColleges, setSavedColleges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    eligibleCount: 0,
    recommendedCount: 0,
    safeCount: 0,
    targetCount: 0,
    dreamCount: 0,
    avgMatchScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const COLORS = ['#8b5cf6', '#a855f7', '#6366f1', '#ec4899', '#f43f5e'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Profile
      let currentProfile = null;
      try {
        const profRes = await api.get('/students/profile');
        currentProfile = profRes.data;
        setProfile(currentProfile);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Redirect to profile setup if not found
          navigate('/profile?setup=true');
          return;
        }
        throw err;
      }

      // 2. Fetch recommendations
      const recRes = await api.get('/recommendations');
      const recs = recRes.data;
      setRecommendations(recs);

      // 3. Fetch saved colleges
      const savedRes = await api.get('/saved-colleges');
      setSavedColleges(savedRes.data);

      // 4. Fetch applications
      const appRes = await api.get('/applications');
      setApplications(appRes.data);

      // Calculate Stats
      if (recs.length > 0) {
        const eligible = recs.filter(r => r.eligibility_status === 'Eligible' || r.eligibility_status === 'Conditional');
        const safe = recs.filter(r => r.classification === 'Safe');
        const target = recs.filter(r => r.classification === 'Target');
        const dream = recs.filter(r => r.classification === 'Dream');
        const totalMatch = recs.reduce((acc, curr) => acc + curr.match_score, 0);

        setStats({
          eligibleCount: eligible.length,
          recommendedCount: recs.length,
          safeCount: safe.length,
          targetCount: target.length,
          dreamCount: dream.length,
          avgMatchScore: Math.round(totalMatch / recs.length)
        });
      }
    } catch (err) {
      console.error(err);
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading counseling dashboard metrics...</p>
      </div>
    );
  }

  // Chart Data 1: Chance Distribution
  const chanceData = [
    { name: 'High Chance', value: stats.safeCount },
    { name: 'Moderate Chance', value: stats.targetCount },
    { name: 'Low Chance', value: stats.dreamCount }
  ].filter(d => d.value > 0);

  // Chart Data 2: College Match Scores (top 5)
  const matchChartData = recommendations
    .slice(0, 5)
    .map(r => ({
      name: r.college.name.substring(0, 20) + '...',
      Score: r.match_score
    }));

  // Chart Data 3: Budget vs Fees (top 5)
  const budgetChartData = recommendations
    .slice(0, 5)
    .map(r => ({
      name: r.college.name.substring(0, 15) + '...',
      Tuition: r.college.tuition_fee,
      Hostel: r.college.hostel_fee,
      Budget: profile.max_budget || 4.5
    }));

  // Chart Data 4: Course Dept Recommendations (radar)
  const courseRadarData = [
    { subject: 'AI/ML', A: 90, fullMark: 100 },
    { subject: 'Data Science', A: 85, fullMark: 100 },
    { subject: 'Computer Sci', A: 95, fullMark: 100 },
    { subject: 'ECE', A: 70, fullMark: 100 },
    { subject: 'Information Tech', A: 80, fullMark: 100 },
    { subject: 'Robotics', A: 75, fullMark: 100 },
  ];

  return (
    <div class="space-y-8 animate-fade-in">
      {/* Top Welcome Banner */}
      <div class="glass-panel p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight">Welcome, {profile?.full_name || 'Student'}!</h2>
          <p class="text-sm text-slate-400 mt-1">Here is your tailored college counseling strategy overview based on {profile?.exam_name || 'Board Scores'}.</p>
        </div>
        <Link 
          to="/ai-counselor" 
          class="flex items-center space-x-2 py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-brand-900/20"
        >
          <MessageSquare size={16} />
          <span>Ask AI Counselor</span>
        </Link>
      </div>

      {error && (
        <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 flex items-center space-x-3 text-sm">
          <AlertCircle size={20} class="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Numerical Stats Cards */}
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Eligible Colleges', val: stats.eligibleCount, color: 'text-emerald-400' },
          { label: 'Total Recommended', val: stats.recommendedCount, color: 'text-brand-300' },
          { label: 'Safe Choices', val: stats.safeCount, color: 'text-violet-400' },
          { label: 'Target Options', val: stats.targetCount, color: 'text-blue-400' },
          { label: 'Dream Colleges', val: stats.dreamCount, color: 'text-pink-400' },
          { label: 'Avg Profile Match', val: `${stats.avgMatchScore}%`, color: 'text-amber-400' }
        ].map((item, idx) => (
          <div key={idx} class="glass-panel p-4 rounded-xl border border-[#334155]/60 flex flex-col justify-between h-28">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">{item.label}</span>
            <span class={`text-3xl font-extrabold mt-2 ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: College Match Scores */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
          <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-slate-200">
            <Sparkles size={16} class="text-brand-400" />
            <span>Profile Match Score % (Top Options)</span>
          </h3>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="Score" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {matchChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Admission Chance Distribution */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
          <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-slate-200">
            <Award size={16} class="text-brand-400" />
            <span>Admission Chance Distribution</span>
          </h3>
          <div class="h-64 flex flex-col md:flex-row items-center justify-around">
            {chanceData.length === 0 ? (
              <p class="text-slate-400 text-sm">No classification data available.</p>
            ) : (
              <>
                <div class="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div class="space-y-2 mt-4 md:mt-0">
                  {chanceData.map((item, idx) => (
                    <div key={idx} class="flex items-center space-x-3 text-xs font-semibold">
                      <div class="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span class="text-slate-300">{item.name}</span>
                      <span class="text-slate-400">({item.value} colleges)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Budget vs College Fees */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
          <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-slate-200">
            <DollarSign size={16} class="text-brand-400" />
            <span>Budget vs Tuition & Hostel Fees (Lakhs/year)</span>
          </h3>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={budgetChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Tuition" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Hostel" stackId="a" fill="#a855f7" />
                <Line type="monotone" dataKey="Budget" stroke="#ec4899" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Course Department spread */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
          <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-slate-200">
            <ShieldCheck size={16} class="text-brand-400" />
            <span>Course Suitability Match Index</span>
          </h3>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={courseRadarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                <Radar name="Compatibility" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Grid: Strategy + Recommendations */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Top Recommended Colleges */}
        <div class="lg:col-span-2 space-y-4">
          <h3 class="text-lg font-bold text-slate-200 flex items-center space-x-2">
            <span>⭐ Top Recommendations for {profile?.preferred_course || 'CSE'}</span>
          </h3>
          
          {recommendations.length === 0 ? (
            <div class="glass-panel p-8 text-center text-slate-400 rounded-xl">
              No recommendations calculated yet. Please check your academic scores.
            </div>
          ) : (
            recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} class="glass-panel glass-panel-hover p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2.5">
                    <h4 class="font-bold text-lg text-slate-200">{rec.college.name}</h4>
                    <span class={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                      rec.classification === 'Safe' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      rec.classification === 'Target' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    }`}>
                      {rec.classification}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400">{rec.college.location} | Fees: {rec.college.total_estimated_fee} Lakhs/yr</p>
                  <p class="text-xs text-slate-300 mt-2 italic font-serif">"{rec.reasons[rec.reasons.length - 1] || rec.reasons[0]}"</p>
                </div>
                
                <div class="flex items-center space-x-3 shrink-0">
                  <div class="text-right mr-2">
                    <span class="block text-2xl font-black text-brand-400">{rec.match_score}%</span>
                    <span class="text-[10px] text-slate-400 uppercase font-semibold">Match Score</span>
                  </div>
                  <Link 
                    to={`/colleges/${rec.college_id}`}
                    class="p-2.5 bg-[#334155]/50 hover:bg-[#334155] rounded-xl text-slate-200 transition"
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Admission Strategy and Saved Shortcuts */}
        <div class="space-y-6">
          {/* Tactical strategy box */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155] bg-gradient-to-br from-brand-900/10 to-transparent">
            <h3 class="text-md font-bold mb-3 flex items-center space-x-2 text-brand-300">
              <Sparkles size={16} />
              <span>Personalized Strategy</span>
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              Based on your score margins and category filters, we recommend applying to:
            </p>
            <div class="mt-4 space-y-2">
              <div class="flex justify-between text-xs py-1 border-b border-[#334155]/40">
                <span class="text-emerald-400 font-semibold">Safe (1-2 Colleges)</span>
                <span class="text-slate-400">Chances &gt; 90%</span>
              </div>
              <div class="flex justify-between text-xs py-1 border-b border-[#334155]/40">
                <span class="text-blue-400 font-semibold">Target (2-3 Colleges)</span>
                <span class="text-slate-400">Chances 60% - 90%</span>
              </div>
              <div class="flex justify-between text-xs py-1">
                <span class="text-pink-400 font-semibold">Dream (1-2 Colleges)</span>
                <span class="text-slate-400">Competitive Cutoffs</span>
              </div>
            </div>
            <Link to="/recommendations" class="mt-5 block text-center text-xs text-brand-400 hover:text-brand-300 font-bold transition">
              View Detailed Strategy report &rarr;
            </Link>
          </div>

          {/* Quick tracker shortcut */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-md font-bold mb-4 text-slate-200">Recent Applications</h3>
            <div class="space-y-3">
              {applications.length === 0 ? (
                <div class="text-center py-4">
                  <p class="text-xs text-slate-400 mb-3">No applications tracked yet.</p>
                  <Link to="/colleges" class="inline-flex items-center space-x-1.5 py-1.5 px-3 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-semibold hover:bg-brand-500/30 transition">
                    <Plus size={12} />
                    <span>Track College</span>
                  </Link>
                </div>
              ) : (
                applications.slice(0, 3).map((app) => (
                  <div key={app.id} class="flex items-center justify-between text-xs p-2.5 bg-[#0f172a]/50 rounded-lg border border-[#334155]/30">
                    <span class="font-bold text-slate-300 truncate max-w-[140px]">{app.college.name}</span>
                    <span class={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      app.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                      app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
