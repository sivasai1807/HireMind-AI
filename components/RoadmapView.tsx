
import React, { useState, useEffect } from 'react';
import { gemini } from '../services/geminiService';
import { AtsAnalysis, InterviewEvaluation } from '../types';

interface Props {
  jobRole: string;
  atsAnalysis: AtsAnalysis | null;
  evaluation: InterviewEvaluation | null;
  roadmap: string;
  setRoadmap: (roadmap: string) => void;
}

const RoadmapView: React.FC<Props> = ({ jobRole, atsAnalysis, evaluation, roadmap, setRoadmap }) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const resumeGaps = atsAnalysis?.improvement_suggestions.join(', ') || 'No specific gaps identified';
      const interviewGaps = evaluation?.weaknesses.join(', ') || 'No interview weaknesses identified';
      const result = await gemini.generateRoadmap(jobRole, resumeGaps, interviewGaps);
      setRoadmap(result);
    } catch (error) {
      console.error(error);
      alert("Failed to generate career strategy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roadmap && (atsAnalysis || evaluation)) {
      generate();
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="glass rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <i className="fas fa-road text-[15rem] -rotate-12"></i>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8 relative z-10">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Career Roadmap</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="text-indigo-400">Target Role:</span> {jobRole}
            </p>
          </div>
          <button 
            onClick={generate}
            disabled={loading}
            className="px-8 py-4 glass hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all disabled:opacity-50 active:scale-95 flex items-center gap-3"
          >
            {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-sync"></i>}
            Refresh Strategy
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 animate-pulse">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 text-3xl">
               <i className="fas fa-map-marked-alt animate-bounce"></i>
            </div>
            <div className="text-center">
               <p className="text-white font-bold text-lg mb-1">Building Your Career Plan...</p>
               <p className="text-slate-500 text-sm">Organizing actionable steps for your professional growth.</p>
            </div>
          </div>
        ) : !roadmap ? (
          <div className="text-center py-32 glass border-dashed border-white/10 rounded-[2rem]">
            <i className="fas fa-info-circle text-slate-700 text-5xl mb-6"></i>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Please complete a resume review or mock interview session to unlock your personalized roadmap.</p>
            <button 
              onClick={generate}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Generate Roadmap
            </button>
          </div>
        ) : (
          <div className="relative space-y-12">
            {/* Timeline Vertical Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/40 via-emerald-500/40 to-transparent hidden md:block"></div>

            {roadmap.split('Week').filter(w => w.trim()).map((week, i) => (
              <div key={i} className={`flex flex-col md:flex-row items-center gap-10 relative z-10 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Timeline Dot */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full glass border-2 border-indigo-500 items-center justify-center bg-[#030712] shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                   <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>

                <div className="w-full md:w-[45%] group">
                  <div className="glass p-8 rounded-[2rem] border-l-4 border-l-indigo-600 transition-all hover:-translate-y-1 hover:bg-white/5">
                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                      <span className="text-indigo-400 opacity-40">0{i+1}</span>
                      Week {week.split(':')[0]}
                    </h3>
                    <div className="space-y-4">
                      {week.split('\n').slice(1).map((line, li) => (
                        line.trim() && (
                          <div key={li} className="flex gap-4 group/item">
                            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-1 group-hover/item:bg-indigo-600 transition-colors">
                               <i className="fas fa-check text-[8px] text-white"></i>
                            </div>
                            <p className="text-sm text-slate-400 group-hover/item:text-slate-200 transition-colors leading-relaxed">{line.replace(/^[-*]\s*/, '')}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Empty spacer */}
                <div className="hidden md:block w-[45%]"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadmapView;
