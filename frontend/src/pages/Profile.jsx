import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, GraduationCap, DollarSign, Compass } from 'lucide-react';
import api from '../services/api';

export default function Profile() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    percentage_10th: 75.0,
    percentage_12th: 75.0,
    cgpa: 7.5,
    stream: 'Science',
    board: 'CBSE',
    exam_name: 'JEE Main',
    exam_score: 80.0,
    percentile: 90.0,
    rank: 50000,
    preferred_course: 'Computer Science and Engineering',
    preferred_branch: 'Computer Science',
    preferred_state: 'Maharashtra',
    preferred_city: 'Mumbai',
    max_budget: 4.0,
    hostel_required: true,
    government_private_preference: 'any',
    career_interests: []
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const careerOptions = [
    'Software', 'AI/ML', 'Data Science', 'Cybersecurity', 
    'Aerospace', 'Biotechnology', 'Robotics', 'Automobile', 'Civil Design'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/students/profile');
      if (response.data) {
        setFormData(response.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Safe to ignore if it is a new profile setup
        console.log("No profile found, setup required.");
      } else {
        setError('Failed to fetch profile settings.');
      }
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

  const handleCareerToggle = (career) => {
    const current = [...formData.career_interests];
    if (current.includes(career)) {
      setFormData(prev => ({
        ...prev,
        career_interests: current.filter(c => c !== career)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        career_interests: [...current, career]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save profile
      await api.put('/students/profile', formData);
      
      // Auto-trigger recommendation generation in background
      try {
        await api.post('/recommendations/generate');
      } catch (recErr) {
        console.error("Failed to automatically generate recommendations: ", recErr);
      }

      setSuccess('Your profile and academic preferences have been saved successfully! Recalculating college recommendations...');
      
      // If user came from redirect, take them to dashboard
      if (searchParams.get('setup')) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update student profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">Academic Profile Setup</h2>
        <p class="text-xs text-slate-400 mt-1">Please provide accurate academic percentages and entrance scores to ensure matching is correct.</p>
      </div>

      {searchParams.get('setup') && (
        <div class="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-4 flex items-start space-x-3 text-sm">
          <AlertCircle size={20} class="shrink-0 mt-0.5" />
          <div>
            <span class="font-bold">Initial Setup Required:</span> Please complete your academic scores profile first so our agents can match you to target colleges.
          </div>
        </div>
      )}

      {success && (
        <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 flex items-center space-x-3 text-sm">
          <CheckCircle size={20} class="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 flex items-center space-x-3 text-sm">
          <AlertCircle size={20} class="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-6">
        {/* Section 1: Basic Information */}
        <div class="glass-panel p-6 rounded-xl border border-[#334155]/60 space-y-4">
          <h3 class="text-md font-bold flex items-center space-x-2 text-slate-200 border-b border-[#334155] pb-2">
            <span class="text-lg">👤</span>
            <span>Personal Information</span>
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name || ''}
                onChange={handleInputChange}
                required
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                required
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={handleInputChange}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={formData.gender || 'Male'}
                  onChange={handleInputChange}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Details */}
        <div class="glass-panel p-6 rounded-xl border border-[#334155]/60 space-y-4">
          <h3 class="text-md font-bold flex items-center space-x-2 text-slate-200 border-b border-[#334155] pb-2">
            <GraduationCap size={18} class="text-brand-400" />
            <span>Academic Performance</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">10th Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                name="percentage_10th"
                value={formData.percentage_10th}
                onChange={handleInputChange}
                required
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">12th Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                name="percentage_12th"
                value={formData.percentage_12th}
                onChange={handleInputChange}
                required
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Engineering CGPA (Optional)</label>
              <input
                type="number"
                step="0.1"
                name="cgpa"
                value={formData.cgpa || ''}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Academic Board</label>
              <select
                name="board"
                value={formData.board || 'CBSE'}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE/ISC</option>
                <option value="State Board">State Board</option>
                <option value="IB">IB</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Academic Stream</label>
              <select
                name="stream"
                value={formData.stream || 'Science'}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="Science">Science (PCM/PCB)</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: TNEA Marks & Cutoff Calculation */}
        <div class="glass-panel p-6 rounded-xl border border-[#334155]/60 space-y-4">
          <h3 class="text-md font-bold flex items-center justify-between text-slate-200 border-b border-[#334155] pb-2">
            <div class="flex items-center space-x-2">
              <span class="text-lg">📐</span>
              <span>TNEA Cutoff & Subject Marks Calculation (Physics/2 + Chemistry/2 + Maths)</span>
            </div>
            <span class="text-xs px-2.5 py-1 bg-brand-500/20 text-brand-400 font-bold rounded-lg border border-brand-500/30">
              Cutoff: {((formData.physics_marks || 0)/2 + (formData.chemistry_marks || 0)/2 + (formData.maths_marks || 0)).toFixed(2)} / 200
            </span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Physics Marks (out of 100)</label>
              <input
                type="number"
                step="0.5"
                max="100"
                min="0"
                name="physics_marks"
                value={formData.physics_marks ?? 90}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const p = val;
                  const c = formData.chemistry_marks ?? 90;
                  const m = formData.maths_marks ?? 90;
                  const cutoff = (p/2) + (c/2) + m;
                  setFormData(prev => ({ ...prev, physics_marks: val, tnea_cutoff: cutoff, exam_score: cutoff }));
                }}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span class="text-[10px] text-slate-400 mt-1 block">Weightage: 50 Marks (P/2)</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Chemistry Marks (out of 100)</label>
              <input
                type="number"
                step="0.5"
                max="100"
                min="0"
                name="chemistry_marks"
                value={formData.chemistry_marks ?? 90}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const p = formData.physics_marks ?? 90;
                  const c = val;
                  const m = formData.maths_marks ?? 90;
                  const cutoff = (p/2) + (c/2) + m;
                  setFormData(prev => ({ ...prev, chemistry_marks: val, tnea_cutoff: cutoff, exam_score: cutoff }));
                }}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span class="text-[10px] text-slate-400 mt-1 block">Weightage: 50 Marks (C/2)</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Maths Marks (out of 100)</label>
              <input
                type="number"
                step="0.5"
                max="100"
                min="0"
                name="maths_marks"
                value={formData.maths_marks ?? 90}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const p = formData.physics_marks ?? 90;
                  const c = formData.chemistry_marks ?? 90;
                  const m = val;
                  const cutoff = (p/2) + (c/2) + m;
                  setFormData(prev => ({ ...prev, maths_marks: val, tnea_cutoff: cutoff, exam_score: cutoff }));
                }}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span class="text-[10px] text-slate-400 mt-1 block">Weightage: 100 Marks (Maths)</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">TNEA Cutoff Mark (out of 200)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                value={((formData.physics_marks || 0)/2 + (formData.chemistry_marks || 0)/2 + (formData.maths_marks || 0)).toFixed(2)}
                class="w-full bg-[#1e293b] border border-brand-500/50 font-bold text-brand-400 rounded-lg py-2 px-3 text-sm focus:outline-none"
              />
              <span class="text-[10px] text-brand-400/80 mt-1 block">Formula: P/2 + C/2 + M</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Community Category</label>
              <select
                name="community"
                value={formData.community || 'OC'}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="OC">OC (Open Competition)</option>
                <option value="BC">BC (Backward Class)</option>
                <option value="BCM">BCM (Backward Class Muslim)</option>
                <option value="MBC">MBC (Most Backward Class)</option>
                <option value="SC">SC (Scheduled Caste)</option>
                <option value="SCA">SCA (SC Arundhatiyar)</option>
                <option value="ST">ST (Scheduled Tribe)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Preferences & Budget */}
        <div class="glass-panel p-6 rounded-xl border border-[#334155]/60 space-y-4">
          <h3 class="text-md font-bold flex items-center space-x-2 text-slate-200 border-b border-[#334155] pb-2">
            <Compass size={18} class="text-brand-400" />
            <span>Counseling & Financial Preferences</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Preferred Course Focus</label>
              <input
                type="text"
                name="preferred_course"
                placeholder="e.g. Computer Science and Engineering"
                value={formData.preferred_course || ''}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Preferred Location State</label>
              <input
                type="text"
                name="preferred_state"
                placeholder="e.g. Maharashtra"
                value={formData.preferred_state || ''}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Preferred City</label>
              <input
                type="text"
                name="preferred_city"
                placeholder="e.g. Mumbai"
                value={formData.preferred_city || ''}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Max Annual Budget (Lakhs/year)</label>
              <div class="relative">
                <DollarSign size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.1"
                  name="max_budget"
                  value={formData.max_budget || ''}
                  onChange={handleInputChange}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 pl-8 pr-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Institute Type Preference</label>
              <select
                name="government_private_preference"
                value={formData.government_private_preference || 'any'}
                onChange={handleInputChange}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="any">Any (No preference)</option>
                <option value="government">Government only</option>
                <option value="private">Private only</option>
              </select>
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center space-x-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  name="hostel_required"
                  checked={formData.hostel_required}
                  onChange={handleInputChange}
                  class="w-4.5 h-4.5 rounded border-[#334155] bg-[#0f172a] text-brand-600 focus:ring-brand-500/20 focus:ring-2"
                />
                <span class="text-xs font-semibold text-slate-300">Hostel accommodation required</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Career Interests */}
        <div class="glass-panel p-6 rounded-xl border border-[#334155]/60 space-y-4">
          <h3 class="text-md font-bold flex items-center space-x-2 text-slate-200 border-b border-[#334155] pb-2">
            <span class="text-lg">🚀</span>
            <span>Career Goals & Interests</span>
          </h3>
          <p class="text-xs text-slate-400">Select what fields you are interested in pursuing after college:</p>
          <div class="flex flex-wrap gap-2">
            {careerOptions.map((opt) => {
              const isSelected = formData.career_interests?.includes(opt);
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => handleCareerToggle(opt)}
                  class={`py-1.5 px-4 rounded-full text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            class="flex items-center space-x-2 py-3 px-6 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-brand-900/20"
          >
            {loading ? (
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
