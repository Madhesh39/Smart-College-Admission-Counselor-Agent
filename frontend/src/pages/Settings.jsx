import React, { useState, useEffect } from 'react';
import { Save, Sparkles, CheckCircle, Sliders } from 'lucide-react';

export default function Settings() {
  const [weights, setWeights] = useState({
    academic: 30,
    financial: 20,
    placement: 25,
    location: 15,
    facilities: 10
  });

  const [success, setSuccess] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('recommender_weights');
    if (saved) {
      setWeights(JSON.parse(saved));
    }
  }, []);

  const handleSliderChange = (field, value) => {
    setWeights(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const sum = weights.academic + weights.financial + weights.placement + weights.location + weights.facilities;
    if (sum !== 100) {
      alert(`The sum of weights must equal exactly 100%. Currently it is ${sum}%. Please adjust accordingly.`);
      return;
    }

    localStorage.setItem('recommender_weights', JSON.stringify(weights));
    setSuccess('Algorithm matching weights customized successfully! Recalculating recommendations...');
    setTimeout(() => setSuccess(''), 3000);
  };

  const totalSum = weights.academic + weights.financial + weights.placement + weights.location + weights.facilities;

  return (
    <div class="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">Algorithmic Settings</h2>
        <p class="text-xs text-slate-400 mt-1">Configure weights for the multi-factor match score calculation to prioritize placements, costs, or location.</p>
      </div>

      {success && (
        <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 flex items-center space-x-3 text-sm">
          <CheckCircle size={20} class="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} class="space-y-6">
        <div class="glass-panel p-6 rounded-xl border border-[#334155] space-y-6">
          <h3 class="text-md font-bold flex items-center space-x-2 text-slate-200 border-b border-[#334155] pb-2">
            <Sliders size={18} class="text-brand-400" />
            <span>Customize Weights (Sum must equal 100%)</span>
          </h3>

          <div class="space-y-5">
            {/* Academic weight */}
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Academic Compatibility (12th + Entrance Scores)</span>
                <span class="text-brand-400 font-bold">{weights.academic}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={weights.academic}
                onChange={(e) => handleSliderChange('academic', e.target.value)}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Financial weight */}
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Budget & Fee Constraints</span>
                <span class="text-brand-400 font-bold">{weights.financial}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={weights.financial}
                onChange={(e) => handleSliderChange('financial', e.target.value)}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Placement package weight */}
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Placement Package Packages & Rates</span>
                <span class="text-brand-400 font-bold">{weights.placement}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={weights.placement}
                onChange={(e) => handleSliderChange('placement', e.target.value)}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Location alignment weight */}
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Location Alignment (Preferred State/City)</span>
                <span class="text-brand-400 font-bold">{weights.location}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={weights.location}
                onChange={(e) => handleSliderChange('location', e.target.value)}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Facilities weight */}
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Campus Infrastructure & Facilities</span>
                <span class="text-brand-400 font-bold">{weights.facilities}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="5"
                value={weights.facilities}
                onChange={(e) => handleSliderChange('facilities', e.target.value)}
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-[#334155] text-xs font-bold">
            <span class="text-slate-400">Total Sum of Weights:</span>
            <span class={totalSum === 100 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalSum}% {totalSum === 100 ? '(Valid)' : `(Invalid - Must be 100%)`}
            </span>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="flex items-center space-x-2 py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-brand-900/20"
          >
            <Save size={14} />
            <span>Save Weights Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
