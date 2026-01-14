
import React, { useState, useMemo } from 'react';
import { SavedResumeAnalysis, SavedInterview } from '../types';

interface Props {
  activeResume: SavedResumeAnalysis | null;
  resumeHistory: SavedResumeAnalysis[];
  activeInterview: SavedInterview | null;
  interviewHistory: SavedInterview[];
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
      (i.techStack && i.techStack.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [interviewHistory, searchTerm]);

  const evaluation = activeInterview?.evaluation || null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-white tracking-tighter">Career Insights</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Performance Record: {activeInterview?.jobRole || activeResume?.jobRole || 'Ready for Review'}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onStartInterview} 
            className="px-10 py-5 glass hover:bg-white/10 border-indigo-500/30 text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all flex items-center gap-4 group shadow-xl"
          >
            <i className="fas fa-plus text-[10px] group-hover:rotate-90 transition-transform"></i> Mock Interview
          </button>
          <button 
            onClick={onGenerateRoadmap} 
            className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-indigo-600/40 transition-all flex items-center gap-4 active:scale-95"
          >
            <i className="fas fa-map text-[10px]"></i> Career Roadmap
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Evaluation Summary */}
        <div className="lg:col-span-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              className={`lg:col-span-2 glass p-10 rounded-[3rem] flex items-center justify-between border-indigo-500/10 transition-all relative overflow-hidden ${!activeResume ? 'opacity-40 grayscale' : 'glow-indigo'}`}
            >
              <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Resume Compatibility</h4>
                <div className="text-7xl font-black text-white tabular-nums tracking-tighter">
                  {activeResume?.ats_score || 0}<span className="text-2xl opacity-20 ml-2">/100</span>
                </div>
              </div>
              <div className="hidden sm:block relative z-10 text-right">
                 <div className="w-32 h-2.5 bg-white/5 rounded-full overflow-hidden mb-4 shadow-inner">
                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${activeResume?.ats_score || 0}%` }}></div>
                 </div>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Industry Alignment</p>
              </div>
            </div>
            
            <div className={`glass p-10 rounded-[3rem] border-emerald-500/10 relative overflow-hidden group transition-all ${!activeInterview ? 'opacity-40 grayscale' : 'glow-emerald'}`}>
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                  <i className="fas fa-medal text-7xl"></i>
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Interview Score</h4>
               <div className="text-7xl font-black text-emerald-400 tabular-nums tracking-tighter">
                  {evaluation ? (((evaluation.technical_score || 0) + (evaluation.communication_score || 0)) / 2).toFixed(1) : '0.0'}
               </div>
            </div>
          </div>

          <div className="glass rounded-[4rem] p-12 md:p-16 space-y-12 shadow-2xl border-white/[0.03]">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-10">
                <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                    <i className="fas fa-clipboard-check text-xl"></i>
                  </div>
                  Performance Review
                </h2>
                {activeInterview && (
                  <div className="bg-black/40 p-2 rounded-2xl flex gap-1.5 self-start sm:self-auto border border-white/5">
                    <button 
                      onClick={() => setShowTranscript(false)} 
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showTranscript ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      Audit Report
                    </button>
                    <button 
                      onClick={() => setShowTranscript(true)} 
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showTranscript ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      Transcript
                    </button>
                  </div>
                )}
             </div>

             {showTranscript && activeInterview ? (
                <div className="space-y-8 h-[550px] overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-white/10 animate-in fade-in duration-500">
                   {activeInterview.transcript.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                         <div className={`max-w-[85%] p-7 rounded-[2.5rem] text-base leading-relaxed ${m.role === 'interviewer' ? 'bg-white/[0.03] border border-white/5 text-slate-300 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none font-medium shadow-xl'}`}>
                            <div className="text-[10px] uppercase font-black tracking-widest mb-3 opacity-40">{m.role}</div>
                            {m.text}
                            <div className="text-[9px] text-right mt-4 font-bold opacity-30 uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                         </div>
                      </div>
                   ))}
                </div>
             ) : activeInterview || activeResume ? (
                <div className="space-y-16 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-8">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
                           <i className="fas fa-check-circle"></i> Key Strengths
                         </h4>
                         <div className="space-y-5">
                            {(evaluation?.strengths || activeResume?.project_feedback || []).map((s, i) => (
                               <div key={i} className="flex gap-5 group">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-all"></div>
                                  <p className="text-base text-slate-400 leading-relaxed font-medium">{s}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-8">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-3">
                           <i className="fas fa-arrow-up-right-dots"></i> Improvement Areas
                         </h4>
                         <div className="space-y-5">
                            {(evaluation?.weaknesses || activeResume?.improvement_suggestions || []).map((w, i) => (
                               <div key={i} className="flex gap-5 group">
                                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0 group-hover:scale-150 transition-all"></div>
                                  <p className="text-base text-slate-400 leading-relaxed font-medium">{w}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="pt-10 border-t border-white/5">
                      <div className="p-10 rounded-[3rem] bg-indigo-600/[0.03] border border-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-10">
                         <div className="text-center md:text-left space-y-2">
                            <h5 className="text-xl font-black text-white tracking-tight">Growth Roadmap Identified</h5>
                            <p className="text-sm text-slate-500 font-medium">Based on your performance data, we have generated a structured development plan.</p>
                         </div>
                         <button onClick={onGenerateRoadmap} className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl whitespace-nowrap">View Roadmap</button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
                  <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center text-slate-800 text-5xl float shadow-inner">
                    <i className="fas fa-folder-open"></i>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-500 uppercase tracking-tighter">No Session Selected</h3>
                    <p className="text-slate-600 text-base max-w-sm font-medium">Please select a resume review or mock interview session from your history to view the analysis.</p>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           <div className="glass rounded-[4rem] p-10 h-full min-h-[700px] flex flex-col shadow-2xl border-white/[0.03]">
              <div className="mb-10">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 ml-2">Session History</h3>
                 <div className="relative group">
                    <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Search records..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xs text-white outline-none focus:border-indigo-500/50 shadow-inner font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-10 pr-4 scrollbar-thin">
                 {/* Resume Entries */}
                 {filteredResumeHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/40 px-3">Resume Reviews</h5>
                      {filteredResumeHistory.map(res => (
                         <div key={res.id} onClick={() => onSelectResume(res)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeResume?.id === res.id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[12px] text-white tracking-tight uppercase truncate max-w-[140px]">{res.jobRole}</div>
                               <div className="text-[11px] font-black text-indigo-400 tabular-nums">{(res.ats_score || 0)}</div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest">
                               <span>{new Date(res.timestamp).toLocaleDateString()}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity">View Analysis</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteResume(res.id); }} className="absolute -top-1.5 -right-1.5 p-2.5 bg-rose-500/10 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-xl z-20"><i className="fas fa-trash-can text-[10px]"></i></button>
                         </div>
                      ))}
                   </div>
                 )}

                 {/* Interview Entries */}
                 {filteredInterviewHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/40 px-3">Mock Interviews</h5>
                      {filteredInterviewHistory.map(int => (
                         <div key={int.id} onClick={() => onSelectSession(int)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeInterview?.id === int.id ? 'bg-emerald-600/10 border-emerald-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[12px] text-white tracking-tight uppercase truncate max-w-[140px]">{int.jobRole}</div>
                               <div className="text-[11px] font-black text-emerald-400 tabular-nums">{(int.evaluation?.technical_score ?? 0).toFixed(1)}</div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest">
                               <span>{new Date(int.timestamp).toLocaleDateString()}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity">Open Record</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteSession(int.id); }} className="absolute -top-1.5 -right-1.5 p-2.5 bg-rose-500/10 text-rose-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-xl z-20"><i className="fas fa-trash-can text-[10px]"></i></button>
                         </div>
                      ))}
                   </div>
                 )}

                 {filteredResumeHistory.length === 0 && filteredInterviewHistory.length === 0 && (
                   <div className="text-center py-20 px-6 border border-dashed border-white/5 rounded-3xl">
                     <p className="text-[11px] text-slate-700 font-black uppercase tracking-[0.4em]">Historical Records Empty</p>
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
