import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/students');
      setStudents(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading student directory database...</p>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <Link to="/admin/dashboard" class="inline-flex items-center space-x-2 text-xs text-brand-400 hover:text-brand-300 font-bold transition">
        <ArrowLeft size={14} />
        <span>Back to Operations Dashboard</span>
      </Link>

      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">Students Directory</h2>
        <p class="text-xs text-slate-400 mt-1">Review academic history, entrance credentials, location alignment, and budget criteria of registered users.</p>
      </div>

      <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#1e293b] border-b border-[#334155]">
                <th class="p-4 font-bold text-slate-400">Student Info</th>
                <th class="p-4 font-bold text-slate-400">Board Scores</th>
                <th class="p-4 font-bold text-slate-400">Entrance Scores</th>
                <th class="p-4 font-bold text-slate-400">Preferences</th>
                <th class="p-4 font-bold text-slate-400">Career Targets</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#334155]/30 text-slate-300">
              {students.map((student) => (
                <tr key={student.id} class="hover:bg-[#334155]/10 transition">
                  <td class="p-4">
                    <span class="block font-bold text-slate-200 text-sm">{student.full_name}</span>
                    <span class="block text-[10px] text-slate-400 mt-0.5">{student.email}</span>
                    {student.phone && <span class="block text-[9px] text-slate-500 mt-0.5">{student.phone}</span>}
                  </td>
                  
                  <td class="p-4">
                    <span class="block font-semibold">12th: {student.percentage_12th}%</span>
                    <span class="block text-[10px] text-slate-400 mt-0.5">10th: {student.percentage_10th}%</span>
                    <span class="block text-[9px] text-slate-500 mt-0.5">Stream: {student.stream} | Board: {student.board}</span>
                  </td>

                  <td class="p-4">
                    <span class="block font-semibold">{student.exam_name || 'N/A'}</span>
                    <span class="block text-[10px] text-slate-400 mt-0.5">Score: {student.exam_score || 'N/A'} | Percentile: {student.percentile || 'N/A'}</span>
                    <span class="block text-[9px] text-slate-500 mt-0.5">All India Rank: {student.rank || 'N/A'}</span>
                  </td>

                  <td class="p-4">
                    <span class="block font-bold text-brand-300 truncate max-w-[150px]" title={student.preferred_course}>
                      {student.preferred_course || 'Any course'}
                    </span>
                    <span class="block text-[10px] text-slate-400 mt-0.5">Budget: {student.max_budget} Lakhs/yr</span>
                    <span class="block text-[9px] text-slate-500 mt-0.5">Location: {student.preferred_city}, {student.preferred_state}</span>
                  </td>

                  <td class="p-4">
                    <div class="flex flex-wrap gap-1 max-w-[150px]">
                      {student.career_interests?.map((goal) => (
                        <span key={goal} class="text-[9px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-1.5 py-0.5 rounded">
                          {goal}
                        </span>
                      ))}
                      {(!student.career_interests || student.career_interests.length === 0) && (
                        <span class="text-slate-500 text-[10px] italic">Not set</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" class="p-8 text-center text-slate-500 font-medium">No students registered in the database catalog.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
