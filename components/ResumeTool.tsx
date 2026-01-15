
import React, { useState, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { AtsAnalysis } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

interface Props {
  onAnalysisComplete: (data: AtsAnalysis, role: string) => void;
  setResumeText: (text: string) => void;
}

const ResumeTool: React.FC<Props> = ({ onAnalysisComplete, setResumeText }) => {
  const [role, setRole] = useState('');
  const [exp, setExp] = useState('0-2 YEARS');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AtsAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') return alert("Please upload a PDF document.");
    setExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      setContent(text);
      setResumeText(text);
    } catch (err) {
      alert("Text extraction failed. You can paste your resume content manually below.");
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!role || !content) return alert("Please enter the target job role and provide your resume content.");
    setLoading(true);
    try {
      const result = await gemini.analyzeResume(role, exp, content);
      setAnalysisResult(result);
      onAnalysisComplete(result, role);
    } catch (error) {
      alert("Failed to analyze resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setAnalysisResult(null);
    setRole('');
    setContent('');
  };

  if (analysisResult) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-12 duration-700">
        <div className="glass rounded-[4rem] p-12 md:p-20 relative overflow-hidden shadow-2xl space-y-20 border-white/[0.03]">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-50"></div>
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tighter">Resume Audit Report</h2>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Targeted Role: <span className="text-indigo-400">{role}</span>
              </p>
            </div>
            <div className="flex gap-4">
               <button onClick={resetTool} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">New Audit</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Main Metrics */}
            <div className="lg:col-span-4 space-y-12">
               <div className="glass p-12 rounded-[3rem] border-indigo-500/20 text-center space-y-6 glow-indigo">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Compatibility Score</h4>
                  <div className="text-8xl font-black text-white tracking-tighter tabular-nums">
                    {analysisResult.ats_score}<span className="text-2xl opacity-20 ml-1">/100</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${analysisResult.ats_score}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Based on competitive FAANG-level benchmarks for {role}.</p>
               </div>

               <div className="space-y-8">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60 px-2 flex items-center gap-3">
                    <i className="fas fa-triangle-exclamation"></i> Formatting Alerts
                  </h5>
                  <div className="space-y-4">
                    {analysisResult.formatting_issues.map((issue, i) => (
                      <div key={i} className="flex gap-4 p-5 glass rounded-2xl border-amber-500/10 hover:bg-white/5 transition-all group">
                         <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all">
                           <i className="fas fa-wrench"></i>
                         </div>
                         <p className="text-xs text-slate-400 font-bold leading-relaxed">{issue}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Detailed Feedback */}
            <div className="lg:col-span-8 space-y-16">
               <section className="space-y-8">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 px-2">Missing Industrial Keywords</h5>
                  <div className="flex flex-wrap gap-3">
                     {analysisResult.missing_keywords.map((kw, i) => (
                       <span key={i} className="px-5 py-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all cursor-default">
                         {kw}
                       </span>
                     ))}
                  </div>
               </section>

               {/* New Project Feedback Section */}
               {analysisResult.project_feedback && analysisResult.project_feedback.length > 0 && (
                 <section className="space-y-8">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-300 px-2 flex items-center gap-3">
                      <i className="fas fa-rocket"></i> Project Portfolio Insights
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {analysisResult.project_feedback.map((feedback, i) => (
                        <div key={i} className="p-8 glass rounded-[2.5rem] border-indigo-500/10 hover:bg-white/5 transition-all group flex gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                            <i className="fas fa-folder-open"></i>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{feedback}</p>
                        </div>
                      ))}
                    </div>
                 </section>
               )}

               <section className="space-y-8">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 px-2">Strategic Improvement Logic</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysisResult.improvement_suggestions.map((s, i) => (
                       <div key={i} className="p-8 glass rounded-[2.5rem] border-emerald-500/10 hover:-translate-y-1 transition-all group">
                          <i className="fas fa-lightbulb text-emerald-500/40 text-2xl mb-6 block group-hover:scale-110 transition-transform"></i>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{s}</p>
                       </div>
                    ))}
                  </div>
               </section>

               <section className="space-y-8">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white px-2">High-Impact Optimized Content</h5>
                  <div className="space-y-5">
                     {analysisResult.rewritten_bullets.map((bullet, i) => (
                       <div key={i} className="p-7 glass rounded-3xl border-white/5 relative group overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex gap-5">
                             <div className="text-indigo-400 text-sm mt-1 shrink-0"><i className="fas fa-quote-left"></i></div>
                             <p className="text-sm text-slate-300 italic font-medium leading-relaxed">{bullet}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="glass rounded-[4rem] p-12 md:p-20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-50"></div>
        
        <header className="mb-16 relative z-10">
           <h2 className="text-5xl font-black text-white tracking-tighter mb-4">Resume Review</h2>
           <p className="text-slate-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Professional Benchmarking System
           </p>
        </header>
        
        <div className="space-y-12 relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-5">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Target Job Role</label>
                 <div className="relative group">
                    <i className="fas fa-briefcase absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Software Engineer" 
                      className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] pl-16 pr-6 py-5 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)} 
                    />
                 </div>
              </div>
              <div className="space-y-5">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Experience Level</label>
                 <div className="relative group">
                    <i className="fas fa-user-graduate absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                    <select 
                      className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] pl-16 pr-10 py-5 outline-none focus:border-indigo-500/50 appearance-none font-bold text-white shadow-inner cursor-pointer" 
                      value={exp} 
                      onChange={(e) => setExp(e.target.value)}
                    >
                       <option value="0-2 YEARS">Junior (0-2y)</option>
                       <option value="2-5 YEARS">Mid-Level (2-5y)</option>
                       <option value="5+ YEARS">Senior (5+y)</option>
                       <option value="10+ YEARS">Principal / Lead (10+y)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-xs"></i>
                 </div>
              </div>
           </div>

           <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} 
              onDragLeave={() => setIsDragging(false)} 
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }} 
              onClick={() => fileInputRef.current?.click()} 
              className={`group border-2 border-dashed rounded-[3rem] p-20 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-white/5 bg-black/30 hover:bg-white/5'}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
              {extracting ? (
                 <div className="text-center space-y-6">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">Processing Document...</p>
                 </div>
              ) : (
                 <div className="text-center space-y-8">
                    <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-400 text-4xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                       <i className={`fas ${content ? 'fa-check' : 'fa-upload'}`}></i>
                    </div>
                    <div>
                       <p className="text-2xl font-black text-white mb-2">{content ? 'Resume Loaded' : 'Upload Resume'}</p>
                       <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">{content ? 'Click to change file' : 'Drag and drop your PDF here'}</p>
                    </div>
                 </div>
              )}
           </div>

           <div className="relative">
              <div className="absolute top-5 right-8 text-[10px] font-black uppercase tracking-widest text-slate-700 pointer-events-none">Or paste content below</div>
              <textarea 
                rows={6} 
                placeholder="Paste your resume or professional summary here..." 
                className="w-full bg-black/40 border border-white/5 rounded-[2.5rem] px-10 py-10 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-400 text-sm scrollbar-thin leading-relaxed" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
              />
           </div>

           <button 
             onClick={handleAnalyze} 
             disabled={loading || extracting} 
             className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs tracking-[0.4em] uppercase transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-4">
                  <i className="fas fa-circle-notch animate-spin"></i> Analyzing Resume
                </span>
              ) : 'Analyze Performance'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeTool;
