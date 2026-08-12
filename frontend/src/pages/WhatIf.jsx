import React, { useState, useEffect } from 'react';
import { Award, Sparkles, RefreshCw, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import api from '../services/api';

export default function WhatIf() {
  const [profile, setProfile] = useState(null);
  
  // Simulation inputs
  const [sim12th, setSim12th] = useState(80);
  const [simExamScore, setSimExamScore] = useState(80);
  const [simBudget, setSimBudget] = useState(4.0);
  const [simState, setSimState] = useState('');
  const [simCourse, setSimCourse] = useState('Computer Science and Engineering');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchProfileAndRunInitial();
  }, []);

  const fetchProfileAndRunInitial = async () => {
    setInitialLoading(true);
    try {
      const response = await api.get('/students/profile');
      if (response.data) {
        setProfile(response.data);
        setSim12th(response.data.percentage_12th);
        setSimExamScore(response.data.exam_score || 80.0);
        setSimBudget(response.data.max_budget || 4.0);
        setSimState(response.data.preferred_state || '');
        setSimCourse(response.data.preferred_course || 'Computer Science and Engineering');
        
        // Run initial simulation using profile values
        const simRes = await api.post('/what-if/analyze', {
          percentage_12th: response.data.percentage_12th,
          exam_score: response.data.exam_score || 80.0,
          max_budget: response.data.max_budget || 4.0,
          preferred_state: response.data.preferred_state || '',
          preferred_course: response.data.preferred_course || 'Computer Science and Engineering'
        });
        setResults(simRes.data.results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/what-if/analyze', {
        percentage_12th: parseFloat(sim12th),
        exam_score: parseFloat(simExamScore),
        max_budget: parseFloat(simBudget),
        preferred_state: simState,
        preferred_course: simCourse
      });
      setResults(response.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading profile data and modeling scenarios...</p>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">What-If Admission Scenario Modeling</h2>
        <p class="text-xs text-slate-400 mt-1">Simulate changes in exam marks, board marks, or budgets to see their direct impact on eligibility and admission chances.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sliders and Inputs */}
        <div class="glass-panel p-6 rounded-2xl border border-[#334155] h-fit space-y-5">
          <h3 class="text-md font-bold text-slate-200 border-b border-[#334155] pb-2 flex items-center space-x-2">
            <Sparkles size={16} class="text-brand-400" />
            <span>Simulation Parameters</span>
          </h3>

          <form onSubmit={handleSimulate} class="space-y-4">
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                <span>Simulated 12th Board Score</span>
                <span class="text-brand-300 font-mono">{sim12th}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="0.5"
                value={sim12th}
                onChange={(e) => setSim12th(parseFloat(e.target.value))}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <span class="text-[10px] text-slate-500">Current: {profile?.percentage_12th}%</span>
            </div>

            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                <span>Simulated TNEA Cutoff Mark (out of 200)</span>
                <span class="text-brand-300 font-mono">{simExamScore} / 200</span>
              </div>
              <input
                type="range"
                min="75"
                max="200"
                step="0.5"
                value={simExamScore}
                onChange={(e) => setSimExamScore(parseFloat(e.target.value))}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <span class="text-[10px] text-slate-500">Current: {profile?.tnea_cutoff || profile?.exam_score || 180} / 200</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Simulated Max Budget (Lakhs/yr)</label>
              <div class="relative">
                <DollarSign size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.1"
                  value={simBudget}
                  onChange={(e) => setSimBudget(e.target.value)}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 pl-8 pr-3 text-xs text-slate-100"
                />
              </div>
              <span class="text-[10px] text-slate-500 mt-1 block">Current: {profile?.max_budget || 4} Lakhs</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Preferred State</label>
              <input
                type="text"
                value={simState}
                onChange={(e) => setSimState(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-xs text-slate-100"
              />
              <span class="text-[10px] text-slate-500 mt-1 block">Current: {profile?.preferred_state || 'Any'}</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Course Focus</label>
              <input
                type="text"
                value={simCourse}
                onChange={(e) => setSimCourse(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-xs text-slate-100"
              />
              <span class="text-[10px] text-slate-500 mt-1 block">Current: {profile?.preferred_course || 'CSE'}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-md shadow-brand-900/10"
            >
              <RefreshCw size={14} class={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Recalculating...' : 'Run Simulation Model'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Comparative Results Table */}
        <div class="lg:col-span-2 space-y-4">
          <h3 class="text-lg font-bold text-slate-200">📊 Scenario Comparison Results</h3>
          
          {loading ? (
            <div class="glass-panel p-20 flex flex-col items-center justify-center space-y-4 rounded-2xl">
              <div class="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
              <p class="text-xs text-slate-400">Simulating admission rules against target universities...</p>
            </div>
          ) : results.length === 0 ? (
            <div class="glass-panel p-12 text-center text-slate-400 rounded-xl">
              No simulation results. Please verify your parameter inputs.
            </div>
          ) : (
            <div class="glass-panel rounded-2xl border border-[#334155] overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-[#1e293b] border-b border-[#334155]">
                      <th class="p-4 font-bold text-slate-400">College Name</th>
                      <th class="p-4 font-bold text-slate-400 text-center">Match score (Before &rarr; After)</th>
                      <th class="p-4 font-bold text-slate-400 text-center">Eligibility (Before &rarr; After)</th>
                      <th class="p-4 font-bold text-slate-400 text-center">Chances (Before &rarr; After)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#334155]/30">
                    {results.map((res) => {
                      const scoreDiff = res.after_match_score - res.before_match_score;
                      const scoreColor = scoreDiff > 0 ? 'text-emerald-400' : scoreDiff < 0 ? 'text-rose-400' : 'text-slate-300';
                      return (
                        <tr key={res.college_id} class="hover:bg-[#334155]/20 transition">
                          <td class="p-4 font-bold text-slate-200">{res.college_name}</td>
                          <td class="p-4 text-center font-mono font-bold">
                            <span class="text-slate-400">{res.before_match_score}%</span>
                            <span class="mx-2 text-slate-500">&rarr;</span>
                            <span class={scoreColor}>{res.after_match_score}%</span>
                          </td>
                          <td class="p-4 text-center font-semibold">
                            <span class={`text-[10px] uppercase ${
                              res.before_eligibility === 'Eligible' ? 'text-emerald-400' :
                              res.before_eligibility === 'Conditional' ? 'text-amber-400' : 'text-rose-400'
                            }`}>{res.before_eligibility}</span>
                            <span class="mx-2 text-slate-500">&rarr;</span>
                            <span class={`text-[10px] uppercase ${
                              res.after_eligibility === 'Eligible' ? 'text-emerald-400' :
                              res.after_eligibility === 'Conditional' ? 'text-amber-400' : 'text-rose-400'
                            }`}>{res.after_eligibility}</span>
                          </td>
                          <td class="p-4 text-center font-bold">
                            <span class={`text-[10px] uppercase ${
                              res.before_chance === 'High' ? 'text-emerald-400' :
                              res.before_chance === 'Moderate' ? 'text-blue-400' : 'text-rose-400'
                            }`}>{res.before_chance}</span>
                            <span class="mx-2 text-slate-500">&rarr;</span>
                            <span class={`text-[10px] uppercase ${
                              res.after_chance === 'High' ? 'text-emerald-400' :
                              res.after_chance === 'Moderate' ? 'text-blue-400' : 'text-rose-400'
                            }`}>{res.after_chance}</span>
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
      </div>
    </div>
  );
}
