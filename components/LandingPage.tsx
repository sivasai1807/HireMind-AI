
import React from 'react';
import { AppView } from '../types';

interface Props {
  onStartResume: () => void;
  onNavigate: (view: AppView) => void;
}

const LandingPage: React.FC<Props> = ({ onStartResume, onNavigate }) => {
  return (
    <div className="relative pt-16 pb-32 overflow-hidden">
      {/* Premium Visual Accents */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/5 blur-[150px] rounded-full -z-10 animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass border border-white/5 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-14 animate-in fade-in slide-in-from-top-10 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next-Gen Career Intelligence
          </div>
          
          <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter text-white mb-12 leading-[0.8] animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
            Perfect Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-emerald-400">
              Trajectory.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-20 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-14 duration-1000 delay-400">
            Advanced AI for professional resume optimization, simulated high-stakes interviews, and precise career strategy orchestration.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-40 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-600">
            <button 
              onClick={onStartResume}
              className="w-full sm:w-auto px-14 py-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 flex items-center justify-center gap-6 group"
            >
              Analyze Resume <i className="fas fa-arrow-right-long group-hover:translate-x-2 transition-transform opacity-60"></i>
            </button>
            <button 
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-14 py-7 glass hover:bg-white/10 text-white rounded-[2.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-6 group border border-white/5"
            >
              Access Board <i className="fas fa-chart-pie text-indigo-400 opacity-60 group-hover:scale-125 transition-transform"></i>
            </button>
          </div>
        </div>

        {/* Feature Grid - Non-Repetitive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              id: 'resume',
              icon: "fa-file-shield",
              title: "Resume Audit",
              desc: "Deep-tissue analysis for ATS performance and competitive benchmarking. Align your experience with target expectations.",
              accent: "border-indigo-500/10",
              iconBg: "bg-indigo-600/10",
              color: "text-indigo-400"
            },
            {
              id: 'interview',
              icon: "fa-microphone-lines",
              title: "Interview Lab",
              desc: "Professional simulation environment with real-time feedback loop. Master your technical and communication flow.",
              accent: "border-emerald-500/10",
              iconBg: "bg-emerald-600/10",
              color: "text-emerald-400"
            },
            {
              id: 'learning-path',
              icon: "fa-compass",
              title: "Career Strategy",
              desc: "Intelligent roadmap generation to visualize skill gaps and milestones. Orchestrate your professional evolution.",
              accent: "border-purple-500/10",
              iconBg: "bg-purple-600/10",
              color: "text-purple-400"
            }
          ].map((f, i) => (
            <div 
              key={i} 
              onClick={() => onNavigate(f.id as AppView)}
              className={`p-14 glass rounded-[4rem] border-2 ${f.accent} hover:bg-white/5 cursor-pointer transition-all hover:-translate-y-4 group relative overflow-hidden`}
            >
              <div className="absolute -right-12 -bottom-12 text-white/[0.02] text-[15rem] transition-all group-hover:scale-110 -rotate-12 group-hover:text-white/[0.04]">
                <i className={`fas ${f.icon}`}></i>
              </div>
              
              <div className={`w-20 h-20 rounded-3xl ${f.iconBg} flex items-center justify-center ${f.color} text-3xl mb-12 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl`}>
                <i className={`fas ${f.icon}`}></i>
              </div>
              
              <h3 className="text-3xl font-black mb-6 uppercase tracking-tight text-white">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed text-lg font-medium mb-12">{f.desc}</p>
              
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 group-hover:translate-x-2 transition-all">
                Launch System <i className="fas fa-chevron-right text-[8px]"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
