
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
  
  const evaluation = activeInterview?.evaluation || null;

  const filteredResumeHistory = useMemo(() => {
    return resumeHistory.filter(r => r.jobRole.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [resumeHistory, searchTerm]);

  const filteredInterviewHistory = useMemo(() => {
    return interviewHistory.filter(i => 
      i.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.techStack.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interviewHistory, searchTerm]);

  const renderGrowthAnalytics = () => {
    const hasResumeTrend = resumeHistory.length >= 2;
    const hasInterviewTrend = interviewHistory.length >= 2;

    if (!hasResumeTrend && !hasInterviewTrend) return null;

    const viewBoxW = 1000;
    const viewBoxH = 200;
    const padding = 40;

    const getPoints = (data: { timestamp: number, score: number }[]) => {
      const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
      return sorted.map((d, i) => {
        const x = (i / (sorted.length - 1 || 1)) * (viewBoxW - padding * 2) + padding;
        const y = viewBoxH - (d.score / (data[0] && 'technical_score' in data[0] ? 10 : 100)) * (viewBoxH - padding * 2) - padding;
        return { x, y, score: d.score, date: new Date(d.timestamp).toLocaleDateString() };
      });
    };

    const resumePoints = getPoints(resumeHistory.map(r => ({ timestamp: r.timestamp, score: r.ats_score })));
    const interviewPoints = getPoints(interviewHistory.map(i => ({ 
      timestamp: i.timestamp, 
      score: (i.evaluation.technical_score + i.evaluation.problem_solving_score + i.evaluation.communication_score + i.evaluation.confidence_score) / 4 
    })));

    const generatePath = (pts: any[]) => {
      if (pts.length < 2) return "";
      return pts.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const cp1x = a[i - 1].x + (p.x - a[i - 1].x) / 2;
        return `${acc} C ${cp1x} ${a[i - 1].y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`;
      }, "");
    };

    return (
      <section className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 overflow-hidden relative group shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
          <i className="fas fa-chart-line text-8xl text-indigo-500"></i>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <i className="fas fa-chart-area text-indigo-400"></i> Performance Intelligence
            </h2>
            <p className="text-sm text-slate-400">Visualization of your career progression and skill maturation over time.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ATS score trend</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Interview avg trend</span>
            </div>
          </div>
        </div>

        <div className="relative h-48 md:h-64 z-10">
          <svg viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} className="w-full h-full overflow-visible drop-shadow-2xl">
            {[0, 25, 50, 75, 100].map(v => (
              <line 
                key={v} 
                x1={padding} 
                x2={viewBoxW - padding} 
                y1={viewBoxH - (v / 100) * (viewBoxH - padding * 2) - padding} 
                y2={viewBoxH - (v / 100) * (viewBoxH - padding * 2) - padding} 
                className="stroke-white/5 stroke-1"
              />
            ))}

            {resumePoints.length >= 2 && (
              <>
                <path d={generatePath(resumePoints)} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" className="drop-shadow-[0_0_12px_rgba(99,102,241,0.3)]" />
                {resumePoints.map((p, i) => (
                  <g key={i} className="group/pt">
                    <circle cx={p.x} cy={p.y} r="6" className="fill-indigo-500 stroke-[#0a0a0b] stroke-[3px] transition-all group-hover/pt:r-8 cursor-pointer" />
                    <text x={p.x} y={p.y - 15} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold opacity-0 group-hover/pt:opacity-100 transition-opacity">{p.score}%</text>
                  </g>
                ))}
              </>
            )}

            {interviewPoints.length >= 2 && (
              <>
                <path d={generatePath(interviewPoints)} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="8,4" className="drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
                {interviewPoints.map((p, i) => (
                  <g key={i} className="group/pt">
                    <circle cx={p.x} cy={p.y} r="6" className="fill-emerald-500 stroke-[#0a0a0b] stroke-[3px] transition-all group-hover/pt:r-8 cursor-pointer" />
                    <text x={p.x} y={p.y - 15} textAnchor="middle" className="fill-emerald-400 text-[10px] font-bold opacity-0 group-hover/pt:opacity-100 transition-opacity">{p.score.toFixed(1)}/10</text>
                  </g>
                ))}
              </>
            )}
          </svg>
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="animate-in slide-in-from-left duration-700">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Career Intelligence</h1>
          <p className="text-slate-400">
            {activeInterview ? (
              <>Session Detail: <span className="text-indigo-400 font-bold">{activeInterview.jobRole}</span> • <span className="text-slate-500">{new Date(activeInterview.timestamp).toLocaleDateString()}</span></>
            ) : (
              <>Global Metrics for <span className="text-indigo-400 font-bold">{jobRole || 'Global'}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 animate-in slide-in-from-right duration-700">
          <button 
            onClick={onStartInterview}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-3 group"
          >
            <i className="fas fa-plus-circle text-indigo-400 group-hover:rotate-90 transition-transform"></i> New Session
          </button>
          <button 
            onClick={onGenerateRoadmap}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95"
          >
            <i className="fas fa-compass"></i> Growth Roadmap
          </button>
        </div>
      </div>

      {renderGrowthAnalytics()}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Resume Analysis Card */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 -rotate-12 translate-x-12 -translate-y-12 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-black flex items-center gap-4">
                <i className="fas fa-file-invoice text-indigo-400"></i> Content Scorecard
              </h2>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-black tabular-nums transition-colors duration-500 ${
                  (activeResume?.ats_score || 0) > 80 ? 'text-green-400' : (activeResume?.ats_score || 0) > 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {activeResume?.ats_score || 0}<span className="text-lg opacity-40 ml-1">/100</span>
                </div>
              </div>
            </div>

            {!activeResume ? (
              <div className="text-center py-20 text-slate-600 border border-dashed border-white/5 rounded-3xl bg-black/20">
                <div className="text-5xl mb-6 opacity-20"><i className="fas fa-file-shield"></i></div>
                <p className="font-bold text-lg">No active analysis found</p>
                <p className="text-sm">Initiate an ATS scan to generate a professional scorecard.</p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-black text-white mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <i className="fas fa-tag"></i> Keyword Saturation
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeResume.missing_keywords.length > 0 ? activeResume.missing_keywords.map((k, i) => (
                          <span key={i} className="px-3 py-1.5 bg-red-400/5 text-red-400 rounded-xl text-[10px] border border-red-400/10 font-black uppercase tracking-wider">{k}</span>
                        )) : <span className="text-xs text-green-400 font-bold bg-green-400/5 px-3 py-1.5 rounded-xl border border-green-400/10">Optimum keyword density achieved.</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-white mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <i className="fas fa-bolt"></i> Strategic Improvements
                      </h4>
                      <ul className="space-y-4">
                        {activeResume.improvement_suggestions.map((s, i) => (
                          <li key={i} className="flex gap-4 text-sm text-slate-400 leading-relaxed group/item">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover/item:bg-indigo-500/20 transition-colors">
                                <i className="fas fa-chevron-right text-indigo-400 text-[10px]"></i>
                            </div>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-black/30 p-8 rounded-3xl border border-white/5 shadow-inner backdrop-blur-sm">
                    <h4 className="font-black text-white mb-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                      <i className="fas fa-sparkles text-indigo-400"></i> AI Optimized Variants
                    </h4>
                    <div className="space-y-5">
                      {activeResume.rewritten_bullets.map((b, i) => (
                        <div key={i} className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-[11px] italic text-slate-300 leading-relaxed border-l-4 border-l-indigo-600 shadow-sm hover:translate-x-1 transition-transform cursor-default">
                          "{b}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Interview Evaluation Card */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-black flex items-center gap-4">
                <i className="fas fa-brain text-indigo-400"></i> Technical Evaluation
              </h2>
              {activeInterview && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowTranscript(false)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${!showTranscript ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}
                  >
                    Analytics
                  </button>
                  <button 
                    onClick={() => setShowTranscript(true)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${showTranscript ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}
                  >
                    Transcript
                  </button>
                </div>
              )}
            </div>

            {!evaluation ? (
              <div className="text-center py-20 text-slate-600 border border-dashed border-white/5 rounded-3xl bg-black/20">
                <div className="text-5xl mb-6 opacity-20"><i className="fas fa-microphone-slash"></i></div>
                <p className="font-bold text-lg">No session data available</p>
                <p className="text-sm">Record a mock interview to evaluate your technical competencies.</p>
              </div>
            ) : showTranscript ? (
              <div className="bg-black/40 border border-white/5 rounded-3xl p-8 h-[500px] overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10 animate-in fade-in duration-300">
                {activeInterview?.transcript.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex flex-col max-w-[85%] group/msg">
                        <div className="flex items-center gap-2 mb-1.5 px-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{m.role}</span>
                            <span className="text-[8px] text-slate-600 font-medium opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
                        m.role === 'interviewer' ? 'bg-white/5 border border-white/5 text-slate-200' : 'bg-indigo-600 text-white font-medium'
                        }`}>
                        {m.text}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Technical", score: evaluation.technical_score, icon: 'fa-code', color: 'text-indigo-400' },
                    { label: "Soft Skills", score: evaluation.communication_score, icon: 'fa-user-group', color: 'text-emerald-400' },
                    { label: "Reasoning", score: evaluation.problem_solving_score, icon: 'fa-microchip', color: 'text-amber-400' },
                    { label: "Delivery", score: evaluation.confidence_score, icon: 'fa-shield-heart', color: 'text-rose-400' }
                  ].map((stat, i) => (
                    <div key={i} className="p-5 bg-black/40 border border-white/5 rounded-2xl text-center group/stat hover:border-indigo-500/30 transition-all">
                      <div className="text-[9px] text-slate-500 mb-3 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <i className={`fas ${stat.icon} text-[10px]`}></i> {stat.label}
                      </div>
                      <div className={`text-3xl font-black ${stat.color} group-hover/stat:scale-110 transition-transform tabular-nums`}>{stat.score}<span className="text-sm opacity-30">/10</span></div>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-600/5 p-8 rounded-3xl border border-indigo-500/10 relative group-hover:bg-indigo-600/10 transition-colors">
                  <i className="fas fa-quote-right absolute top-6 right-6 opacity-5 text-6xl rotate-12"></i>
                  <h4 className="font-black text-white mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Recruiter Feedback</h4>
                  <p className="text-slate-200 text-lg leading-relaxed italic font-medium">"{evaluation.overall_feedback}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <h4 className="font-black text-emerald-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                      <i className="fas fa-circle-check text-xs"></i> Competitive Advantages
                    </h4>
                    <ul className="space-y-3">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-3 leading-relaxed">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-5">
                    <h4 className="font-black text-rose-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                      <i className="fas fa-circle-exclamation text-xs"></i> Strategic Weaknesses
                    </h4>
                    <ul className="space-y-3">
                      {evaluation.weaknesses.map((t, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-3 leading-relaxed">
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Improved History Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-full max-h-[1000px] flex flex-col shadow-2xl">
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Activity Archive</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md font-bold">{resumeHistory.length + interviewHistory.length}</span>
              </div>
              <div className="relative group">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors"></i>
                <input 
                  type="text" 
                  placeholder="Filter sessions..." 
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-indigo-500/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-10 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 flex-grow">
              {/* Resume History List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resumes</span>
                </div>
                {filteredResumeHistory.length === 0 ? (
                  <div className="text-[10px] text-slate-600 italic px-2">No profiles found.</div>
                ) : (
                  filteredResumeHistory.map((res) => (
                    <div 
                      key={res.id}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                        activeResume?.id === res.id 
                          ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl' 
                          : 'bg-black/20 border-white/5 hover:border-white/20'
                      }`}
                      onClick={() => onSelectResume(res)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-[11px] text-white truncate max-w-[100px] group-hover:text-indigo-400 transition-colors">{res.jobRole}</div>
                        <div className={`text-[10px] font-black ${res.ats_score > 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {res.ats_score}%
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                          <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{new Date(res.timestamp).toLocaleDateString()}</div>
                          {res.ats_score >= 85 && <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-sm uppercase">Optimized</span>}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteResume(res.id); }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-rose-500/10 text-rose-400 rounded-full hover:bg-rose-500/20 transition-all border border-rose-500/20 shadow-lg"
                      >
                        <i className="fas fa-trash text-[8px]"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Interview History List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mock Sessions</span>
                </div>
                {filteredInterviewHistory.length === 0 ? (
                  <div className="text-[10px] text-slate-600 italic px-2">No sessions recorded.</div>
                ) : (
                  filteredInterviewHistory.map((session) => (
                    <div 
                      key={session.id}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                        activeInterview?.id === session.id 
                          ? 'bg-emerald-600/10 border-emerald-500/40 shadow-xl' 
                          : 'bg-black/20 border-white/5 hover:border-white/20'
                      }`}
                      onClick={() => onSelectSession(session)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-[11px] text-white truncate max-w-[100px] group-hover:text-emerald-400 transition-colors">{session.jobRole}</div>
                        <div className="text-[10px] text-indigo-400 font-black tabular-nums">
                          {((session.evaluation.technical_score + session.evaluation.problem_solving_score) / 2).toFixed(1)}/10
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 mb-2 truncate font-medium">{session.techStack}</div>
                      <div className="flex items-center justify-between">
                          <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{new Date(session.timestamp).toLocaleDateString()}</div>
                          {session.evaluation.technical_score >= 8 && <i className="fas fa-medal text-amber-500 text-[10px]" title="Elite Performance"></i>}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-rose-500/10 text-rose-400 rounded-full hover:bg-rose-500/20 transition-all border border-rose-500/20 shadow-lg"
                      >
                        <i className="fas fa-trash text-[8px]"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
