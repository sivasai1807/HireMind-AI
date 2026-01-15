
import React, { useState } from 'react';
import { AppView, CompanyQuestion } from '../types';

const SAMPLE_QUESTIONS: CompanyQuestion[] = [
  { id: '1', company: 'Google', role: 'Staff Engineer', question: 'Implement a highly-available rate limiter that works across a distributed cluster of nodes. Discuss consistency tradeoffs.', category: 'System Design', difficulty: 'Hard' },
  { id: '2', company: 'Meta', role: 'Frontend Architect', question: 'How would you architect a large-scale design system that supports multi-tenant applications with theme-ability and accessibility at the core?', category: 'System Design', difficulty: 'Hard' },
  { id: '3', company: 'Amazon', role: 'SDE III', question: 'Explain the internal data structures used in a distributed NoSQL database to ensure low-latency writes and horizontal scaling.', category: 'Coding', difficulty: 'Hard' },
  { id: '4', company: 'Netflix', role: 'Performance Engineer', question: 'How do you optimize video streaming performance over variable network conditions using adaptive bitrate algorithms?', category: 'System Design', difficulty: 'Hard' },
  { id: '5', company: 'Apple', role: 'Core OS Engineer', question: 'Discuss the design of a memory management system for a real-time OS. How do you prevent fragmentation and ensure deterministic timing?', category: 'Coding', difficulty: 'Hard' },
  { id: '6', company: 'Microsoft', role: 'Azure Cloud Engineer', question: 'Design a serverless compute platform that can scale to millions of concurrent requests with cold starts under 100ms.', category: 'System Design', difficulty: 'Hard' },
  { id: '7', company: 'Uber', role: 'Marketplace Engineer', question: 'Implement a surge pricing algorithm that balances supply and demand in a geospatial grid in real-time.', category: 'Coding', difficulty: 'Hard' },
  { id: '8', company: 'Stripe', role: 'Integrations Engineer', question: 'How would you build an idempotency layer for a massive financial API to prevent duplicate transactions during network failures?', category: 'System Design', difficulty: 'Hard' }
];

const companies = ['All', 'Google', 'Meta', 'Amazon', 'Netflix', 'Apple', 'Microsoft', 'Uber', 'Stripe'];

interface Props {
  onNavigate: (view: AppView) => void;
}

const QuestionsBank: React.FC<Props> = ({ onNavigate }) => {
  const [activeCompany, setActiveCompany] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = SAMPLE_QUESTIONS.filter(q => {
    const matchCompany = activeCompany === 'All' || q.company === activeCompany;
    const matchSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) || q.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCompany && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-24 relative">
        <div className="space-y-6">
          <div className="inline-flex px-5 py-2 rounded-full glass border border-white/5 text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">FAANG Archive</div>
          <h1 className="text-7xl md:text-8xl font-black text-white tracking-tighter italic leading-none">Curated <br />Challenges</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
            Real-Time Intelligence from Top-Tier Firms
          </p>
        </div>
        <div className="flex-grow max-w-md relative group">
           <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
           <input 
              type="text" 
              placeholder="Filter by concept (e.g. distributed, O(1))..." 
              className="w-full bg-black/40 border border-white/5 rounded-3xl py-6 pl-16 pr-8 text-[11px] text-white outline-none focus:border-indigo-500/50 shadow-inner font-black tracking-widest transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-20">
        {companies.map(c => (
          <button 
            key={c} 
            onClick={() => setActiveCompany(c)}
            className={`px-10 py-4.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border-2 ${activeCompany === c ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'glass text-slate-500 border-transparent hover:border-white/10 hover:text-white'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredQuestions.map((q, i) => (
          <div key={q.id} className="glass rounded-[4rem] p-12 border border-white/5 hover:border-indigo-500/30 transition-all group flex flex-col h-full relative overflow-hidden animate-in slide-in-from-bottom-6 duration-500" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="absolute -right-10 -top-10 text-white/[0.03] text-[12rem] font-black italic select-none pointer-events-none transition-all group-hover:text-white/[0.06] group-hover:scale-110">
              {q.company[0]}
            </div>
            
            <header className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                  <i className={`fas ${q.category === 'Coding' ? 'fa-code' : 'fa-project-diagram'} text-xl`}></i>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{q.company}</div>
                  <div className="text-[9px] font-bold uppercase text-slate-600 tracking-tighter">{q.role}</div>
                </div>
              </div>
              <div className="text-[9px] font-black text-rose-500 px-4 py-2 bg-rose-500/10 rounded-full uppercase tracking-widest border border-rose-500/20">{q.difficulty}</div>
            </header>

            <div className="flex-grow relative z-10">
               <p className="text-xl font-bold text-slate-200 leading-snug mb-12 italic group-hover:text-white transition-colors">
                 "{q.question}"
               </p>
            </div>

            <footer className="pt-10 border-t border-white/5 flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">{q.category} Round</span>
              <button 
                onClick={() => onNavigate('interview')}
                className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all group/btn"
              >
                Simulate <i className="fas fa-arrow-right-long group-hover/btn:translate-x-3 transition-transform"></i>
              </button>
            </footer>
          </div>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="py-60 text-center space-y-12">
          <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-800 text-6xl shadow-inner"><i className="fas fa-search-minus"></i></div>
          <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs">Analysis returned zero matching data points.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
