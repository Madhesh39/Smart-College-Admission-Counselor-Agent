import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminColleges() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    university: '',
    location: '',
    state: '',
    city: '',
    type: 'Government',
    established_year: 2000,
    ranking: '',
    accreditation: 'NAAC A',
    website: '',
    tuition_fee: 1.5,
    hostel_fee: 0.5,
    total_estimated_fee: 2.0,
    placement_percentage: 80.0,
    average_package: 6.0,
    highest_package: 15.0,
    median_package: 5.5,
    hostel_facility: true,
    library_facility: true,
    labs_facility: true,
    sports_facility: true,
    transport_facility: true,
    description: ''
  });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const response = await api.get('/colleges');
      setColleges(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      university: '',
      location: '',
      state: '',
      city: '',
      type: 'Government',
      established_year: 2000,
      ranking: '',
      accreditation: 'NAAC A',
      website: '',
      tuition_fee: 1.5,
      hostel_fee: 0.5,
      total_estimated_fee: 2.0,
      placement_percentage: 80.0,
      average_package: 6.0,
      highest_package: 15.0,
      median_package: 5.5,
      hostel_facility: true,
      library_facility: true,
      labs_facility: true,
      sports_facility: true,
      transport_facility: true,
      description: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (col) => {
    setEditingId(col.id);
    setFormData({
      name: col.name,
      university: col.university || '',
      location: col.location || '',
      state: col.state || '',
      city: col.city || '',
      type: col.type || 'Government',
      established_year: col.established_year || 2000,
      ranking: col.ranking || '',
      accreditation: col.accreditation || 'NAAC A',
      website: col.website || '',
      tuition_fee: col.tuition_fee || 0.0,
      hostel_fee: col.hostel_fee || 0.0,
      total_estimated_fee: col.total_estimated_fee || 0.0,
      placement_percentage: col.placement_percentage || 0.0,
      average_package: col.average_package || 0.0,
      highest_package: col.highest_package || 0.0,
      median_package: col.median_package || 0.0,
      hostel_facility: col.hostel_facility ?? true,
      library_facility: col.library_facility ?? true,
      labs_facility: col.labs_facility ?? true,
      sports_facility: col.sports_facility ?? true,
      transport_facility: col.transport_facility ?? true,
      description: col.description || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Auto sync total fee
    const payload = {
      ...formData,
      ranking: formData.ranking === '' ? null : parseInt(formData.ranking),
      total_estimated_fee: formData.tuition_fee + formData.hostel_fee
    };

    try {
      if (editingId) {
        await api.put(`/admin/colleges/${editingId}`, payload);
      } else {
        await api.post('/admin/colleges', payload);
      }
      setModalOpen(false);
      fetchColleges();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit college record.');
    }
  };

  const handleDelete = async (collegeId) => {
    if (!confirm('Are you sure you want to delete this college? This will clear related cutoffs.')) return;
    try {
      await api.delete(`/admin/colleges/${collegeId}`);
      setColleges(prev => prev.filter(c => c.id !== collegeId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete college.');
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading colleges database records...</p>
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
          <h2 class="text-2xl font-extrabold tracking-tight">Manage Colleges</h2>
          <p class="text-xs text-slate-400 mt-1">Add, edit, or delete college entries in the counsel databases.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          class="flex items-center space-x-2 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition"
        >
          <Plus size={14} />
          <span>Add College</span>
        </button>
      </div>

      {/* Colleges List Table */}
      <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#1e293b] border-b border-[#334155] text-slate-400">
                <th class="p-4 font-bold">College Name</th>
                <th class="p-4 font-bold">Location</th>
                <th class="p-4 font-bold">NIRF Ranking</th>
                <th class="p-4 font-bold">Fees / yr</th>
                <th class="p-4 font-bold">Placements</th>
                <th class="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#334155]/20 text-slate-300">
              {colleges.map((col) => (
                <tr key={col.id} class="hover:bg-[#334155]/10 transition">
                  <td class="p-4 font-bold text-slate-200">{col.name}</td>
                  <td class="p-4">{col.location}</td>
                  <td class="p-4 font-mono font-bold">#{col.ranking || 'N/A'}</td>
                  <td class="p-4 font-mono">{col.total_estimated_fee} Lakhs</td>
                  <td class="p-4 font-mono">{col.average_package} LPA Avg</td>
                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(col)}
                        class="p-1.5 bg-[#334155]/60 hover:bg-[#334155] text-slate-300 rounded-lg transition"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(col.id)}
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

      {/* CRUD Add/Edit modal dialog */}
      {modalOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div class="w-full max-w-2xl bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-6 relative my-8 max-h-[90vh] overflow-y-auto animate-fade-in">
            <button
              onClick={() => setModalOpen(false)}
              class="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>

            <h3 class="text-lg font-bold text-slate-200 mb-6">
              {editingId ? 'Edit College Details' : 'Add New College Entry'}
            </h3>

            <form onSubmit={handleSubmit} class="space-y-4 text-xs">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">College Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Affiliated University</label>
                  <input
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Location / Address</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-slate-400 mb-1 font-semibold">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="block text-slate-400 mb-1 font-semibold">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Institute Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-slate-100 focus:outline-none"
                  >
                    <option value="Government">Government</option>
                    <option value="Private">Private</option>
                    <option value="Semi-Govt">Semi-Govt</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-slate-400 mb-1 font-semibold">NIRF Rank</label>
                    <input
                      type="number"
                      name="ranking"
                      value={formData.ranking}
                      onChange={handleInputChange}
                      class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="block text-slate-400 mb-1 font-semibold">Established Year</label>
                    <input
                      type="number"
                      name="established_year"
                      value={formData.established_year}
                      onChange={handleInputChange}
                      class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Fees and Placements */}
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-[#334155] pt-4">
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Tuition Fee (Lakhs/yr)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="tuition_fee"
                    value={formData.tuition_fee}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Hostel Fee (Lakhs/yr)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="hostel_fee"
                    value={formData.hostel_fee}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Avg Placements LPA</label>
                  <input
                    type="number"
                    step="0.1"
                    name="average_package"
                    value={formData.average_package}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 mb-1 font-semibold">Placement Rate %</label>
                  <input
                    type="number"
                    step="0.1"
                    name="placement_percentage"
                    value={formData.placement_percentage}
                    onChange={handleInputChange}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Brief Description</label>
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
                  <span>{editingId ? 'Save Edits' : 'Create Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
