
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeTool from './components/ResumeTool';
import InterviewTool from './components/InterviewTool';
import LearningPathTool from './components/LearningPathTool';
import Dashboard from './components/Dashboard';
import { AppView, AtsAnalysis, InterviewEvaluation, Message, SavedInterview, SavedResumeAnalysis, LearningRoadmap } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
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

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      <header className="sticky top-0 z-[100] border-b border-white/5 bg-[#030712]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <i className="fas fa-briefcase"></i>
            </div>
            <span>HireMind</span>
          </button>
          
          <nav className="hidden xl:flex items-center gap-10">
            {[
              { id: 'resume', label: 'Resume Audit' },
              { id: 'interview', label: 'Mock Interview' },
              { id: 'learning-path', label: 'Career Strategy' }
            ].map((v) => (
              <button 
                key={v.id}
                onClick={() => navigate(v.id as AppView)} 
                className={`text-[10px] font-black uppercase tracking-[0.25em] transition-all hover:text-white relative group py-2 ${view === v.id ? 'text-indigo-400' : 'text-slate-500'}`}
              >
                {v.label}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all duration-300 ${view === v.id ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('dashboard')} 
              className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
            >
              <i className="fas fa-chart-line text-sm"></i>
              <span className="hidden lg:inline text-[9px] font-black uppercase tracking-widest">Dashboard</span>
            </button>
            
            <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

            <button 
              onClick={() => navigate('resume')} 
              className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
            >
              Audit Resume
            </button>
            
            <button 
              onClick={() => navigate('interview')} 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
            >
              Start Practice
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
          <div className="text-2xl font-black mb-4 tracking-tighter">HireMind</div>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-10 font-medium">Precision tools for modern career development and FAANG-level recruitment readiness.</p>
          <div className="flex justify-center gap-8 mb-12">
            {['linkedin', 'twitter', 'github'].map(social => (
              <i key={social} className={`fab fa-${social} text-slate-500 hover:text-white text-xl cursor-pointer transition-colors`}></i>
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} HireMind Career Systems. Professional Growth Excellence.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
