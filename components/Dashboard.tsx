
import React, { useState, useMemo } from 'react';
import { SavedResumeAnalysis, SavedInterview, LearningRoadmap } from '../types';

interface Props {
  activeResume: SavedResumeAnalysis | null;
  resumeHistory: SavedResumeAnalysis[];
  activeInterview: SavedInterview | null;
  interviewHistory: SavedInterview[];
  activeRoadmap: LearningRoadmap | null;
  roadmapHistory: LearningRoadmap[];
  onStartInterview: () => void;
  onGenerateRoadmap: () => void;
  onSelectSession: (session: SavedInterview) => void;
  onDeleteSession: (id: string) => void;
  onSelectResume: (analysis: SavedResumeAnalysis) => void;
  onDeleteResume: (id: string) => void;
  onSelectRoadmap: (roadmap: LearningRoadmap) => void;
  onDeleteRoadmap: (id: string) => void;
}

const Dashboard: React.FC<Props> = ({ 
  activeResume, 
  resumeHistory,
  activeInterview, 
  interviewHistory,
  activeRoadmap,
  roadmapHistory,
  onStartInterview, 
  onGenerateRoadmap,
  onSelectSession,
  onDeleteSession,
  onSelectResume,
  onDeleteResume,
  onSelectRoadmap,
  onDeleteRoadmap
}) => {
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

  const filteredRoadmapHistory = useMemo(() => {
    return roadmapHistory.filter(r => r.field.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [roadmapHistory, searchTerm]);

  const evaluation = activeInterview?.evaluation || null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-white/5 pb-12">
        <div className="space-y-4">
          <h1 className="text-6xl font-black text-white tracking-tighter">Success Board</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Comprehensive Career Command Center
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-6 py-4 glass rounded-2xl border-white/5">
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mr-2">Total Activity</div>
            <div className="text-xl font-black text-white tabular-nums">
              {resumeHistory.length + interviewHistory.length + roadmapHistory.length}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Active State */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Analytics Column */}
        <div className="lg:col-span-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`glass p-10 rounded-[3rem] border-indigo-500/10 transition-all group ${!activeResume ? 'opacity-40 grayscale' : 'glow-indigo'}`}>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Last Audit Score</h4>
              <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                {activeResume?.ats_score || 0}<span className="text-xl opacity-20">/100</span>
              </div>
              {activeResume && <div className="mt-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">{activeResume.jobRole}</div>}
            </div>
            
            <div className={`glass p-10 rounded-[3rem] border-emerald-500/10 transition-all ${!activeInterview ? 'opacity-40 grayscale' : 'glow-emerald'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Best Interview</h4>
               <div className="text-6xl font-black text-emerald-400 tabular-nums tracking-tighter">
                  {evaluation ? (((evaluation.technical_score || 0) + (evaluation.communication_score || 0)) / 2).toFixed(1) : '0.0'}
               </div>
               {activeInterview && <div className="mt-4 text-[9px] font-black text-emerald-400 uppercase tracking-widest">{activeInterview.jobRole}</div>}
            </div>

            <div className={`glass p-10 rounded-[3rem] border-purple-500/10 transition-all ${!activeRoadmap ? 'opacity-40 grayscale' : 'glow-indigo'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Active Strategy</h4>
               <div className="text-6xl font-black text-purple-400 tabular-nums tracking-tighter">
                  {activeRoadmap?.milestones.length || 0}
               </div>
               {activeRoadmap && <div className="mt-4 text-[9px] font-black text-purple-400 uppercase tracking-widest">{activeRoadmap.field}</div>}
            </div>
          </div>

          <div className="glass rounded-[4rem] p-12 md:p-16 space-y-12 shadow-2xl border-white/[0.03] relative overflow-hidden">
             {activeRoadmap ? (
                <div className="space-y-12 animate-in fade-in duration-500 relative z-10">
                   <header className="flex items-center justify-between gap-6 border-b border-white/5 pb-10">
                      <div className="space-y-2">
                         <h2 className="text-3xl font-black text-white tracking-tighter">Active Strategy: {activeRoadmap.field}</h2>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Growth Cycle: {activeRoadmap.estimated_days} Days</p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 text-2xl">
                        <i className="fas fa-map-location-dot"></i>
                      </div>
                   </header>

                   <div className="space-y-10">
                      {activeRoadmap.milestones.slice(0, 2).map((m, idx) => (
                         <div key={idx} className="flex gap-8 group">
                            <div className="w-px bg-white/10 relative">
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-500 group-hover:scale-125 transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                            </div>
                            <div className="pb-4">
                               <h5 className="text-xs font-black text-white mb-3 uppercase tracking-tight">Phase {m.week}: {m.topic}</h5>
                               <p className="text-sm text-slate-500 leading-relaxed max-w-xl font-medium">{m.description.substring(0, 140)}...</p>
                            </div>
                         </div>
                      ))}
                      <div className="pt-6">
                         <button onClick={onGenerateRoadmap} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">View Full Strategy</button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center space-y-10">
                  <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-800 text-6xl float shadow-inner border border-white/5">
                    <i className="fas fa-compass"></i>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">No Active Career Strategy</h3>
                    <p className="text-slate-500 text-sm max-w-sm font-medium mx-auto">Initialize a new professional roadmap to visualize and execute your career growth steps.</p>
                  </div>
                  <button onClick={onGenerateRoadmap} className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/30">Start Strategic Planning</button>
                </div>
             )}
          </div>
        </div>

        {/* History & Archive Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           <div className="glass rounded-[4rem] p-10 h-full min-h-[700px] flex flex-col shadow-2xl border-white/[0.03]">
              <div className="mb-10">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 ml-2">History Archive</h3>
                 <div className="relative group">
                    <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Filter records..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4.5 pl-16 pr-6 text-xs text-white outline-none focus:border-indigo-500/50 shadow-inner font-bold transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-10 pr-2 scrollbar-thin">
                 {/* Learning Paths */}
                 {filteredRoadmapHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400/40 px-3">Strategies</h5>
                      {filteredRoadmapHistory.map(rd => (
                         <div key={rd.id} onClick={() => onSelectRoadmap(rd)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeRoadmap?.id === rd.id ? 'bg-purple-600/10 border-purple-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[11px] text-white tracking-tight uppercase truncate max-w-[150px]">{rd.field}</div>
                               <div className="text-[10px] font-black text-purple-400 tabular-nums">{rd.estimated_days}d</div>
                            </div>
                            <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{new Date(rd.timestamp).toLocaleDateString()}</div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteRoadmap(rd.id); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"><i className="fas fa-times text-[10px]"></i></button>
                         </div>
                      ))}
                   </div>
                 )}

                 {/* Mock Interviews */}
                 {filteredInterviewHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/40 px-3">Interviews</h5>
                      {filteredInterviewHistory.map(int => (
                         <div key={int.id} onClick={() => onSelectSession(int)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeInterview?.id === int.id ? 'bg-emerald-600/10 border-emerald-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[11px] text-white tracking-tight uppercase truncate max-w-[150px]">{int.jobRole}</div>
                               <div className="text-[10px] font-black text-emerald-400 tabular-nums">{(int.evaluation?.technical_score ?? 0).toFixed(1)}</div>
                            </div>
                            <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{new Date(int.timestamp).toLocaleDateString()}</div>
                         </div>
                      ))}
                   </div>
                 )}

                 {/* Resume Audits */}
                 {filteredResumeHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/40 px-3">Resume Audits</h5>
                      {filteredResumeHistory.map(res => (
                         <div key={res.id} onClick={() => onSelectResume(res)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeResume?.id === res.id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[11px] text-white tracking-tight uppercase truncate max-w-[150px]">{res.jobRole}</div>
                               <div className="text-[10px] font-black text-indigo-400 tabular-nums">{res.ats_score}</div>
                            </div>
                            <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{new Date(res.timestamp).toLocaleDateString()}</div>
                         </div>
                      ))}
                   </div>
                 )}
              </div>
              
              <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
                <button onClick={onStartInterview} className="w-full py-4 glass hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white transition-all">Launch Interview Lab</button>
                <button onClick={onGenerateRoadmap} className="w-full py-4 glass hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white transition-all">New Strategy Session</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
