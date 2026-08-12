import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, Bookmark, BookmarkCheck, ArrowUpDown, School, MapPin, DollarSign, Award } from 'lucide-react';
import api from '../services/api';

export default function Colleges() {
  const [colleges, setColleges] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchState, setSearchState] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [minPackage, setMinPackage] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('ranking');
  const [sortDir, setSortDir] = useState('asc');
  
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState({});

  useEffect(() => {
    fetchColleges();
    fetchSavedColleges();
  }, [sortBy, sortDir]);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchName) params.name = searchName;
      if (searchState) params.state = searchState;
      if (maxFee) params.max_fee = parseFloat(maxFee);
      if (minPackage) params.min_package = parseFloat(minPackage);
      if (courseFilter) params.course_name = courseFilter;
      params.sort_by = sortBy;
      params.sort_dir = sortDir;

      const response = await api.get('/colleges', { params });
      setColleges(response.data);
    } catch (err) {
      console.error("Failed to fetch colleges list: ", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedColleges = async () => {
    try {
      const response = await api.get('/saved-colleges');
      setSavedIds(response.data.map(item => item.college_id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchColleges();
  };

  const handleClearFilters = () => {
    setSearchName('');
    setSearchState('');
    setMaxFee('');
    setMinPackage('');
    setCourseFilter('');
    setSortBy('ranking');
    setSortDir('asc');
    // Fetch immediately
    setTimeout(() => fetchColleges(), 50);
  };

  const handleToggleSave = async (collegeId) => {
    setSavedLoading(prev => ({ ...prev, [collegeId]: true }));
    try {
      const isSaved = savedIds.includes(collegeId);
      if (isSaved) {
        // Find saved record ID
        const savedRes = await api.get('/saved-colleges');
        const record = savedRes.data.find(item => item.college_id === collegeId);
        if (record) {
          await api.delete(`/saved-colleges/${record.id}`);
          setSavedIds(prev => prev.filter(id => id !== collegeId));
        }
      } else {
        await api.post('/saved-colleges', { college_id: collegeId });
        setSavedIds(prev => [...prev, collegeId]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavedLoading(prev => ({ ...prev, [collegeId]: false }));
    }
  };

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <div class="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div class="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight">Colleges Finder</h2>
          <p class="text-xs text-slate-400 mt-1">Explore top accredited universities, compare placement packages, and filter by budget or rankings.</p>
        </div>
      </div>

      {/* Multi-Filter Form */}
      <div class="glass-panel p-6 rounded-xl border border-[#334155]/60">
        <form onSubmit={handleSearchSubmit} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="relative col-span-1 md:col-span-2">
              <Search size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search college by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="State (e.g. Maharashtra)"
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Course Offered (e.g. Cybersecurity)"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Max Budget (Lakhs/year)</label>
              <input
                type="number"
                placeholder="e.g. 3.5"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Min Avg Package (LPA)</label>
              <input
                type="number"
                placeholder="e.g. 10.0"
                value={minPackage}
                onChange={(e) => setMinPackage(e.target.value)}
                class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            
            <div class="md:col-span-2 flex items-end space-x-3">
              <button
                type="submit"
                class="flex-1 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                class="py-2 px-4 border border-[#334155] hover:bg-[#334155] text-slate-300 rounded-lg text-sm font-semibold transition"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Sorting bar */}
      <div class="flex items-center justify-between py-2 border-b border-[#334155]/40 text-xs">
        <span class="text-slate-400 font-semibold uppercase">Found {colleges.length} colleges</span>
        <div class="flex items-center space-x-4">
          <span class="text-slate-400">Sort by:</span>
          {[
            { label: 'Ranking', field: 'ranking' },
            { label: 'Total Fees', field: 'fees' },
            { label: 'Placements', field: 'placement' },
            { label: 'Name', field: 'name' }
          ].map(opt => (
            <button
              key={opt.field}
              onClick={() => handleSortToggle(opt.field)}
              class={`flex items-center space-x-1 font-bold ${
                sortBy === opt.field ? 'text-brand-400' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span>{opt.label}</span>
              {sortBy === opt.field && (
                <ArrowUpDown size={12} class={sortDir === 'desc' ? 'rotate-180 transition-transform' : ''} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* College Cards Grid */}
      {loading ? (
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <p class="text-sm text-slate-400">Filtering catalog...</p>
        </div>
      ) : colleges.length === 0 ? (
        <div class="glass-panel p-12 text-center text-slate-400 rounded-xl">
          No colleges match your filter queries. Try adjusting your parameters.
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((col) => {
            const isSaved = savedIds.includes(col.id);
            return (
              <div key={col.id} class="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col justify-between border border-[#334155] relative overflow-hidden">
                {col.ranking && (
                  <span class="absolute top-4 left-4 bg-brand-500/10 border border-brand-500/30 text-brand-300 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                    NIRF Rank #{col.ranking}
                  </span>
                )}
                <button
                  onClick={() => handleToggleSave(col.id)}
                  disabled={savedLoading[col.id]}
                  class="absolute top-4 right-4 p-1.5 bg-[#0f172a]/80 hover:bg-[#334155] text-brand-400 rounded-lg transition"
                >
                  {isSaved ? <BookmarkCheck size={18} class="text-brand-400" /> : <Bookmark size={18} class="text-slate-400" />}
                </button>

                <div class="mt-8 space-y-3">
                  <div class="space-y-1">
                    <h3 class="font-extrabold text-lg text-slate-200 line-clamp-1">{col.name}</h3>
                    <p class="text-xs text-slate-400 flex items-center space-x-1">
                      <MapPin size={12} class="text-slate-500 shrink-0" />
                      <span>{col.location}</span>
                    </p>
                  </div>

                  <p class="text-xs text-slate-400 line-clamp-2 h-8">{col.description}</p>

                  {/* Highlights Grid */}
                  <div class="grid grid-cols-2 gap-2 bg-[#0f172a]/40 p-2.5 rounded-lg border border-[#334155]/20 text-[11px]">
                    <div class="flex flex-col">
                      <span class="text-slate-400 font-semibold uppercase tracking-wide">Tuition Fees</span>
                      <span class="text-slate-200 font-bold mt-0.5">{col.total_estimated_fee} Lakhs/yr</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-slate-400 font-semibold uppercase tracking-wide">Avg Package</span>
                      <span class="text-slate-200 font-bold mt-0.5">{col.average_package} LPA</span>
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex items-center justify-between pt-4 border-t border-[#334155]/40">
                  <span class="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-bold uppercase font-mono">
                    {col.type} Inst.
                  </span>
                  
                  <Link
                    to={`/colleges/${col.id}`}
                    class="py-1.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
