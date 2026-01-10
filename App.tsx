
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeTool from './components/ResumeTool';
import InterviewTool from './components/InterviewTool';
import Dashboard from './components/Dashboard';
import RoadmapView from './components/RoadmapView';
import { AppView, AtsAnalysis, InterviewEvaluation, Message, SavedInterview, SavedResumeAnalysis } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  
  // Shared State
  const [jobRole, setJobRole] = useState<string>('');
  const [techStack, setTechStack] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  
  // Persistence Keys
  const HISTORY_KEY = 'hiremind_history';
  const RESUME_HISTORY_KEY = 'hiremind_resume_history';

  // Resume History Management
  const [resumeHistory, setResumeHistory] = useState<SavedResumeAnalysis[]>(() => {
    const saved = localStorage.getItem(RESUME_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeResume, setActiveResume] = useState<SavedResumeAnalysis | null>(
    resumeHistory.length > 0 ? resumeHistory[0] : null
  );

  // Interview History Management
  const [interviewHistory, setInterviewHistory] = useState<SavedInterview[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeInterview, setActiveInterview] = useState<SavedInterview | null>(
    interviewHistory.length > 0 ? interviewHistory[0] : null
  );

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(interviewHistory));
  }, [interviewHistory]);

  useEffect(() => {
    localStorage.setItem(RESUME_HISTORY_KEY, JSON.stringify(resumeHistory));
  }, [resumeHistory]);

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

  const handleEvaluationComplete = (evalData: InterviewEvaluation, transcript: Message[]) => {
    const newSession: SavedInterview = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      jobRole,
      techStack,
      transcript,
      evaluation: evalData
    };
    
    setInterviewHistory(prev => [newSession, ...prev]);
    setActiveInterview(newSession);
    navigate('dashboard');
  };

  const handleSelectSession = (session: SavedInterview) => {
    setActiveInterview(session);
    setJobRole(session.jobRole);
    setTechStack(session.techStack);
  };

  const handleDeleteSession = (id: string) => {
    setInterviewHistory(prev => prev.filter(s => s.id !== id));
    if (activeInterview?.id === id) {
      setActiveInterview(interviewHistory.find(s => s.id !== id) || null);
    }
  };

  const handleSelectResume = (analysis: SavedResumeAnalysis) => {
    setActiveResume(analysis);
    setJobRole(analysis.jobRole);
  };

  const handleDeleteResume = (id: string) => {
    setResumeHistory(prev => prev.filter(r => r.id !== id));
    if (activeResume?.id === id) {
      setActiveResume(resumeHistory.find(r => r.id !== id) || null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-xl font-bold tracking-tight text-white group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
              <i className="fas fa-brain"></i>
            </div>
            <span>HireMind <span className="text-indigo-500">AI</span></span>
          </button>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('resume')} className={`hover:text-white transition-colors ${view === 'resume' ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>Resume Scanner</button>
            <button onClick={() => navigate('interview')} className={`hover:text-white transition-colors ${view === 'interview' ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>Mock Interview</button>
            <button onClick={() => navigate('dashboard')} className={`hover:text-white transition-colors ${view === 'dashboard' ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>Dashboard</button>
          </nav>

          <div className="flex items-center gap-4">
            <a href="https://github.com" className="p-2 text-slate-400 hover:text-white transition-colors">
              <i className="fab fa-github text-xl"></i>
            </a>
            <button onClick={() => navigate('resume')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Get Started</button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {view === 'landing' && <LandingPage onStartResume={() => navigate('resume')} />}
        
        {view === 'resume' && (
          <ResumeTool onAnalysisComplete={handleResumeAnalysisComplete} setResumeText={setResumeText} />
        )}

        {view === 'interview' && (
          <InterviewTool jobRole={jobRole} techStack={techStack} setTechStack={setTechStack} onEvaluationComplete={handleEvaluationComplete} />
        )}

        {view === 'dashboard' && (
          <Dashboard 
            activeResume={activeResume}
            resumeHistory={resumeHistory}
            activeInterview={activeInterview}
            interviewHistory={interviewHistory}
            jobRole={jobRole}
            techStack={techStack}
            onStartInterview={() => navigate('interview')}
            onGenerateRoadmap={() => navigate('roadmap')}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onSelectResume={handleSelectResume}
            onDeleteResume={handleDeleteResume}
          />
        )}

        {view === 'roadmap' && (
          <RoadmapView jobRole={jobRole} atsAnalysis={activeResume} evaluation={activeInterview?.evaluation || null} roadmap={''} setRoadmap={() => {}} />
        )}
      </main>

      <footer className="border-t border-white/5 py-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <div className="text-xl font-bold mb-4">HireMind AI</div>
            <p className="text-slate-500 max-w-xs mx-auto md:mx-0">The professional career assistant for high-performing engineering roles.</p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-white mb-2">Platform</h4>
            <button onClick={() => navigate('resume')} className="text-slate-400 hover:text-indigo-400 transition-colors text-left">Resume Scan</button>
            <button onClick={() => navigate('interview')} className="text-slate-400 hover:text-indigo-400 transition-colors text-left">Interview Prep</button>
            <button onClick={() => navigate('dashboard')} className="text-slate-400 hover:text-indigo-400 transition-colors text-left">Skill Dashboard</button>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Connect</h4>
            <div className="flex justify-center md:justify-start gap-4 text-xl">
              <i className="fab fa-linkedin text-slate-400 hover:text-white cursor-pointer transition-colors"></i>
              <i className="fab fa-twitter text-slate-400 hover:text-white cursor-pointer transition-colors"></i>
              <i className="fab fa-discord text-slate-400 hover:text-white cursor-pointer transition-colors"></i>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-white/5 text-center text-slate-600 text-sm">
          &copy; {new Date().getFullYear()} HireMind AI. Designed for high-impact careers.
        </div>
      </footer>
    </div>
  );
};

export default App;
