
import React from 'react';

interface Props {
  onStartResume: () => void;
}

const LandingPage: React.FC<Props> = ({ onStartResume }) => {
  return (
    <div className="relative pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Intelligence-Powered Careers
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-white mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Decode Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-500">
              Future Status.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            Beyond templates. Beyond advice. HireMind AI is a professional neural framework for ATS domination and senior-level interview readiness.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <button 
              onClick={onStartResume}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 flex items-center justify-center gap-4 group"
            >
              Start Neural Scan <i className="fas fa-bolt group-hover:translate-x-1 transition-transform"></i>
            </button>
            <button className="w-full sm:w-auto px-10 py-5 glass hover:bg-white/10 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-4">
              Explore Alpha <i className="fas fa-terminal"></i>
            </button>
          </div>
        </div>

        {/* Feature Grid with Bento-ish style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "fa-shield-halved",
              title: "ATS Cryptography",
              desc: "Mapping your resume against proprietary recruiter ranking algorithms used by global tech leaders.",
              color: "border-indigo-500/20"
            },
            {
              icon: "fa-satellite-dish",
              title: "Live Simulation",
              desc: "High-latency neural mock sessions via voice, video, or encrypted text to sharpen technical delivery.",
              color: "border-emerald-500/20"
            },
            {
              icon: "fa-dna",
              title: "Skill Roadmaps",
              desc: "Evolutionary growth paths generated from the gaps in your technical DNA and communication style.",
              color: "border-purple-500/20"
            }
          ].map((f, i) => (
            <div key={i} className={`p-10 glass rounded-3xl border-2 ${f.color} hover:bg-white/5 transition-all hover:-translate-y-2 group relative overflow-hidden`}>
              <div className="absolute -right-4 -bottom-4 text-white/5 text-8xl transition-all group-hover:scale-110 group-hover:text-white/10">
                <i className={`fas ${f.icon}`}></i>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-2xl mb-8 group-hover:bg-indigo-600 transition-all">
                <i className={`fas ${f.icon}`}></i>
              </div>
              <h3 className="text-xl font-black mb-4 uppercase tracking-tight text-white">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
