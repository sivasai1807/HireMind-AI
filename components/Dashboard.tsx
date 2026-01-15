
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
      {/* Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-white tracking-tighter">Success Dashboard</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Performance Metrics & Growth History
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onStartInterview} 
            className="px-8 py-4 glass hover:bg-white/10 border-indigo-500/30 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-4 group shadow-xl"
          >
            <i className="fas fa-microphone-lines text-[10px]"></i> Interview Lab
          </button>
          <button 
            onClick={onGenerateRoadmap} 
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase shadow-2xl shadow-indigo-600/40 transition-all flex items-center gap-4 active:scale-95"
          >
            <i className="fas fa-plus text-[10px]"></i> New Strategy
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Main Display Column */}
        <div className="lg:col-span-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`glass p-10 rounded-[3rem] border-indigo-500/10 transition-all relative overflow-hidden ${!activeResume ? 'opacity-40 grayscale' : 'glow-indigo'}`}>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Resume Match</h4>
              <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                {activeResume?.ats_score || 0}<span className="text-xl opacity-20">/100</span>
              </div>
            </div>
            
            <div className={`glass p-10 rounded-[3rem] border-emerald-500/10 transition-all ${!activeInterview ? 'opacity-40 grayscale' : 'glow-emerald'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Interview Rank</h4>
               <div className="text-6xl font-black text-emerald-400 tabular-nums tracking-tighter">
                  {evaluation ? (((evaluation.technical_score || 0) + (evaluation.communication_score || 0)) / 2).toFixed(1) : '0.0'}
               </div>
            </div>

            <div className={`glass p-10 rounded-[3rem] border-purple-500/10 transition-all ${!activeRoadmap ? 'opacity-40 grayscale' : 'glow-indigo'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Strategy Milestones</h4>
               <div className="text-6xl font-black text-purple-400 tabular-nums tracking-tighter">
                  {activeRoadmap?.milestones.length || 0}
               </div>
            </div>
          </div>

          <div className="glass rounded-[4rem] p-12 md:p-16 space-y-12 shadow-2xl border-white/[0.03]">
             {activeRoadmap ? (
                <div className="space-y-12 animate-in fade-in duration-500">
                   <header className="flex items-center justify-between gap-6 border-b border-white/5 pb-10">
                      <div className="space-y-2">
                         <h2 className="text-3xl font-black text-white tracking-tighter">Career Strategy: {activeRoadmap.field}</h2>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeRoadmap.estimated_days} Day Strategic Cycle</p>
                      </div>
                      <i className="fas fa-map-location-dot text-indigo-500 text-4xl opacity-30"></i>
                   </header>

                   <div className="space-y-8">
                      {activeRoadmap.milestones.slice(0, 3).map((m, idx) => (
                         <div key={idx} className="flex gap-8 group">
                            <div className="w-px bg-white/10 relative">
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-500 group-hover:scale-150 transition-all"></div>
                            </div>
                            <div className="pb-8">
                               <h5 className="text-xs font-black text-white mb-2 uppercase tracking-tight">Phase {m.week}: {m.topic}</h5>
                               <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{m.description.substring(0, 150)}...</p>
                            </div>
                         </div>
                      ))}
                      <div className="text-center pt-6">
                         <button onClick={() => onGenerateRoadmap()} className="px-8 py-4 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Launch Strategy Plan</button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
                  <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center text-slate-800 text-5xl float shadow-inner">
                    <i className="fas fa-map-marked-alt"></i>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-500 uppercase tracking-tighter">No Active Career Strategy</h3>
                    <p className="text-slate-600 text-sm max-w-sm font-medium">Define a strategic roadmap to visualize your professional development path.</p>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* Tactical History Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           <div className="glass rounded-[4rem] p-10 h-full min-h-[700px] flex flex-col shadow-2xl border-white/[0.03]">
              <div className="mb-10">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 ml-2">History Archive</h3>
                 <div className="relative group">
                    <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Search archive..." 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xs text-white outline-none focus:border-indigo-500/50 shadow-inner font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-10 pr-4 scrollbar-thin">
                 {/* Strategies */}
                 {filteredRoadmapHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400/40 px-3">Growth Strategies</h5>
                      {filteredRoadmapHistory.map(rd => (
                         <div key={rd.id} onClick={() => onSelectRoadmap(rd)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeRoadmap?.id === rd.id ? 'bg-purple-600/10 border-purple-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[12px] text-white tracking-tight uppercase truncate max-w-[140px]">{rd.field}</div>
                               <div className="text-[11px] font-black text-purple-400 tabular-nums">{rd.estimated_days}d</div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest">
                               <span>{new Date(rd.timestamp).toLocaleDateString()}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-purple-500 transition-opacity">View Strategy</span>
                            </div>
                         </div>
                      ))}
                   </div>
                 )}

                 {/* Mock Interviews */}
                 {filteredInterviewHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/40 px-3">Interview History</h5>
                      {filteredInterviewHistory.map(int => (
                         <div key={int.id} onClick={() => onSelectSession(int)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeInterview?.id === int.id ? 'bg-emerald-600/10 border-emerald-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[12px] text-white tracking-tight uppercase truncate max-w-[140px]">{int.jobRole}</div>
                               <div className="text-[11px] font-black text-emerald-400 tabular-nums">{(int.evaluation?.technical_score ?? 0).toFixed(1)}</div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest">
                               <span>{new Date(int.timestamp).toLocaleDateString()}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity">Full Record</span>
                            </div>
                         </div>
                      ))}
                   </div>
                 )}

                 {/* Resume Audits */}
                 {filteredResumeHistory.length > 0 && (
                   <div className="space-y-5">
                      <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/40 px-3">Resume Audit History</h5>
                      {filteredResumeHistory.map(res => (
                         <div key={res.id} onClick={() => onSelectResume(res)} className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${activeResume?.id === res.id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div className="font-black text-[12px] text-white tracking-tight uppercase truncate max-w-[140px]">{res.jobRole}</div>
                               <div className="text-[11px] font-black text-indigo-400 tabular-nums">{res.ats_score}</div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest">
                               <span>{new Date(res.timestamp).toLocaleDateString()}</span>
                               <span className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity">View Report</span>
                            </div>
                         </div>
                      ))}
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
