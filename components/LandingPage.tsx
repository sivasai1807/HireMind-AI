
import React from 'react';

interface Props {
  onStartResume: () => void;
}

const LandingPage: React.FC<Props> = ({ onStartResume }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next-Gen Career Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            The AI That Gets You <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">
              Hired at FAANG.
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop guessing why you aren't getting callbacks. HireMind AI scans your resume like a top recruiter and trains you like a senior engineer.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStartResume}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3"
            >
              Scan My Resume <i className="fas fa-arrow-right"></i>
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-lg transition-all">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {[
            {
              icon: "fa-rocket",
              title: "ATS Optimization",
              desc: "Deep scan against role-specific keywords and structure patterns used by top product companies."
            },
            {
              icon: "fa-comments",
              title: "Mock Interviews",
              desc: "Real-time voice/text interviews with adaptive difficulty that feels like the real thing."
            },
            {
              icon: "fa-map",
              title: "30-Day Roadmaps",
              desc: "Personalized learning paths generated from your unique skill gaps and interview performance."
            }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-2 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <i className={`fas ${f.icon}`}></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
