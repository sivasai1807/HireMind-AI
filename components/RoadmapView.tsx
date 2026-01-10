
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
      const resumeGaps = atsAnalysis?.improvement_suggestions.join(', ') || 'No resume scan performed';
      const interviewGaps = evaluation?.weaknesses.join(', ') || 'No mock interview performed';
      const result = await gemini.generateRoadmap(jobRole, resumeGaps, interviewGaps);
      setRoadmap(result);
    } catch (error) {
      console.error(error);
      alert("Failed to generate roadmap.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roadmap && (atsAnalysis || evaluation)) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 min-h-[600px]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">30-Day Growth Roadmap</h2>
            <p className="text-slate-400">Customized strategy for <span className="text-indigo-400">{jobRole}</span></p>
          </div>
          <button 
            onClick={generate}
            disabled={loading}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <i className="fas fa-compass fa-spin text-4xl text-indigo-500"></i>
            <p className="text-slate-500 animate-pulse">Mapping your career trajectory...</p>
          </div>
        ) : !roadmap ? (
          <div className="text-center py-20">
            <p className="text-slate-500 mb-6">Complete a resume scan or mock interview to unlock your roadmap.</p>
            <button 
              onClick={generate}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              Generate Anyway
            </button>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none prose-indigo">
            <div className="whitespace-pre-wrap text-slate-300 leading-loose">
              {roadmap.split('Week').map((week, i) => {
                if (!week.trim()) return null;
                return (
                  <div key={i} className="mb-10 bg-black/20 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-indigo-500 pl-4">Week {week.split(':')[0]}</h3>
                    <div className="pl-8 space-y-4">
                      {week.split('\n').slice(1).map((line, li) => (
                        <div key={li} className="text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadmapView;
