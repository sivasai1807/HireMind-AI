
import React from 'react';
import { AppView } from '../types';

interface Props {
  onStartResume: () => void;
  onNavigate: (view: AppView) => void;
}

const LandingPage: React.FC<Props> = ({ onStartResume, onNavigate }) => {
  return (
    <div className="relative pt-16 pb-32 overflow-hidden">
      {/* Hero Visual Elements */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-12 animate-in fade-in slide-in-from-top-6 duration-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Professional Career Development
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-10 leading-[0.85] animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Secure Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-500">
              Next Career Step.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-16 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
            HireMind provides an advanced platform for resume optimization and realistic mock interviews designed to help you land top-tier roles.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-32 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-14 duration-1000 delay-300">
            <button 
              onClick={onStartResume}
              className="w-full sm:w-auto px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 flex items-center justify-center gap-5 group"
            >
              Analyze Resume <i className="fas fa-chevron-right group-hover:translate-x-1.5 transition-transform text-xs"></i>
            </button>
            <button 
              onClick={() => onNavigate('learning-path')}
              className="w-full sm:w-auto px-12 py-6 glass hover:bg-white/10 text-white rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-5 group"
            >
              View Roadmaps <i className="fas fa-arrow-right text-xs text-indigo-400 group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              id: 'resume',
              icon: "fa-file-signature",
              title: "Resume Audit",
              desc: "Get detailed feedback on your resume based on current industry benchmarks and ATS requirements.",
              accent: "border-indigo-500/20",
              iconColor: "text-indigo-400"
            },
            {
              id: 'interview',
              icon: "fa-comments",
              title: "Mock Interviews",
              desc: "Practice with realistic mock interviews in voice, video, or text modes with professional feedback.",
              accent: "border-emerald-500/20",
              iconColor: "text-emerald-400"
            },
            {
              id: 'learning-path',
              icon: "fa-road",
              title: "Career Roadmap",
              desc: "Receive a personalized action plan to address your specific skill gaps and career goals.",
              accent: "border-purple-500/20",
              iconColor: "text-purple-400"
            }
          ].map((f, i) => (
            <div 
              key={i} 
              onClick={() => onNavigate(f.id as AppView)}
              className={`p-12 glass rounded-[3rem] border-2 ${f.accent} hover:bg-white/5 cursor-pointer transition-all hover:-translate-y-3 group relative overflow-hidden`}
            >
              <div className="absolute -right-8 -bottom-8 text-white/[0.03] text-[12rem] transition-all group-hover:scale-110 group-hover:text-white/[0.06] -rotate-12">
                <i className={`fas ${f.icon}`}></i>
              </div>
              
              <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ${f.iconColor} text-3xl mb-10 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner`}>
                <i className={`fas ${f.icon}`}></i>
              </div>
              
              <h3 className="text-2xl font-black mb-5 uppercase tracking-tight text-white">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-base font-medium mb-10">{f.desc}</p>
              
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity">
                Get Started <i className="fas fa-arrow-right-long text-[10px]"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
