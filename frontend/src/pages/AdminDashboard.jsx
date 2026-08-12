import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, School, FileText, Award, Layers, 
  Settings, CheckCircle, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/admin/statistics');
      setStats(statsRes.data);

      const studentsRes = await api.get('/admin/students');
      setStudents(studentsRes.data);
    } catch (err) {
      console.error("Admin credentials/fetch failed: ", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading admin operations panel...</p>
      </div>
    );
  }

  // Formatting chart data: Applications by Status
  const statusChartData = stats?.applications_by_status 
    ? Object.keys(stats.applications_by_status).map(key => ({
        name: key,
        value: stats.applications_by_status[key]
      }))
    : [];

  const COLORS = ['#8b5cf6', '#a855f7', '#6366f1', '#ec4899', '#f43f5e'];

  return (
    <div class="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">System Operations Console</h2>
        <p class="text-xs text-slate-400 mt-1">Manage database catalogs, monitor active student admission pipelines, and configure agent settings.</p>
      </div>

      {/* Counters Grid */}
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Students', val: stats?.total_students || 0, color: 'text-violet-400', icon: Users },
          { label: 'Colleges Catalog', val: stats?.total_colleges || 0, color: 'text-emerald-400', icon: School },
          { label: 'Active Courses', val: stats?.total_courses || 0, color: 'text-blue-400', icon: FileText },
          { label: 'Cutoff Logs', val: stats?.total_cutoffs || 0, color: 'text-amber-400', icon: Award },
          { label: 'Tracked Apps', val: stats?.total_applications || 0, color: 'text-pink-400', icon: Layers }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} class="glass-panel p-4 rounded-xl border border-[#334155]/60 flex items-center space-x-4">
              <div class="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-xl shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{item.label}</span>
                <span class={`text-2xl font-black mt-1 ${item.color}`}>{item.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Students Split */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Applications Split Chart */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155] lg:col-span-1">
          <h3 class="text-sm font-bold text-slate-200 mb-4">Application Pipelines Split</h3>
          <div class="h-64 flex flex-col items-center justify-center">
            {statusChartData.length === 0 ? (
              <p class="text-slate-400 text-xs">No active applications tracked in database.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div class="space-y-1 mt-2 text-[10px]">
                  {statusChartData.map((item, idx) => (
                    <div key={idx} class="flex items-center space-x-2">
                      <div class="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span class="text-slate-300 font-semibold">{item.name}:</span>
                      <span class="text-slate-400">{item.value} tracked</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Registered Students directory preview */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155] lg:col-span-2 space-y-4">
          <div class="flex justify-between items-center border-b border-[#334155] pb-2">
            <h3 class="text-sm font-bold text-slate-200">Registered Students Directory</h3>
            <Link to="/admin/students" class="text-xs text-brand-400 hover:underline font-bold">
              View All students &rarr;
            </Link>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#334155] text-slate-400">
                  <th class="py-2">Student Name</th>
                  <th class="py-2">12th Score</th>
                  <th class="py-2">Entrance Exam</th>
                  <th class="py-2">Score/Rank</th>
                  <th class="py-2">Budget Limit</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#334155]/20 text-slate-300">
                {students.slice(0, 5).map((student) => (
                  <tr key={student.id} class="hover:bg-[#334155]/10">
                    <td class="py-3 font-semibold text-slate-200">{student.full_name}</td>
                    <td class="py-3">{student.percentage_12th}%</td>
                    <td class="py-3">{student.exam_name || 'N/A'}</td>
                    <td class="py-3">{student.exam_score || 'N/A'} (Rank: {student.rank || 'N/A'})</td>
                    <td class="py-3 font-mono">{student.max_budget || 0} Lakhs</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="5" class="py-6 text-center text-slate-500 font-medium">No registered students found in DB.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
