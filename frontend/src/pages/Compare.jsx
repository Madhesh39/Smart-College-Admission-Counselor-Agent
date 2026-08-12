import React, { useState, useEffect } from 'react';
import { GitCompare, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Compare() {
  const [colleges, setColleges] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableColleges();
  }, []);

  const fetchAvailableColleges = async () => {
    try {
      const response = await api.get('/colleges');
      setColleges(response.data);
      
      // Auto pre-select first 2 colleges for quick user engagement
      if (response.data.length >= 2) {
        setSelectedIds([response.data[0].id, response.data[1].id]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(cId => cId !== id);
      } else {
        if (prev.length >= 3) {
          alert('You can compare a maximum of 3 colleges side-by-side.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleRunComparison = async () => {
    if (selectedIds.length < 2) {
      setError('Please select at least 2 colleges to compare.');
      return;
    }

    setLoading(true);
    setError('');
    setComparison(null);

    try {
      const response = await api.post('/colleges/compare', {
        college_ids: selectedIds
      });
      setComparison(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate side-by-side college comparison.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="space-y-6 animate-fade-in">
      {/* Header */}
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">Side-by-Side Comparison</h2>
        <p class="text-xs text-slate-400 mt-1">Select 2-3 colleges to compare admission chances, budget tradeoffs, and placement rate statistics.</p>
      </div>

      {/* Selection Box */}
      <div class="glass-panel p-6 rounded-xl border border-[#334155]/60">
        <h3 class="text-sm font-bold text-slate-300 mb-3">Select Colleges (Max 3):</h3>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1.5 border border-[#334155]/40 rounded-lg bg-[#0f172a]/50">
          {colleges.map((col) => {
            const isChecked = selectedIds.includes(col.id);
            return (
              <label 
                key={col.id} 
                class={`flex items-start space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                  isChecked 
                    ? 'bg-brand-500/10 border-brand-500 text-brand-300' 
                    : 'bg-[#0f172a]/40 border-[#334155]/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCheckboxChange(col.id)}
                  class="mt-0.5 rounded border-[#334155] bg-[#0f172a] text-brand-600 focus:ring-brand-500/20"
                />
                <span class="font-bold line-clamp-2 leading-tight">{col.name}</span>
              </label>
            );
          })}
        </div>

        <div class="mt-5 flex items-center justify-between">
          <span class="text-xs text-slate-400">
            {selectedIds.length} of 3 colleges selected
          </span>
          
          <button
            onClick={handleRunComparison}
            disabled={loading || selectedIds.length < 2}
            class="flex items-center space-x-2 py-2 px-5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-xl text-sm font-semibold transition"
          >
            <GitCompare size={16} />
            <span>{loading ? 'Comparing...' : 'Compare Selected'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 flex items-center space-x-3 text-sm">
          <AlertCircle size={20} class="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <div class="space-y-6">
          {/* AI trade-off card */}
          {comparison.ai_summary && (
            <div class="glass-panel p-6 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-900/10 to-transparent">
              <h3 class="text-md font-bold mb-3 flex items-center space-x-2 text-brand-300">
                <Sparkles size={16} />
                <span>AI Tradeoffs Counsel Summary</span>
              </h3>
              <p class="text-xs text-slate-300 leading-relaxed font-serif italic">
                "{comparison.ai_summary}"
              </p>
            </div>
          )}

          {/* Side by side comparison table */}
          <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#1e293b] border-b border-[#334155]">
                    <th class="p-4 font-bold text-slate-400 w-1/4">Metric</th>
                    {comparison.colleges.map((col, idx) => (
                      <th key={idx} class="p-4 font-extrabold text-brand-300 text-sm w-1/4">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#334155]/40">
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Location</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-semibold">{col.location}</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">NIRF Ranking</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-mono font-bold">#{col.ranking}</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Average Placements</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-brand-400 font-bold font-mono">{col.placements.average_package}</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Highest Package</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-mono">{col.placements.highest_package}</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Tuition Fee (Annual)</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-mono">{col.fees.tuition} Lakhs</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Hostel Fee (Annual)</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-mono">{col.fees.hostel} Lakhs</td>
                    ))}
                  </tr>
                  <tr class="bg-brand-900/5">
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Total Fee (Estimated)</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-brand-300 font-bold font-mono">{col.fees.total} Lakhs</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Latest Cutoff</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300">{col.cutoff}</td>
                    ))}
                  </tr>
                  {/* Matching parameters */}
                  <tr class="bg-slate-900/40">
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Profile Match %</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-brand-400 font-extrabold text-sm font-mono">{col.student_metrics.match_score}</td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Admission Chance</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4">
                        <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          col.student_metrics.admission_chance === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                          col.student_metrics.admission_chance === 'Moderate' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-pink-500/10 text-pink-400'
                        }`}>
                          {col.student_metrics.admission_chance} Chance
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td class="p-4 font-bold text-slate-400 bg-[#1e293b]/20">Classification</td>
                    {comparison.colleges.map((col, idx) => (
                      <td key={idx} class="p-4 text-slate-300 font-semibold">{col.student_metrics.classification} Option</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
