import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    department: 'Computer Science',
    duration: '4 Years',
    eligibility_description: 'Min 50% in 12th Board',
    entrance_exam: 'JEE Main',
    minimum_percentage: 50.0,
    career_opportunities: '',
    description: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'minimum_percentage' ? parseFloat(value) : value
    }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      department: 'Computer Science',
      duration: '4 Years',
      eligibility_description: 'Min 50% in 12th Board',
      entrance_exam: 'JEE Main',
      minimum_percentage: 50.0,
      career_opportunities: '',
      description: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      department: c.department || 'Computer Science',
      duration: c.duration || '4 Years',
      eligibility_description: c.eligibility_description || '',
      entrance_exam: c.entrance_exam || 'JEE Main',
      minimum_percentage: c.minimum_percentage || 50.0,
      career_opportunities: c.career_opportunities ? c.career_opportunities.join(', ') : '',
      description: c.description || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Split career opportunities CSV
    const careers = formData.career_opportunities
      ? formData.career_opportunities.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      ...formData,
      career_opportunities: careers
    };

    try {
      if (editingId) {
        await api.put(`/admin/courses/${editingId}`, payload);
      } else {
        await api.post('/admin/courses', payload);
      }
      setModalOpen(false);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit course record.');
    }
  };

  const handleDelete = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This will clear related student references.')) return;
    try {
      await api.delete(`/admin/courses/${courseId}`);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete course.');
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading courses catalog list...</p>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <Link to="/admin/dashboard" class="inline-flex items-center space-x-2 text-xs text-brand-400 hover:text-brand-300 font-bold transition">
        <ArrowLeft size={14} />
        <span>Back to Operations Dashboard</span>
      </Link>

      <div class="glass-panel p-6 rounded-2xl flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight">Manage Courses</h2>
          <p class="text-xs text-slate-400 mt-1">Configure academic programs, stream pathways, and career outcomes.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          class="flex items-center space-x-2 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition"
        >
          <Plus size={14} />
          <span>Add Course</span>
        </button>
      </div>

      {/* Courses List Table */}
      <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#1e293b] border-b border-[#334155] text-slate-400">
                <th class="p-4 font-bold">Course Program</th>
                <th class="p-4 font-bold">Department</th>
                <th class="p-4 font-bold">Duration</th>
                <th class="p-4 font-bold">Entrance Required</th>
                <th class="p-4 font-bold">Min Score Req</th>
                <th class="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#334155]/20 text-slate-300">
              {courses.map((c) => (
                <tr key={c.id} class="hover:bg-[#334155]/10 transition">
                  <td class="p-4 font-bold text-slate-200">{c.name}</td>
                  <td class="p-4">{c.department}</td>
                  <td class="p-4 font-semibold">{c.duration}</td>
                  <td class="p-4 text-brand-400 font-semibold">{c.entrance_exam || 'None'}</td>
                  <td class="p-4 font-mono">{c.minimum_percentage}% Board</td>
                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        class="p-1.5 bg-[#334155]/60 hover:bg-[#334155] text-slate-300 rounded-lg transition"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        class="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Add/Edit course modal */}
      {modalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div class="w-full max-w-lg bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setModalOpen(false)}
              class="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>

            <h3 class="text-lg font-bold text-slate-200 mb-6">
              {editingId ? 'Edit Course Program' : 'Create Course Program'}
            </h3>

            <form onSubmit={handleSubmit} class="space-y-4 text-xs">
              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Course Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Duration</label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Entrance Exam</label>
                  <input
                    type="text"
                    name="entrance_exam"
                    value={formData.entrance_exam}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Min Board % Required</label>
                  <input
                    type="number"
                    step="0.1"
                    name="minimum_percentage"
                    value={formData.minimum_percentage}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Career opportunities (Comma Separated)</label>
                <input
                  type="text"
                  name="career_opportunities"
                  placeholder="e.g. Data Scientist, AI Engineer, ML Lead"
                  value={formData.career_opportunities}
                  onChange={handleInputChange}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                />
              </div>

              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Course Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 text-slate-100 focus:outline-none"
                />
              </div>

              <div class="flex justify-end space-x-3 pt-4 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  class="py-2 px-4 border border-[#334155] hover:bg-[#334155] text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="py-2 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition"
                >
                  <Save size={14} />
                  <span>{editingId ? 'Save Edits' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
