
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeTool from './components/ResumeTool';
import InterviewTool from './components/InterviewTool';
import LearningPathTool from './components/LearningPathTool';
import Dashboard from './components/Dashboard';
import QuestionsBank from './components/QuestionsBank';
import { AppView, AtsAnalysis, InterviewEvaluation, Message, SavedInterview, SavedResumeAnalysis, LearningRoadmap } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [jobRole, setJobRole] = useState<string>('');
  const [techStack, setTechStack] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  
  const HISTORY_KEY = 'hiremind_history_v4';
  const RESUME_HISTORY_KEY = 'hiremind_resume_history_v4';
  const ROADMAP_HISTORY_KEY = 'hiremind_roadmap_history_v4';

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

  const navOptions = [
    { id: 'resume', label: 'Resume Audit' },
    { id: 'interview', label: 'Interview Lab' },
    { id: 'learning-path', label: 'Career Strategy' },
    { id: 'questions-bank', label: 'Question Bank' }
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      <header className="sticky top-0 z-[100] border-b border-white/5 bg-[#030712]/95 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <i className="fas fa-brain"></i>
            </div>
            <span className="hidden xs:inline">HireMind</span>
          </button>
          
          <nav className="flex items-center gap-1 sm:gap-4">
            {navOptions.map((v) => (
              <button 
                key={v.id}
                onClick={() => navigate(v.id as AppView)} 
                className={`px-3 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group ${view === v.id ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                {v.label}
                {view === v.id && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500"></span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center">
            <button 
              onClick={() => navigate('dashboard')} 
              className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl transition-all border ${view === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent'}`}
            >
              <i className="fas fa-chart-pie text-sm"></i>
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Board</span>
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
        {view === 'learning-path' && <LearningPathTool onRoadmapComplete={handleRoadmapComplete} />}
        {view === 'questions-bank' && <QuestionsBank onNavigate={navigate} />}
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

      <footer className="border-t border-white/5 py-12 bg-[#030712]/60">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-xl font-black mb-4 tracking-tighter text-white">HireMind AI</div>
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em]">Strategic Career Orchestration Systems</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
