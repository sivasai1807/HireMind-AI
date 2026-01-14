
import React, { useState, useMemo, useEffect } from 'react';
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

  // Sync active evaluation when an interview is selected
  const evaluation = activeInterview?.evaluation || null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Performance Center</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Reviewing Record: {activeInterview?.jobRole || activeResume?.jobRole || 'Select a session'}
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={onStartInterview} className="px-8 py-4 glass hover:bg-white/10 border-indigo-500/20 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center gap-3">
            <i className="fas fa-plus"></i> New Practice Session
          </button>
          <button onClick={onGenerateRoadmap} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95">
            <i className="fas fa-map"></i> Career Strategy
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metrics & Analysis */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Performance Summary Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              className={`lg:col-span-2 glass p-8 rounded-[2.5rem] flex items-center justify-between border-indigo-500/10 transition-all ${!activeResume ? 'opacity-50 grayscale' : ''}`}
            >
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resume Accuracy</h4>
                <div className="text-6xl font-black text-white tabular-nums">
                  {activeResume?.ats_score || 0}<span className="text-xl opacity-30 ml-1">/100</span>
                </div>
              </div>
              <div className="hidden sm:block">
                 <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${activeResume?.ats_score || 0}%` }}></div>
                 </div>
                 <p className="text-[9px] text-right font-bold text-indigo-400 mt-2">Professional Alignment</p>
              </div>
            </div>
            
            <div className={`glass p-8 rounded-[2.5rem] border-emerald-500/10 relative overflow-hidden group transition-all ${!activeInterview ? 'opacity-50 grayscale' : ''}`}>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <i className="fas fa-user-tie text-6xl"></i>
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Session Score</h4>
               <div className="text-6xl font-black text-emerald-400 tabular-nums">
                  {evaluation ? ((evaluation.technical_score + evaluation.communication_score) / 2).toFixed(1) : '0.0'}
               </div>
            </div>
          </div>

          {/* Core Content: Evaluation or Transcript */}
          <div className="glass rounded-[2.5rem] p-10 space-y-12">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <i className="fas fa-magnifying-glass-chart text-indigo-400"></i> Detailed Review
                </h2>
                {activeInterview && (
                  <div className="bg-black/40 p-1.5 rounded-xl flex gap-1 self-start sm:self-auto">
                    <button 
                      onClick={() => setShowTranscript(false)} 
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!showTranscript ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      Analysis
                    </button>
                    <button 
                      onClick={() => setShowTranscript(true)} 
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showTranscript ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      Transcript
                    </button>
                  </div>
                )}
             </div>

             {showTranscript && activeInterview ? (
                <div className="space-y-6 h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 animate-in fade-in duration-300">
                   {activeInterview.transcript.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                         <div className={`max-w-[80%] p-5 rounded-3xl text-sm leading-relaxed ${m.role === 'interviewer' ? 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none font-medium'}`}>
                            <div className="text-[9px] uppercase font-bold mb-2 opacity-40">{m.role}</div>
                            {m.text}
                            <div className="text-[8px] text-right mt-2 opacity-30">{new Date(m.timestamp).toLocaleTimeString()}</div>
                         </div>
                      </div>
                   ))}
                </div>
             ) : activeInterview || activeResume ? (
                <div className="space-y-10 animate-in fade-in duration-300">
                   {/* Combined display for either Resume or Interview feedback */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                           <i className="fas fa-check-circle"></i> Dominant Strengths
                         </h4>
                         <div className="space-y-3">
                            {(evaluation?.strengths || activeResume?.project_feedback || []).map((s, i) => (
                               <div key={i} className="flex gap-4 group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                  <p className="text-sm text-slate-400 leading-relaxed">{s}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                           <i className="fas fa-arrow-trend-up"></i> Development Points
                         </h4>
                         <div className="space-y-3">
                            {(evaluation?.weaknesses || activeResume?.improvement_suggestions || []).map((w, i) => (
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
                            <h5 className="font-bold text-white mb-1">Success Strategy Roadmap</h5>
                            <p className="text-xs text-slate-500">Based on these sessions, we've outlined a 30-day professional evolution plan.</p>
                         </div>
                         <button onClick={onGenerateRoadmap} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Review Strategy</button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-3xl mb-6">
                    <i className="fas fa-database"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-500 mb-2">No Session Selected</h3>
                  <p className="text-slate-600 text-sm max-w-xs">Please select a profile review or practice session from the sidebar history.</p>
                </div>
             )}
          </div>
        </div>

        {/* Right Column: Historical Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass rounded-[2.5rem] p-8 h-full min-h-[600px] flex flex-col">
              <div className="mb-8">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Performance Archive</h3>
                 <div className="relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500"></i>
                    <input 
                      type="text" 
                      placeholder="Filter records..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-indigo-500/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-8 pr-2 scrollbar-thin">
                 {/* Profile Entries */}
                 {filteredResumeHistory.length > 0 && (
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
                 )}

                 {/* Mock Session Entries */}
                 {filteredInterviewHistory.length > 0 && (
                   <div className="space-y-4">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60 px-2">Expert Simulations</h5>
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
                 )}

                 {filteredResumeHistory.length === 0 && filteredInterviewHistory.length === 0 && (
                   <div className="text-center py-10">
                     <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">No Records Found</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
