
import React, { useState } from 'react';
import { gemini } from '../services/geminiService';
import { LearningRoadmap } from '../types';

interface Props {
  onRoadmapComplete: (roadmap: LearningRoadmap) => void;
}

const LearningPathTool: React.FC<Props> = ({ onRoadmapComplete }) => {
  const [field, setField] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LearningRoadmap | null>(null);

  const handleGenerate = async () => {
    if (!field || !goal) return alert("Please specify the field and your career goal.");
    setLoading(true);
    try {
      const roadmapData = await gemini.generateCustomRoadmap(field, goal);
      const fullRoadmap: LearningRoadmap = {
        ...roadmapData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        field,
        goal,
      } as LearningRoadmap;
      
      setResult(fullRoadmap);
      onRoadmapComplete(fullRoadmap);
    } catch (error) {
      alert("Failed to generate your strategic path. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-12 duration-700">
        <div className="flex flex-col gap-12">
          {/* Header Stats */}
          <div className="glass rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-indigo-500/20 glow-indigo">
             <div className="space-y-2 text-center md:text-left">
                <h2 className="text-4xl font-black text-white tracking-tighter">Career Strategy</h2>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">
                  Strategic Focus: <span className="text-indigo-400">{result.field}</span>
                </p>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-center px-6 border-r border-white/10">
                   <div className="text-4xl font-black text-indigo-400 tabular-nums">{result.estimated_days}</div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Days</div>
                </div>
                <button onClick={() => setResult(null)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">New Strategy</button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
             {/* Left Column: Timeline */}
             <div className="lg:col-span-8 space-y-12">
                <div className="relative space-y-10 pl-10 md:pl-0">
                   <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/40 via-emerald-500/40 to-transparent hidden md:block"></div>
                   
                   {result.milestones.map((milestone, idx) => (
                      <div key={idx} className={`flex flex-col md:flex-row items-center gap-8 relative z-10 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                         <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full glass border-2 border-indigo-500 items-center justify-center bg-[#030712] shadow-xl">
                            <span className="text-[10px] font-black text-white">{milestone.week}</span>
                         </div>
                         <div className="w-full md:w-[45%]">
                            <div className="glass p-8 rounded-[2.5rem] border-l-4 border-l-indigo-500 hover:bg-white/5 transition-all group">
                               <h3 className="text-xl font-black text-white mb-4">Phase {milestone.week}: {milestone.topic}</h3>
                               <p className="text-sm text-slate-400 mb-6 leading-relaxed font-medium">{milestone.description}</p>
                               <ul className="space-y-3 mb-6">
                                  {milestone.tasks.map((task, tidx) => (
                                     <li key={tidx} className="flex items-start gap-3 text-xs text-slate-300">
                                        <i className="fas fa-check-circle text-indigo-500 mt-0.5 opacity-60"></i>
                                        <span>{task}</span>
                                     </li>
                                  ))}
                               </ul>
                               <div className="flex flex-wrap gap-2">
                                  {milestone.resources.map((res, ridx) => (
                                     <a key={ridx} href={res.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                        {res.title}
                                     </a>
                                  ))}
                               </div>
                            </div>
                         </div>
                         <div className="hidden md:block w-[45%]"></div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Right Column: Projects & Companies */}
             <div className="lg:col-span-4 space-y-12">
                <section className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 px-2 flex items-center gap-3">
                      <i className="fas fa-rocket"></i> Tactical Projects
                   </h4>
                   <div className="space-y-4">
                      {result.project_suggestions.map((proj, idx) => (
                         <div key={idx} className="glass p-6 rounded-[2rem] border-white/5 hover:bg-white/5 transition-all group">
                            <h5 className="text-sm font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{proj.name}</h5>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">{proj.description}</p>
                            <div className="flex flex-wrap gap-2">
                               {proj.tech_stack.map((tech, tidx) => (
                                  <span key={tidx} className="text-[8px] font-black text-slate-400 bg-white/5 px-2 py-1 rounded uppercase tracking-widest">{tech}</span>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 px-2 flex items-center gap-3">
                      <i className="fas fa-landmark"></i> Industry Alignment
                   </h4>
                   <div className="space-y-4">
                      {result.hiring_companies.map((company, idx) => (
                         <div key={idx} className="glass p-6 rounded-[2rem] border-white/5 flex items-center justify-between group">
                            <div className="space-y-1">
                               <div className="text-xs font-black text-white">{company.name}</div>
                               <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{company.industry}</div>
                            </div>
                            <div className="text-right">
                               <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target Roles</div>
                               <div className="text-[9px] text-slate-400 font-medium">{company.typical_roles[0]}</div>
                            </div>
                         </div>
                      ))}
                   </div>
                </section>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
       <div className="glass rounded-[4rem] p-12 md:p-20 relative overflow-hidden shadow-2xl border-white/[0.03]">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-50"></div>
          
          <header className="mb-16">
             <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Career Strategy</h2>
             <p className="text-slate-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                AI-Driven Strategic Orchestration
             </p>
          </header>

          <div className="space-y-10">
             <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Objective Field</label>
                <div className="relative group">
                  <i className="fas fa-map-location-dot absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="text" 
                    placeholder="e.g. Lead Frontend Engineer, Principal Architect" 
                    className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] pl-16 pr-8 py-5 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" 
                    value={field} 
                    onChange={(e) => setField(e.target.value)} 
                  />
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Career Goal & Timeline</label>
                <textarea 
                  rows={4}
                  placeholder="Where are you now, and what is your desired outcome? (e.g. 'I want to transition from Mid-level to Senior Backend in 6 months')" 
                  className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-8 py-6 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-400 text-sm leading-relaxed" 
                  value={goal} 
                  onChange={(e) => setGoal(e.target.value)} 
                />
             </div>

             <button 
                onClick={handleGenerate} 
                disabled={loading} 
                className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs tracking-[0.4em] uppercase transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
             >
                {loading ? (
                   <span className="flex items-center justify-center gap-4">
                      <i className="fas fa-circle-notch animate-spin"></i> Orchestrating Strategy
                   </span>
                ) : 'Generate Professional Strategy'}
             </button>
          </div>
       </div>
    </div>
  );
};

export default LearningPathTool;
