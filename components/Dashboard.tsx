
import React, { useState, useMemo } from 'react';
import { SavedResumeAnalysis, SavedInterview } from '../types';

interface Props {
  activeResume: SavedResumeAnalysis | null;
  resumeHistory: SavedResumeAnalysis[];
  activeInterview: SavedInterview | null;
  interviewHistory: SavedInterview[];
  jobRole: string;
  techStack: string;
  onStartInterview: () => void;
  onGenerateRoadmap: () => void;
  onSelectSession: (session: SavedInterview) => void;
  onDeleteSession: (id: string) => void;
  onSelectResume: (analysis: SavedResumeAnalysis) => void;
  onDeleteResume: (id: string) => void;
}

const Dashboard: React.FC<Props> = ({ 
  activeResume, 
  resumeHistory,
  activeInterview, 
  interviewHistory,
  jobRole, 
  techStack, 
  onStartInterview, 
  onGenerateRoadmap,
  onSelectSession,
  onDeleteSession,
  onSelectResume,
  onDeleteResume
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredResumeHistory = useMemo(() => {
    return resumeHistory.filter(r => r.jobRole.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [resumeHistory, searchTerm]);

  const filteredInterviewHistory = useMemo(() => {
    return interviewHistory.filter(i => 
      i.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.techStack.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interviewHistory, searchTerm]);

  const evaluation = activeInterview?.evaluation || null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Career Hub</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Performance Review: {activeInterview?.jobRole || 'Professional Excellence'}
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={onStartInterview} className="px-8 py-4 glass hover:bg-white/10 border-indigo-500/20 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center gap-3">
            <i className="fas fa-plus"></i> New Practice Session
          </button>
          <button onClick={onGenerateRoadmap} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95">
            <i className="fas fa-map"></i> View Career Strategy
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metrics & History */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Top Row Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass p-8 rounded-[2.5rem] flex items-center justify-between border-indigo-500/10">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resume Score</h4>
                <div className="text-6xl font-black text-white tabular-nums">
                  {activeResume?.ats_score || 0}<span className="text-xl opacity-30 ml-1">/100</span>
                </div>
              </div>
              <div className="hidden sm:block">
                 <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${activeResume?.ats_score || 0}%` }}></div>
                 </div>
                 <p className="text-[9px] text-right font-bold text-indigo-400 mt-2">Alignment Metrics</p>
              </div>
            </div>
            
            <div className="glass p-8 rounded-[2.5rem] border-emerald-500/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <i className="fas fa-user-tie text-6xl"></i>
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Overall Perf.</h4>
               <div className="text-6xl font-black text-emerald-400 tabular-nums">
                  {evaluation ? ((evaluation.technical_score + evaluation.communication_score) / 2).toFixed(1) : '0.0'}
               </div>
            </div>
          </div>

          {/* Detailed Analysis Area */}
          <div className="glass rounded-[2.5rem] p-10 space-y-12">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <i className="fas fa-magnifying-glass-chart text-indigo-400"></i> Competency Review
                </h2>
                {activeInterview && (
                  <div className="bg-black/40 p-1.5 rounded-xl flex gap-1">
                    <button onClick={() => setShowTranscript(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!showTranscript ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Analysis</button>
                    <button onClick={() => setShowTranscript(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showTranscript ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Transcript</button>
                  </div>
                )}
             </div>

             {showTranscript ? (
                <div className="space-y-6 h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 animate-in fade-in duration-300">
                   {activeInterview?.transcript.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                         <div className={`max-w-[80%] p-5 rounded-3xl text-sm leading-relaxed ${m.role === 'interviewer' ? 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none font-medium'}`}>
                            {m.text}
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="space-y-10 animate-in fade-in duration-300">
                   {/* Strengths & Areas for Improvement */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                           <i className="fas fa-check-circle"></i> Key Competencies
                         </h4>
                         <div className="space-y-3">
                            {evaluation?.strengths.map((s, i) => (
                               <div key={i} className="flex gap-4 group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                  <p className="text-sm text-slate-400 leading-relaxed">{s}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                           <i className="fas fa-arrow-trend-up"></i> Growth Opportunities
                         </h4>
                         <div className="space-y-3">
                            {evaluation?.weaknesses.map((w, i) => (
                               <div key={i} className="flex gap-4 group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                  <p className="text-sm text-slate-400 leading-relaxed">{w}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   {/* Roadmap Preview Button */}
                   <div className="pt-6 border-t border-white/5">
                      <div className="p-8 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
                         <div className="text-center md:text-left">
                            <h5 className="font-bold text-white mb-1">Professional Success Strategy</h5>
                            <p className="text-xs text-slate-500">A targeted 30-day plan derived from your performance data.</p>
                         </div>
                         <button onClick={onGenerateRoadmap} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Review Plan</button>
                      </div>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Right Column: History Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass rounded-[2.5rem] p-8 h-full min-h-[600px] flex flex-col">
              <div className="mb-8">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Review Vault</h3>
                 <div className="relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500"></i>
                    <input 
                      type="text" 
                      placeholder="Search history..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-indigo-500/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-8 pr-2 scrollbar-thin">
                 {/* Resume Entries */}
                 <div className="space-y-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 px-2">Profile Reviews</h5>
                    {filteredResumeHistory.map(res => (
                       <div key={res.id} onClick={() => onSelectResume(res)} className={`group relative p-5 rounded-3xl border-2 cursor-pointer transition-all ${activeResume?.id === res.id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                          <div className="flex justify-between items-start mb-1">
                             <div className="font-black text-[11px] text-white tracking-tight uppercase truncate max-w-[120px]">{res.jobRole}</div>
                             <div className="text-[10px] font-black text-indigo-400">{res.ats_score}/100</div>
                          </div>
                          <div className="text-[8px] font-bold text-slate-600 uppercase">{new Date(res.timestamp).toLocaleDateString()}</div>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteResume(res.id); }} className="absolute -top-1 -right-1 p-2 bg-rose-500/10 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 transition-all shadow-xl"><i className="fas fa-trash text-[8px]"></i></button>
                       </div>
                    ))}
                 </div>

                 {/* Interview Entries */}
                 <div className="space-y-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60 px-2">Interview Sessions</h5>
                    {filteredInterviewHistory.map(int => (
                       <div key={int.id} onClick={() => onSelectSession(int)} className={`group relative p-5 rounded-3xl border-2 cursor-pointer transition-all ${activeInterview?.id === int.id ? 'bg-emerald-600/10 border-emerald-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                          <div className="flex justify-between items-start mb-1">
                             <div className="font-black text-[11px] text-white tracking-tight uppercase truncate max-w-[120px]">{int.jobRole}</div>
                             <div className="text-[10px] font-black text-emerald-400">{(int.evaluation.technical_score).toFixed(1)}/10</div>
                          </div>
                          <div className="text-[8px] font-bold text-slate-600 uppercase">{new Date(int.timestamp).toLocaleDateString()}</div>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteSession(int.id); }} className="absolute -top-1 -right-1 p-2 bg-rose-500/10 text-rose-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 transition-all shadow-xl"><i className="fas fa-trash text-[8px]"></i></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
