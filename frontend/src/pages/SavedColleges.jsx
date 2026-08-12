import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, ArrowUpRight, School, MapPin } from 'lucide-react';
import api from '../services/api';

export default function SavedColleges() {
  const [savedList, setSavedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedColleges();
  }, []);

  const fetchSavedColleges = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saved-colleges');
      setSavedList(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSaved = async (id) => {
    if (!confirm('Are you sure you want to remove this college from your shortlist?')) return;
    try {
      await api.delete(`/saved-colleges/${id}`);
      setSavedList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading shortlist...</p>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <div class="glass-panel p-6 rounded-2xl">
        <h2 class="text-2xl font-extrabold tracking-tight">My Shortlist</h2>
        <p class="text-xs text-slate-400 mt-1">Shortlist target institutions to track, run comparisons, or monitor placement stats.</p>
      </div>

      {savedList.length === 0 ? (
        <div class="glass-panel p-12 text-center text-slate-400 rounded-xl max-w-lg mx-auto space-y-4">
          <Bookmark size={40} class="mx-auto text-slate-500" />
          <h4 class="font-bold text-sm text-slate-300">Shortlist is empty</h4>
          <p class="text-xs text-slate-400 leading-relaxed">
            Go to the Colleges Search panel and click the bookmark icon on any card to add it here.
          </p>
          <Link 
            to="/colleges" 
            class="inline-block py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Find Colleges
          </Link>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedList.map((item) => (
            <div key={item.id} class="glass-panel p-5 rounded-xl border border-[#334155] flex flex-col justify-between h-48 relative">
              <button
                onClick={() => handleDeleteSaved(item.id)}
                class="absolute top-4 right-4 p-1.5 bg-[#0f172a]/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                title="Remove from shortlist"
              >
                <Trash2 size={16} />
              </button>

              <div class="space-y-2 pr-6">
                <h3 class="font-extrabold text-slate-200 line-clamp-1">{item.college.name}</h3>
                <p class="text-xs text-slate-400 flex items-center space-x-1">
                  <MapPin size={12} class="text-slate-500 shrink-0" />
                  <span>{item.college.location}</span>
                </p>
                <div class="flex items-center space-x-3 pt-2 text-[10px] text-slate-400">
                  <span>NIRF Rank: #{item.college.ranking || 'N/A'}</span>
                  <span>•</span>
                  <span>Avg Package: {item.college.average_package} LPA</span>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between pt-4 border-t border-[#334155]/40">
                <span class="text-[9px] bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded font-bold uppercase">
                  {item.college.type}
                </span>
                
                <Link
                  to={`/colleges/${item.college_id}`}
                  class="py-1.5 px-3 bg-brand-600/10 border border-brand-500/20 hover:border-brand-500/40 text-brand-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <span>Details</span>
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
