
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeTool from './components/ResumeTool';
import InterviewTool from './components/InterviewTool';
import LearningPathTool from './components/LearningPathTool';
import Dashboard from './components/Dashboard';
import { AppView, AtsAnalysis, InterviewEvaluation, Message, SavedInterview, SavedResumeAnalysis, LearningRoadmap } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jobRole, setJobRole] = useState<string>('');
  const [techStack, setTechStack] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  
  const HISTORY_KEY = 'hiremind_history';
  const RESUME_HISTORY_KEY = 'hiremind_resume_history';
  const ROADMAP_HISTORY_KEY = 'hiremind_roadmap_history';

  const [resumeHistory, setResumeHistory] = useState<SavedResumeAnalysis[]>(() => {
    const saved = localStorage.getItem(RESUME_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeResume, setActiveResume] = useState<SavedResumeAnalysis | null>(
    resumeHistory.length > 0 ? resumeHistory[0] : null
  );

  const [interviewHistory, setInterviewHistory] = useState<SavedInterview[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeInterview, setActiveInterview] = useState<SavedInterview | null>(
    interviewHistory.length > 0 ? interviewHistory[0] : null
  );

  const [roadmapHistory, setRoadmapHistory] = useState<LearningRoadmap[]>(() => {
    const saved = localStorage.getItem(ROADMAP_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeRoadmap, setActiveRoadmap] = useState<LearningRoadmap | null>(
    roadmapHistory.length > 0 ? roadmapHistory[0] : null
  );

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(interviewHistory));
  }, [interviewHistory]);

  useEffect(() => {
    localStorage.setItem(RESUME_HISTORY_KEY, JSON.stringify(resumeHistory));
  }, [resumeHistory]);

  useEffect(() => {
    localStorage.setItem(ROADMAP_HISTORY_KEY, JSON.stringify(roadmapHistory));
  }, [roadmapHistory]);

  const navigate = useCallback((newView: AppView) => {
    setView(newView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResumeAnalysisComplete = (data: AtsAnalysis, role: string) => {
    const newAnalysis: SavedResumeAnalysis = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      jobRole: role
    };
    setResumeHistory(prev => [newAnalysis, ...prev]);
    setActiveResume(newAnalysis);
    setJobRole(role);
    navigate('dashboard');
  };

  const handleEvaluationComplete = (evalData: InterviewEvaluation, transcript: Message[], currentRole: string, currentStack: string) => {
    const newSession: SavedInterview = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      jobRole: currentRole || jobRole,
      techStack: currentStack || techStack,
      transcript,
      evaluation: evalData
    };
    
    setInterviewHistory(prev => [newSession, ...prev]);
    setActiveInterview(newSession);
    if (!jobRole && currentRole) setJobRole(currentRole);
    navigate('dashboard');
  };

  const handleRoadmapComplete = (roadmap: LearningRoadmap) => {
    setRoadmapHistory(prev => [roadmap, ...prev]);
    setActiveRoadmap(roadmap);
    navigate('learning-path');
  };

  const navOptions = [
    { id: 'resume', label: 'Resume Audit' },
    { id: 'interview', label: 'Interview Lab' },
    { id: 'learning-path', label: 'Career Strategy' }
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      {/* Dynamic Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-500 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setMobileMenuOpen(false)}></div>
        <div className={`absolute top-0 left-0 w-full glass-b border-b border-white/5 p-10 space-y-8 transition-transform duration-500 ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex justify-between items-center mb-10">
            <span className="text-xl font-black text-white tracking-tighter">Command Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><i className="fas fa-times"></i></button>
          </div>
          <div className="flex flex-col gap-4">
            {navOptions.map(opt => (
              <button 
                key={opt.id} 
                onClick={() => navigate(opt.id as AppView)}
                className={`w-full py-6 rounded-3xl text-left px-8 font-black uppercase tracking-widest text-xs transition-all ${view === opt.id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white/5 text-slate-400'}`}
              >
                {opt.label}
              </button>
            ))}
            <button 
              onClick={() => navigate('dashboard')}
              className={`w-full py-6 rounded-3xl text-left px-8 font-black uppercase tracking-widest text-xs transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white shadow-xl' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
            >
              Success Board
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-[100] border-b border-white/5 bg-[#030712]/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand */}
          <button onClick={() => navigate('landing')} className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <i className="fas fa-briefcase"></i>
            </div>
            <span>HireMind</span>
          </button>
          
          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {navOptions.map((v) => (
              <button 
                key={v.id}
                onClick={() => navigate(v.id as AppView)} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group ${view === v.id ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {v.label}
              </button>
            ))}
          </nav>

          {/* User History & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('dashboard')} 
              className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all border ${view === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent'}`}
            >
              <i className="fas fa-chart-line text-sm"></i>
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Success Board</span>
            </button>
            
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="lg:hidden w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
            >
              <i className="fas fa-bars-staggered"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {view === 'landing' && <LandingPage onStartResume={() => navigate('resume')} onNavigate={navigate} />}
        {view === 'resume' && <ResumeTool onAnalysisComplete={handleResumeAnalysisComplete} setResumeText={setResumeText} />}
        {view === 'interview' && (
          <InterviewTool 
            initialJobRole={jobRole} 
            initialTechStack={techStack} 
            onEvaluationComplete={handleEvaluationComplete} 
          />
        )}
        {view === 'learning-path' && (
          <LearningPathTool onRoadmapComplete={handleRoadmapComplete} />
        )}
        {view === 'dashboard' && (
          <Dashboard 
            activeResume={activeResume}
            resumeHistory={resumeHistory}
            activeInterview={activeInterview}
            interviewHistory={interviewHistory}
            activeRoadmap={activeRoadmap}
            roadmapHistory={roadmapHistory}
            onStartInterview={() => navigate('interview')}
            onGenerateRoadmap={() => navigate('learning-path')}
            onSelectSession={setActiveInterview}
            onDeleteSession={(id) => setInterviewHistory(h => h.filter(x => x.id !== id))}
            onSelectResume={setActiveResume}
            onDeleteResume={(id) => setResumeHistory(h => h.filter(x => x.id !== id))}
            onSelectRoadmap={setActiveRoadmap}
            onDeleteRoadmap={(id) => setRoadmapHistory(h => h.filter(x => x.id !== id))}
          />
        )}
      </main>

      <footer className="border-t border-white/5 py-16 bg-[#030712]/40">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl text-white">
              <i className="fas fa-briefcase"></i>
            </div>
          </div>
          <div className="text-2xl font-black mb-4 tracking-tighter">HireMind AI</div>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-10 font-medium leading-relaxed">Advanced career orchestration infrastructure for high-performance professional trajectory management.</p>
          <div className="flex justify-center gap-8 mb-12">
            {['linkedin', 'twitter', 'github'].map(social => (
              <i key={social} className={`fab fa-${social} text-slate-500 hover:text-white text-xl cursor-pointer transition-colors`}></i>
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} HireMind AI Systems. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
