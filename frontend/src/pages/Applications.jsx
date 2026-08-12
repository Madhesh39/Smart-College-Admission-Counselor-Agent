import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, Trash2, Edit2, CheckCircle, PlusCircle, AlertCircle, Save } from 'lucide-react';
import api from '../services/api';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/applications');
      setApplications(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (app) => {
    setEditingId(app.id);
    setEditStatus(app.status);
    setEditNotes(app.notes || '');
    setEditDeadline(app.deadline ? app.deadline.substring(0, 10) : '');
  };

  const handleSaveEdit = async (id) => {
    try {
      const response = await api.put(`/applications/${id}`, {
        status: editStatus,
        notes: editNotes,
        deadline: editDeadline || null
      });
      
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save application updates.');
    }
  };

  const handleDeleteApplication = async (id) => {
    if (!confirm('Are you sure you want to stop tracking this college application?')) return;
    try {
      await api.delete(`/applications/${id}`);
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading tracking pipelines...</p>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <div class="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight">Application Pipelines Tracker</h2>
          <p class="text-xs text-slate-400 mt-1">Manage registration dates, notes, document status verification, and final admissions decisions.</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div class="glass-panel p-12 text-center text-slate-400 rounded-xl max-w-lg mx-auto space-y-4">
          <Calendar size={40} class="mx-auto text-slate-500" />
          <h4 class="font-bold text-sm text-slate-300">No applications tracked yet</h4>
          <p class="text-xs text-slate-400 leading-relaxed">
            Go to any College details screen, verify course requirements, and add them to your application pipeline.
          </p>
          <Link 
            to="/colleges" 
            class="inline-block py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Explore Colleges
          </Link>
        </div>
      ) : (
        <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#1e293b] border-b border-[#334155]">
                  <th class="p-4 font-bold text-slate-400 w-1/3">Target Program & College</th>
                  <th class="p-4 font-bold text-slate-400 text-center">Status</th>
                  <th class="p-4 font-bold text-slate-400">Deadline</th>
                  <th class="p-4 font-bold text-slate-400">Deadlines & Strategic Notes</th>
                  <th class="p-4 font-bold text-slate-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#334155]/30">
                {applications.map((app) => {
                  const isEditing = app.id === editingId;
                  return (
                    <tr key={app.id} class="hover:bg-[#334155]/10 transition">
                      <td class="p-4">
                        <span class="block font-bold text-slate-200 text-sm">{app.college.name}</span>
                        <span class="text-[10px] text-slate-400 mt-0.5">{app.course.name}</span>
                      </td>
                      
                      <td class="p-4 text-center">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            class="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-slate-100 focus:outline-none"
                          >
                            <option value="Interested">Interested</option>
                            <option value="Applied">Applied</option>
                            <option value="Document Verification">Document Verification</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            app.status === 'Accepted' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                            app.status === 'Rejected' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                            'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {app.status}
                          </span>
                        )}
                      </td>

                      <td class="p-4">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            class="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-slate-100 focus:outline-none"
                          />
                        ) : (
                          <span class="text-slate-300 font-mono">
                            {app.deadline ? app.deadline.substring(0, 10) : 'No deadline set'}
                          </span>
                        )}
                      </td>

                      <td class="p-4 max-w-xs">
                        {isEditing ? (
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            class="w-full bg-[#0f172a] border border-[#334155] rounded p-2 text-slate-100 focus:outline-none text-xs"
                          />
                        ) : (
                          <p class="text-slate-400 line-clamp-2 italic leading-relaxed">
                            {app.notes || 'No notes added.'}
                          </p>
                        )}
                      </td>

                      <td class="p-4 text-center">
                        <div class="flex items-center justify-center space-x-2">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveEdit(app.id)}
                              class="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Save size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(app)}
                              class="p-1.5 bg-[#334155]/60 hover:bg-[#334155] text-slate-300 rounded-lg transition"
                              title="Edit Application"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteApplication(app.id)}
                            class="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            title="Remove Application"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
