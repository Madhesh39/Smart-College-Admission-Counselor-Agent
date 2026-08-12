import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Globe, Award, ShieldCheck, 
  FileText, Sparkles, AlertTriangle, CheckCircle, 
  DollarSign, Activity, Settings, HelpCircle, PlusCircle
} from 'lucide-react';
import api from '../services/api';

export default function CollegeDetails() {
  const { id } = useParams();
  const [college, setCollege] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Eligibility state
  const [elig12th, setElig12th] = useState(85.0);
  const [eligCgpa, setEligCgpa] = useState(8.0);
  const [eligExamName, setEligExamName] = useState('TNEA Cutoff');
  const [eligExamScore, setEligExamScore] = useState(180.0);
  const [eligResult, setEligResult] = useState(null);
  const [eligLoading, setEligLoading] = useState(false);

  // Chance Predictor state
  const [chanceResult, setChanceResult] = useState(null);
  const [chanceLoading, setChanceLoading] = useState(false);

  // Application Tracking state
  const [trackingNotes, setTrackingNotes] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('Interested');
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollegeDetails();
  }, [id]);

  const fetchCollegeDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/colleges/${id}`);
      setCollege(response.data);
      setCourses(response.data.courses || []);
      if (response.data.courses?.length > 0) {
        setSelectedCourseId(response.data.courses[0].id.toString());
      }

      // Pre-fill eligibility based on current student profile
      try {
        const profRes = await api.get('/students/profile');
        if (profRes.data) {
          setElig12th(profRes.data.percentage_12th);
          setEligCgpa(profRes.data.cgpa || 8.0);
          setEligExamName('TNEA Cutoff');
          setEligExamScore(profRes.data.tnea_cutoff || profRes.data.exam_score || 180.0);
        }
      } catch (profErr) {
        console.log("Profile not pre-filled. Defaulting scores.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setEligLoading(true);
    setEligResult(null);

    try {
      const response = await api.post('/eligibility/check', {
        college_id: parseInt(id),
        course_id: parseInt(selectedCourseId),
        percentage_12th: parseFloat(elig12th),
        cgpa: parseFloat(eligCgpa),
        exam_name: eligExamName,
        exam_score: parseFloat(eligExamScore)
      });
      setEligResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEligLoading(false);
    }
  };

  const handlePredictChances = async () => {
    if (!selectedCourseId) return;

    setChanceLoading(true);
    setChanceResult(null);

    try {
      const response = await api.post('/admission-chance/predict', {
        college_id: parseInt(id),
        course_id: parseInt(selectedCourseId),
        exam_name: eligExamName,
        exam_score: parseFloat(eligExamScore)
      });
      setChanceResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setChanceLoading(false);
    }
  };

  const handleTrackApplication = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setTrackingSuccess(false);

    try {
      await api.post('/applications', {
        college_id: parseInt(id),
        course_id: parseInt(selectedCourseId),
        status: trackingStatus,
        notes: trackingNotes || 'Added from college details tab.'
      });
      setTrackingSuccess(true);
      setTrackingNotes('');
    } catch (err) {
      alert(err.response?.data?.detail || "Application is already tracked.");
    }
  };

  if (loading) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div class="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading university catalog detail...</p>
      </div>
    );
  }

  if (!college) {
    return (
      <div class="glass-panel p-8 text-center text-slate-400 rounded-xl">
        College not found. <Link to="/colleges" class="text-brand-400 hover:underline">Go back</Link>
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <Link to="/colleges" class="inline-flex items-center space-x-2 text-xs text-brand-400 hover:text-brand-300 font-bold transition">
        <ArrowLeft size={14} />
        <span>Back to Colleges Catalog</span>
      </Link>

      {/* College Header Card */}
      <div class="glass-panel p-6 md:p-8 rounded-2xl border border-[#334155] relative">
        <div class="flex flex-col md:flex-row justify-between items-start space-y-4 md:space-y-0">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs bg-brand-500/20 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                {college.type} Institution
              </span>
              {college.ranking && (
                <span class="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                  NIRF Ranking: #{college.ranking}
                </span>
              )}
              {college.accreditation && (
                <span class="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">
                  Accreditation: {college.accreditation}
                </span>
              )}
            </div>
            
            <h2 class="text-3xl font-extrabold tracking-tight">{college.name}</h2>
            <p class="text-sm text-slate-400 flex items-center space-x-2">
              <MapPin size={14} class="text-slate-500 shrink-0" />
              <span>{college.location} | Estd. {college.established_year}</span>
            </p>
          </div>

          {college.website && (
            <a 
              href={college.website} 
              target="_blank" 
              rel="noreferrer"
              class="inline-flex items-center space-x-2 py-2 px-4 bg-[#334155]/60 hover:bg-[#334155] border border-[#334155] rounded-xl text-xs font-semibold text-slate-200 transition"
            >
              <Globe size={14} />
              <span>Official Website</span>
            </a>
          )}
        </div>

        <p class="text-sm text-slate-300 leading-relaxed mt-6 pt-6 border-t border-[#334155]/50">
          {college.description}
        </p>
      </div>

      {/* Main Layout Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academics, Facilities & Placements */}
        <div class="lg:col-span-2 space-y-6">
          {/* Courses Offered */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-lg font-bold text-slate-200 border-b border-[#334155] pb-2 mb-4">
              📚 Academic Programs Offered ({courses.length})
            </h3>
            
            <div class="space-y-4">
              {courses.map(course => (
                <div key={course.id} class="p-4 bg-[#0f172a]/50 border border-[#334155]/30 rounded-xl">
                  <div class="flex justify-between items-start">
                    <div>
                      <h4 class="font-bold text-slate-200 text-sm">{course.name}</h4>
                      <p class="text-xs text-slate-400 mt-0.5">{course.department} | Duration: {course.duration}</p>
                    </div>
                    <span class="text-[10px] bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded font-bold uppercase font-mono">
                      Req: {course.minimum_percentage}% Board
                    </span>
                  </div>
                  <p class="text-xs text-slate-300 mt-2 italic">{course.description}</p>
                  
                  {course.career_opportunities?.length > 0 && (
                    <div class="mt-3 flex flex-wrap gap-1.5 items-center">
                      <span class="text-[10px] text-slate-400 font-semibold uppercase mr-1">Outlets:</span>
                      {course.career_opportunities.map(o => (
                        <span key={o} class="text-[9px] bg-[#334155]/50 text-slate-300 px-2 py-0.5 rounded">
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure facilities */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-lg font-bold text-slate-200 border-b border-[#334155] pb-2 mb-4">
              🏛️ Campus Facilities & Support
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: "Hostel Facility", avail: college.hostel_facility },
                { name: "Central Library", avail: college.library_facility },
                { name: "Advanced Labs", avail: college.labs_facility },
                { name: "Sports Arena", avail: college.sports_facility },
                { name: "Bus Transport", avail: college.transport_facility }
              ].map(f => (
                <div key={f.name} class={`p-3 rounded-lg border text-center text-xs flex flex-col justify-center items-center h-20 ${
                  f.avail 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                }`}>
                  <span class="text-lg mb-1">{f.avail ? '✅' : '❌'}</span>
                  <span class="font-semibold leading-tight">{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Placement statistics */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-lg font-bold text-slate-200 border-b border-[#334155] pb-2 mb-4">
              💼 Placement Records
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Placement Rate", val: `${college.placement_percentage || 0}%` },
                { label: "Average Package", val: `${college.average_package || 0} LPA` },
                { label: "Median Package", val: `${college.median_package || 0} LPA` },
                { label: "Highest Package", val: `${college.highest_package || 0} LPA` }
              ].map(p => (
                <div key={p.label} class="p-4 bg-[#0f172a]/50 border border-[#334155]/30 rounded-xl text-center">
                  <span class="block text-xs text-slate-400 font-semibold uppercase tracking-wider">{p.label}</span>
                  <span class="block text-xl font-extrabold text-brand-400 mt-2 font-mono">{p.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI interactive counseling widgets */}
        <div class="space-y-6">
          {/* AI Eligibility Check */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-brand-300">
              <ShieldCheck size={16} />
              <span>Verify Course Eligibility</span>
            </h3>

            <form onSubmit={handleCheckEligibility} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Select Program</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">12th Score (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={elig12th}
                    onChange={(e) => setElig12th(e.target.value)}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">TNEA Cutoff Mark (out of 200)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={eligExamScore}
                    onChange={(e) => setEligExamScore(e.target.value)}
                    class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2 px-3 text-xs text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={eligLoading || !selectedCourseId}
                class="w-full py-2 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-lg text-xs font-semibold transition"
              >
                {eligLoading ? 'Verifying...' : 'Check Academic Eligibility'}
              </button>
            </form>

            {/* Eligibility Results */}
            {eligResult && (
              <div class="mt-4 p-4 rounded-lg animate-fade-in text-xs border space-y-2 bg-[#0f172a]/60 border-slate-700">
                <div class="flex items-center space-x-2">
                  <span class="font-bold">Status:</span>
                  <span class={`font-extrabold uppercase ${
                    eligResult.eligible === 'Eligible' ? 'text-emerald-400' :
                    eligResult.eligible === 'Conditional' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {eligResult.eligible}
                  </span>
                </div>
                <p class="text-slate-300 font-serif leading-relaxed mt-1">"{eligResult.ai_explanation}"</p>
              </div>
            )}
          </div>

          {/* AI Chance Estimator */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-md font-bold mb-4 flex items-center space-x-2 text-brand-300">
              <Sparkles size={16} />
              <span>Predict Admission Chance</span>
            </h3>
            
            <p class="text-xs text-slate-400 mb-4">Calculates admission possibility comparing current credentials to historical ranges.</p>

            <button
              onClick={handlePredictChances}
              disabled={chanceLoading || !selectedCourseId}
              class="w-full py-2 px-4 border border-brand-500/20 hover:border-brand-500/40 bg-brand-500/10 text-brand-300 rounded-lg text-xs font-semibold transition"
            >
              {chanceLoading ? 'Calculating...' : 'Run Chance Estimator Agent'}
            </button>

            {chanceResult && (
              <div class="mt-4 p-4 rounded-lg animate-fade-in text-xs border space-y-2 bg-[#0f172a]/60 border-slate-700">
                <div class="flex items-center space-x-2">
                  <span class="font-bold">Chance Level:</span>
                  <span class={`font-extrabold uppercase ${
                    chanceResult.chance === 'High' ? 'text-emerald-400' :
                    chanceResult.chance === 'Moderate' ? 'text-blue-400' : 'text-rose-400'
                  }`}>
                    {chanceResult.chance} Chance
                  </span>
                </div>
                <p class="text-slate-300 font-serif leading-relaxed mt-1">"{chanceResult.reason}"</p>
                <p class="text-[9px] text-slate-400 leading-normal border-t border-[#334155] pt-2 mt-2 italic">{chanceResult.disclaimer}</p>
              </div>
            )}
          </div>

          {/* Add to Application Tracking */}
          <div class="glass-panel p-6 rounded-2xl border border-[#334155]">
            <h3 class="text-md font-bold mb-4 text-slate-200">Track Applications</h3>
            
            {trackingSuccess && (
              <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg p-3 text-xs flex items-center space-x-2 mb-3">
                <CheckCircle size={14} />
                <span>Shortlist saved to Application tracker!</span>
              </div>
            )}

            <form onSubmit={handleTrackApplication} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">State</label>
                <select
                  value={trackingStatus}
                  onChange={(e) => setTrackingStatus(e.target.value)}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg py-1.5 px-3 text-xs text-slate-100"
                >
                  <option value="Interested">Interested</option>
                  <option value="Applied">Applied</option>
                  <option value="Document Verification">Document Verification</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Deadlines / Notes</label>
                <textarea
                  placeholder="e.g. deadline is Aug 30. Scholarship form is attached."
                  value={trackingNotes}
                  onChange={(e) => setTrackingNotes(e.target.value)}
                  class="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-slate-100 h-16 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedCourseId}
                class="w-full py-2 px-4 bg-[#334155]/60 hover:bg-[#334155] text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <PlusCircle size={14} />
                <span>Track Application</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
