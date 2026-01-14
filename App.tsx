
import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeTool from './components/ResumeTool';
import InterviewTool from './components/InterviewTool';
import Dashboard from './components/Dashboard';
import RoadmapView from './components/RoadmapView';
import { AppView, AtsAnalysis, InterviewEvaluation, Message, SavedInterview, SavedResumeAnalysis } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [jobRole, setJobRole] = useState<string>('');
  const [techStack, setTechStack] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  
  const HISTORY_KEY = 'hiremind_history';
  const RESUME_HISTORY_KEY = 'hiremind_resume_history';

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
    // Sync the global role if it was empty
    if (!jobRole && currentRole) setJobRole(currentRole);
    navigate('dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      <header className="sticky top-0 z-[100] border-b border-white/5 bg-[#030712]/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="flex items-center gap-3 text-2xl font-black tracking-tighter text-white group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <i className="fas fa-briefcase"></i>
            </div>
            <span>HireMind</span>
          </button>
          
          <nav className="hidden lg:flex items-center gap-10">
            {[
              { id: 'resume', label: 'Resume Review' },
              { id: 'interview', label: 'Mock Interviews' },
              { id: 'dashboard', label: 'Career Dashboard' }
            ].map((v) => (
              <button 
                key={v.id}
                onClick={() => navigate(v.id as AppView)} 
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-white ${view === v.id ? 'text-indigo-400' : 'text-slate-500'}`}
              >
                {v.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('resume')} className="hidden sm:block px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              Analysis
            </button>
            <button onClick={() => navigate('interview')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              Practice Now
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
        {view === 'dashboard' && (
          <Dashboard 
            activeResume={activeResume}
            resumeHistory={resumeHistory}
            activeInterview={activeInterview}
            interviewHistory={interviewHistory}
            onStartInterview={() => navigate('interview')}
            onGenerateRoadmap={() => navigate('roadmap')}
            onSelectSession={setActiveInterview}
            onDeleteSession={(id) => setInterviewHistory(h => h.filter(x => x.id !== id))}
            onSelectResume={setActiveResume}
            onDeleteResume={(id) => setResumeHistory(h => h.filter(x => x.id !== id))}
          />
        )}
        {view === 'roadmap' && (
          <RoadmapView 
            jobRole={jobRole || activeInterview?.jobRole || 'Professional Role'} 
            atsAnalysis={activeResume} 
            evaluation={activeInterview?.evaluation || null} 
            roadmap={''} 
            setRoadmap={() => {}} 
          />
        )}
      </main>

      <footer className="border-t border-white/5 py-16 bg-[#030712]/40">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-2xl font-black mb-4">HireMind</div>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-10 font-medium">Precision tools for modern career development and recruitment readiness.</p>
          <div className="flex justify-center gap-8 mb-12">
            {['linkedin', 'twitter', 'github'].map(social => (
              <i key={social} className={`fab fa-${social} text-slate-500 hover:text-white text-xl cursor-pointer transition-colors`}></i>
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} HireMind Career Systems. Built for professional growth.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
