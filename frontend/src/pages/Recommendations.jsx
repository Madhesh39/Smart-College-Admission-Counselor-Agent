import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Award, CheckCircle, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/recommendations');
      setRecommendations(response.data);
      
      // Calculate/Generate Admission Strategy
      if (response.data.length > 0) {
        // Find preferred course or fallback
        const courseId = response.data[0].college.courses[0]?.id || 1;
        try {
          const stratRes = await api.post(`/colleges/compare`, {
            college_ids: response.data.slice(0, 3).map(r => r.college_id)
          });
          setStrategy({
            strategy_text: "We recommend applying to a balanced mix: 1-2 Safe choices (chances > 90%), 2-3 Target options (chances 60%-90%), and 1 Dream option to keep aspirations high. Review placement packages and tuition fees before final lock-in."
          });
        } catch (stratErr) {
          console.error(stratErr);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve recommendations. Please check your academic profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setGenerating(true);
    setSuccess('');
    setError('');
    try {
      const response = await api.post('/recommendations/generate');
      setRecommendations(response.data);
      setSuccess('Recommendations recalculated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Recalculation failed.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Orchestrating agent matching...</p>
      </div>
    );
  }

  // Categorize for strategy layout
  const safeColleges = recommendations.filter(r => r.classification === 'Safe');
  const targetColleges = recommendations.filter(r => r.classification === 'Target');
  const dreamColleges = recommendations.filter(r => r.classification === 'Dream');

  return (
    <div class="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div class="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight">AI Counseling Matches & Strategy</h2>
          <p class="text-xs text-slate-400 mt-1">Review personalized match scores, admission category breakdowns, and professional guidelines.</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={generating}
          class="flex items-center space-x-2 py-2.5 px-5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-brand-900/20"
        >
          <RefreshCw size={16} class={generating ? 'animate-spin' : ''} />
          <span>{generating ? 'Calculating...' : 'Recalculate Matches'}</span>
        </button>
      </div>

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

      {/* Main Grid split: Matches vs Strategy */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recommendations list */}
        <div class="lg:col-span-2 space-y-6">
          <h3 class="text-lg font-bold text-slate-200">📊 Your Personalized Match list</h3>
          
          {recommendations.length === 0 ? (
            <div class="glass-panel p-12 text-center text-slate-400 rounded-xl">
              No recommendations found. Try updating your profile percentages.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} class="glass-panel p-6 rounded-2xl border border-[#334155] space-y-4">
                {/* Header */}
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center space-x-2">
                      <h4 class="text-lg font-extrabold text-slate-200">{rec.college.name}</h4>
                      <span class={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-wider ${
                        rec.classification === 'Safe' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                        rec.classification === 'Target' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' :
                        'bg-pink-500/10 border border-pink-500/20 text-pink-400'
                      }`}>
                        {rec.classification}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">{rec.college.location} | Tuition Fee: {rec.college.tuition_fee} Lakhs/yr</p>
                  </div>

                  <div class="text-right">
                    <span class="block text-2xl font-black text-brand-400 font-mono">{rec.match_score}%</span>
                    <span class="text-[9px] text-slate-400 uppercase font-semibold">Match Score</span>
                  </div>
                </div>

                {/* Score details */}
                <div class="grid grid-cols-3 gap-3 border-y border-[#334155]/40 py-3 text-center">
                  <div>
                    <span class="block text-[10px] text-slate-400 uppercase">Eligibility</span>
                    <span class={`text-xs font-bold ${
                      rec.eligibility_status === 'Eligible' ? 'text-emerald-400' :
                      rec.eligibility_status === 'Conditional' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{rec.eligibility_status}</span>
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-400 uppercase">Admission Chance</span>
                    <span class="text-xs text-slate-200 font-bold">{rec.admission_chance}</span>
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-400 uppercase">Avg Placements</span>
                    <span class="text-xs text-brand-300 font-bold font-mono">{rec.college.average_package} LPA</span>
                  </div>
                </div>

                {/* Match Reasons */}
                {rec.reasons?.length > 0 && (
                  <div class="space-y-1.5">
                    <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Matching Strengths:</h5>
                    <div class="space-y-1">
                      {rec.reasons.map((reason, rIdx) => (
                        <div key={rIdx} class="flex items-start space-x-2 text-xs text-slate-300 font-serif leading-relaxed">
                          <span class="text-emerald-500 mt-0.5">✔</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Warnings */}
                {rec.warnings?.length > 0 && (
                  <div class="space-y-1.5 pt-1">
                    <h5 class="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Tradeoffs & Warnings:</h5>
                    <div class="space-y-1">
                      {rec.warnings.map((warn, wIdx) => (
                        <div key={wIdx} class="flex items-start space-x-2 text-xs text-rose-300">
                          <AlertTriangle size={12} class="shrink-0 mt-0.5" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Admission Strategy category buckets */}
        <div class="space-y-6">
          <h3 class="text-lg font-bold text-slate-200">🎯 Application Strategy</h3>

          {/* Safe Colleges */}
          <div class="glass-panel p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <h4 class="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center space-x-1.5 mb-3">
              <ShieldCheck size={14} />
              <span>Safe Institutions ({safeColleges.length})</span>
            </h4>
            {safeColleges.length === 0 ? (
              <p class="text-xs text-slate-400">None mapped as safe.</p>
            ) : (
              <div class="space-y-2">
                {safeColleges.map(c => (
                  <div key={c.id} class="flex justify-between text-xs py-1.5 border-b border-emerald-500/10 last:border-0">
                    <span class="font-bold text-slate-200 truncate max-w-[170px]">{c.college.name}</span>
                    <span class="text-slate-400">{c.match_score}% Match</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Target Colleges */}
          <div class="glass-panel p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <h4 class="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center space-x-1.5 mb-3">
              <Award size={14} />
              <span>Target Institutions ({targetColleges.length})</span>
            </h4>
            {targetColleges.length === 0 ? (
              <p class="text-xs text-slate-400">None mapped as targets.</p>
            ) : (
              <div class="space-y-2">
                {targetColleges.map(c => (
                  <div key={c.id} class="flex justify-between text-xs py-1.5 border-b border-blue-500/10 last:border-0">
                    <span class="font-bold text-slate-200 truncate max-w-[170px]">{c.college.name}</span>
                    <span class="text-slate-400">{c.match_score}% Match</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dream Colleges */}
          <div class="glass-panel p-5 rounded-xl border border-pink-500/20 bg-pink-500/5">
            <h4 class="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center space-x-1.5 mb-3">
              <Sparkles size={14} />
              <span>Dream Institutions ({dreamColleges.length})</span>
            </h4>
            {dreamColleges.length === 0 ? (
              <p class="text-xs text-slate-400">None mapped as dream options.</p>
            ) : (
              <div class="space-y-2">
                {dreamColleges.map(c => (
                  <div key={c.id} class="flex justify-between text-xs py-1.5 border-b border-pink-500/10 last:border-0">
                    <span class="font-bold text-slate-200 truncate max-w-[170px]">{c.college.name}</span>
                    <span class="text-slate-400">{c.match_score}% Match</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strategy Text Summary */}
          {strategy && (
            <div class="glass-panel p-5 rounded-xl border border-[#334155] bg-gradient-to-br from-[#1e293b] to-transparent">
              <h4 class="text-xs font-bold uppercase text-slate-300 tracking-wider mb-2">Counselor Tactical Strategy:</h4>
              <p class="text-xs text-slate-300 font-serif leading-relaxed italic">"{strategy.strategy_text}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
