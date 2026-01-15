
import React, { useState } from 'react';
import { AppView, CompanyQuestion } from '../types';

const SAMPLE_QUESTIONS: CompanyQuestion[] = [
  // Google
  { id: 'g1', company: 'Google', role: 'Staff Engineer', question: 'Implement a highly-available rate limiter that works across a distributed cluster of nodes. Discuss consistency tradeoffs and clock drift.', category: 'System Design', difficulty: 'Hard' },
  { id: 'g2', company: 'Google', role: 'SDE II', question: 'Given a stream of integers, find the median at any given time with O(log n) insertion. Discuss memory constraints for billion-scale streams.', category: 'Coding', difficulty: 'Hard' },
  { id: 'g3', company: 'Google', role: 'Product Manager', question: 'Tell me about a time you had a conflict with an engineer over a technical decision. How did you resolve it without compromising the product roadmap?', category: 'Behavioral', difficulty: 'Medium' },
  { id: 'g4', company: 'Google', role: 'Security Engineer', question: 'How would you defend against a distributed denial of service (DDoS) attack on a global authentication service?', category: 'System Design', difficulty: 'Hard' },
  
  // Stripe
  { id: 's1', company: 'Stripe', role: 'Integrations Engineer', question: 'How would you build an idempotency layer for a massive financial API to prevent duplicate transactions during network failures?', category: 'System Design', difficulty: 'Hard' },
  { id: 's2', company: 'Stripe', role: 'Software Engineer', question: 'Design an API that handles "Scheduled Payments" at scale. How do you ensure exactly-once execution for millions of concurrent tasks?', category: 'System Design', difficulty: 'Hard' },
  { id: 's3', company: 'Stripe', role: 'Frontend Engineer', question: 'Build a complex, accessible, and performant data table that supports infinite scroll, multi-column sorting, and inline editing.', category: 'Coding', difficulty: 'Medium' },
  
  // Meta
  { id: 'm1', company: 'Meta', role: 'Frontend Architect', question: 'How would you architect a design system used by 50+ autonomous teams to ensure strict accessibility while allowing radical UI flexibility?', category: 'System Design', difficulty: 'Hard' },
  { id: 'm2', company: 'Meta', role: 'E5 Software Engineer', question: 'Optimize a news feed algorithm to balance between user engagement, latency, and data freshness. How do you handle "hot" celebrities with millions of followers?', category: 'System Design', difficulty: 'Hard' },
  { id: 'm3', company: 'Meta', role: 'Data Engineer', question: 'Design a real-time analytics pipeline for tracking billion-scale user interactions with sub-second latency.', category: 'System Design', difficulty: 'Hard' },
  
  // Netflix
  { id: 'n1', company: 'Netflix', role: 'Streaming Engineer', question: 'Explain the adaptive bitrate algorithm. How do you handle cache-misses in an edge CDN under high traffic congestion?', category: 'Coding', difficulty: 'Hard' },
  { id: 'n2', company: 'Netflix', role: 'Backend Engineer', question: 'Describe the chaos engineering approach. How would you design a system that remains resilient even if the entire AWS region goes down?', category: 'System Design', difficulty: 'Hard' },
  { id: 'n3', company: 'Netflix', role: 'L5 Engineer', question: 'Explain the "Chaos Gorilla" principle. How do you test for regional failover without impacting 99.99% of user traffic?', category: 'System Design', difficulty: 'Hard' },
  
  // Amazon
  { id: 'a1', company: 'Amazon', role: 'SDE III', question: 'Design the leader election mechanism for a distributed database. Compare Raft and Paxos in a real-world scenario.', category: 'Coding', difficulty: 'Hard' },
  { id: 'a2', company: 'Amazon', role: 'L6 Manager', question: 'Tell me about a time you had to make a decision without having all the data. What was the outcome and what did you learn about "Bias for Action"?', category: 'Behavioral', difficulty: 'Hard' },
  { id: 'a3', company: 'Amazon', role: 'ML Engineer', question: 'How would you design a recommendation system that handles extreme cold-start problems for new products?', category: 'System Design', difficulty: 'Hard' },
  
  // Apple
  { id: 'ap1', company: 'Apple', role: 'Core Systems', question: 'Implement a memory management system that prevents fragmentation in an environment with no garbage collection.', category: 'Coding', difficulty: 'Hard' },
  { id: 'ap2', company: 'Apple', role: 'Embedded Engineer', question: 'How do you optimize power consumption for a background process on a device with limited battery? Discuss interrupt handling.', category: 'Coding', difficulty: 'Hard' },
  
  // Microsoft
  { id: 'ms1', company: 'Microsoft', role: 'Cloud Architect', question: 'How do you ensure zero-downtime migrations for a database cluster with 10PB of critical user data?', category: 'System Design', difficulty: 'Hard' },
  { id: 'ms2', company: 'Microsoft', role: 'SDE', question: 'Write an algorithm to detect a cycle in a directed graph. Explain how this applies to deadlocks in OS kernels.', category: 'Coding', difficulty: 'Medium' },
  { id: 'ms3', company: 'Microsoft', role: 'DevOps Engineer', question: 'Explain the internal workings of a container orchestrator. How does it handle service discovery and health checks?', category: 'System Design', difficulty: 'Medium' },
  
  // Uber
  { id: 'u1', company: 'Uber', role: 'Marketplace Engineer', question: 'Design a real-time matching engine for drivers and riders that handles 1 million requests per second globally.', category: 'System Design', difficulty: 'Hard' },
  { id: 'u2', company: 'Uber', role: 'L5 Engineer', question: 'How do you handle geospatial indexing for moving objects? Compare H3 with S2 geometry libraries.', category: 'System Design', difficulty: 'Hard' }
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
    const matchSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      q.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      q.category.toLowerCase().includes(searchTerm.toLowerCase());
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
            {filteredQuestions.length} High-Stakes Challenges Available
          </p>
        </div>
        <div className="flex-grow max-w-lg relative group">
           <i className="fas fa-search absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
           <input 
              type="text" 
              placeholder="Search by role, company, or concept..." 
              className="w-full bg-black/40 border border-white/5 rounded-3xl py-7 pl-20 pr-10 text-[11px] text-white outline-none focus:border-indigo-500/50 shadow-inner font-black tracking-widest transition-all placeholder:opacity-30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-24 overflow-x-auto pb-8 scrollbar-hide">
        {companies.map(c => (
          <button 
            key={c} 
            onClick={() => setActiveCompany(c)}
            className={`px-12 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all border-2 ${activeCompany === c ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_20px_40px_rgba(99,102,241,0.3)] scale-105' : 'glass text-slate-500 border-transparent hover:border-white/10 hover:text-white'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-14">
        {filteredQuestions.map((q, i) => (
          <div key={q.id} className="glass rounded-[4rem] p-12 border border-white/5 hover:border-indigo-500/30 transition-all group flex flex-col h-full relative overflow-hidden animate-in slide-in-from-bottom-10 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="absolute -right-16 -top-16 text-white/[0.03] text-[16rem] font-black italic select-none pointer-events-none transition-all group-hover:text-white/[0.06] group-hover:scale-110">
              {q.company[0]}
            </div>
            
            <header className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                  <i className={`fas ${q.category === 'Coding' ? 'fa-code' : q.category === 'System Design' ? 'fa-project-diagram' : 'fa-comments'} text-2xl`}></i>
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.2em] text-white">{q.company}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-600 tracking-tight">{q.role}</div>
                </div>
              </div>
              <div className="text-[9px] font-black text-rose-500 px-4 py-2 bg-rose-500/10 rounded-full uppercase tracking-widest border border-rose-500/20">{q.difficulty}</div>
            </header>

            <div className="flex-grow relative z-10 mb-12">
               <p className="text-xl font-bold text-slate-200 leading-relaxed italic group-hover:text-white transition-colors">
                 "{q.question}"
               </p>
            </div>

            <footer className="pt-10 border-t border-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                 <span className="w-2 h-2 rounded-full bg-indigo-500/40"></span>
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{q.category}</span>
              </div>
              <button 
                onClick={() => onNavigate('interview')}
                className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all group/btn"
              >
                Simulation <i className="fas fa-arrow-right group-hover/btn:translate-x-3 transition-transform"></i>
              </button>
            </footer>
          </div>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="py-72 text-center space-y-12">
          <div className="w-40 h-40 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-800 text-7xl shadow-inner border border-white/5"><i className="fas fa-search-minus"></i></div>
          <div className="space-y-4">
            <p className="text-slate-500 font-black uppercase tracking-[0.8em] text-sm">No Matching Records</p>
            <button onClick={() => { setActiveCompany('All'); setSearchTerm(''); }} className="text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all">Clear All Filters</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsBank;
