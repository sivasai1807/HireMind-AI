
import React, { useState } from 'react';
import { AppView, CompanyQuestion } from '../types';

const SAMPLE_QUESTIONS: CompanyQuestion[] = [
  { id: '1', company: 'Google', role: 'Staff Engineer', question: 'Implement a highly-available rate limiter that works across a distributed cluster of nodes. Discuss consistency tradeoffs and clock drift.', category: 'System Design', difficulty: 'Hard' },
  { id: '2', company: 'Stripe', role: 'Integrations Engineer', question: 'How would you build an idempotency layer for a massive financial API to prevent duplicate transactions during network failures?', category: 'System Design', difficulty: 'Hard' },
  { id: '3', company: 'Meta', role: 'Frontend Architect', question: 'How would you architect a design system used by 50+ autonomous teams to ensure strict accessibility while allowing radical UI flexibility?', category: 'System Design', difficulty: 'Hard' },
  { id: '4', company: 'Netflix', role: 'Streaming Engineer', question: 'Explain the adaptive bitrate algorithm. How do you handle cache-misses in an edge CDN under high traffic congestion?', category: 'Coding', difficulty: 'Hard' },
  { id: '5', company: 'Amazon', role: 'SDE III', question: 'Design the leader election mechanism for a distributed database. Compare Raft and Paxos in a real-world scenario.', category: 'Coding', difficulty: 'Hard' },
  { id: '6', company: 'Apple', role: 'Core Systems', question: 'Implement a memory management system that prevents fragmentation in an environment with no garbage collection.', category: 'Coding', difficulty: 'Hard' },
  { id: '7', company: 'Microsoft', role: 'Cloud Architect', question: 'How do you ensure zero-downtime migrations for a database cluster with 10PB of critical user data?', category: 'System Design', difficulty: 'Hard' },
  { id: '8', company: 'Uber', role: 'Marketplace Engineer', question: 'Design a real-time matching engine for drivers and riders that handles 1 million requests per second globally.', category: 'System Design', difficulty: 'Hard' }
];

const companies = ['All', 'Google', 'Stripe', 'Meta', 'Netflix', 'Amazon', 'Apple', 'Microsoft', 'Uber'];

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
    <div className="max-w-7xl mx-auto px-6 py-24 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-24 relative">
        <div className="space-y-6">
          <div className="inline-flex px-6 py-2.5 rounded-full glass border border-white/5 text-indigo-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4">The Archive</div>
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter italic leading-none">FAANG <br />Vault</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Real-World High-Stakes Technical Challenges
          </p>
        </div>
        <div className="flex-grow max-w-lg relative group">
           <i className="fas fa-search absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
           <input 
              type="text" 
              placeholder="Filter vault by concept (e.g. Distributed)..." 
              className="w-full bg-black/40 border border-white/5 rounded-3xl py-7 pl-20 pr-10 text-[11px] text-white outline-none focus:border-indigo-500/50 shadow-inner font-black tracking-widest transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-24 overflow-x-auto pb-8 scrollbar-hide">
        {companies.map(c => (
          <button 
            key={c} 
            onClick={() => setActiveCompany(c)}
            className={`px-14 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all border-2 ${activeCompany === c ? 'bg-white text-black border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]' : 'glass text-slate-500 border-transparent hover:border-white/10 hover:text-white'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-14">
        {filteredQuestions.map((q, i) => (
          <div key={q.id} className="glass rounded-[5rem] p-14 border border-white/5 hover:border-indigo-500/30 transition-all group flex flex-col h-full relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="absolute -right-16 -top-16 text-white/[0.03] text-[16rem] font-black italic select-none pointer-events-none transition-all group-hover:text-white/[0.06] group-hover:scale-110">
              {q.company[0]}
            </div>
            
            <header className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                  <i className={`fas ${q.category === 'Coding' ? 'fa-code' : 'fa-project-diagram'} text-3xl`}></i>
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-white">{q.company}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-600 tracking-tighter">{q.role}</div>
                </div>
              </div>
              <div className="text-[10px] font-black text-rose-500 px-6 py-2.5 bg-rose-500/10 rounded-full uppercase tracking-widest border border-rose-500/20">Tier: {q.difficulty}</div>
            </header>

            <div className="flex-grow relative z-10">
               <p className="text-2xl font-bold text-slate-200 leading-snug mb-16 italic group-hover:text-white transition-colors">
                 "{q.question}"
               </p>
            </div>

            <footer className="pt-12 border-t border-white/5 flex items-center justify-between relative z-10">
              <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-800">{q.category} Round</span>
              <button 
                onClick={() => onNavigate('interview')}
                className="flex items-center gap-5 text-[12px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all group/btn"
              >
                Practice This <i className="fas fa-arrow-right-long group-hover/btn:translate-x-5 transition-transform"></i>
              </button>
            </footer>
          </div>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="py-72 text-center space-y-16">
          <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-800 text-8xl shadow-inner"><i className="fas fa-ghost"></i></div>
          <p className="text-slate-500 font-black uppercase tracking-[0.8em] text-sm">Vault Analysis Result: Empty</p>
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
