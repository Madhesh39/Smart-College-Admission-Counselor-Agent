import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminCutoffs() {
  const [cutoffs, setCutoffs] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    college_id: '',
    course_id: '',
    year: 2023,
    category: 'General',
    cutoff_rank: 50000,
    cutoff_score: 85.0
  });

  useEffect(() => {
    fetchCutoffs();
    fetchCollegesAndCourses();
  }, []);

  const fetchCutoffs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/cutoffs');
      setCutoffs(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollegesAndCourses = async () => {
    try {
      const colRes = await api.get('/colleges');
      setColleges(colRes.data);
      if (colRes.data.length > 0) {
        setFormData(prev => ({ ...prev, college_id: colRes.data[0].id.toString() }));
      }

      const crsRes = await api.get('/courses');
      setCourses(crsRes.data);
      if (crsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, course_id: crsRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cutoff_rank' || name === 'year' ? parseInt(value) :
              name === 'cutoff_score' ? parseFloat(value) : value
    }));
  };

  const handleOpenAdd = () => {
    setFormData({
      college_id: colleges[0]?.id.toString() || '',
      course_id: courses[0]?.id.toString() || '',
      year: 2023,
      category: 'General',
      cutoff_rank: 50000,
      cutoff_score: 85.0
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      college_id: parseInt(formData.college_id),
      course_id: parseInt(formData.course_id)
    };

    try {
      await api.post('/admin/cutoffs', payload);
      setModalOpen(false);
      fetchCutoffs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create cutoff record.');
    }
  };

  const handleDelete = async (cutoffId) => {
    if (!confirm('Are you sure you want to delete this historical cutoff entry?')) return;
    try {
      await api.delete(`/admin/cutoffs/${cutoffId}`);
      setCutoffs(prev => prev.filter(item => item.id !== cutoffId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete cutoff record.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Loading cutoff matrices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/admin/dashboard" className="inline-flex items-center space-x-2 text-xs text-brand-400 hover:text-brand-300 font-bold transition">
        <ArrowLeft size={14} />
        <span>Back to Operations Dashboard</span>
      </Link>

      <div className="glass-panel p-6 rounded-2xl flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Manage Historical Cutoffs</h2>
          <p className="text-xs text-slate-400 mt-1">Configure historical cutoffs for deterministic admission chance calculations.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition"
        >
          <Plus size={14} />
          <span>Add Cutoff</span>
        </button>
      </div>

      {/* Cutoff Table */}
      <div className="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1e293b] border-b border-[#334155] text-slate-400">
                <th className="p-4 font-bold">College</th>
                <th className="p-4 font-bold">Course</th>
                <th className="p-4 font-bold">Year</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Cutoff Score</th>
                <th className="p-4 font-bold">Cutoff Rank</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/20 text-slate-300">
              {cutoffs.map((item) => (
                <tr key={item.id} className="hover:bg-[#334155]/10 transition">
                  <td className="p-4 font-bold text-slate-200">{item.college.name}</td>
                  <td className="p-4">{item.course.name}</td>
                  <td className="p-4 font-semibold">{item.year}</td>
                  <td className="p-4 text-brand-400 font-bold">{item.category}</td>
                  <td className="p-4 font-mono">{item.cutoff_score || 'N/A'}</td>
                  <td className="p-4 font-mono">{item.cutoff_rank || 'N/A'}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cutoff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-6 relative animate-fade-in text-xs">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-200 mb-6">Add Historical Cutoff</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select College</label>
                <select
                  name="college_id"
                  value={formData.college_id}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                >
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select Course</label>
                <select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cutoff Score</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cutoff_score"
                    value={formData.cutoff_score}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cutoff Rank (AIR)</label>
                  <input
                    type="number"
                    name="cutoff_rank"
                    value={formData.cutoff_rank}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-4 border border-[#334155] hover:bg-[#334155] text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition"
                >
                  <Save size={14} />
                  <span>Create Cutoff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
