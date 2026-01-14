
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
    if (file.type !== 'application/pdf') return alert("Only Neural PDF extraction supported.");
    setExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      setContent(text);
      setResumeText(text);
    } catch (err) {
      alert("Extraction failed. Manual entry required.");
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!role || !content) return alert("All vectors must be defined.");
    setLoading(true);
    try {
      const result = await gemini.analyzeResume(role, exp, content);
      onAnalysisComplete(result, role);
    } catch (error) {
      alert("Neural sync error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full"></div>
        
        <header className="mb-12 relative z-10">
           <h2 className="text-4xl font-black text-white tracking-tighter mb-3">Neural Scan Interface</h2>
           <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em]">Recruiter Algorithm Calibration v4.0</p>
        </header>
        
        <div className="space-y-10 relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Target Intelligence Role</label>
                 <div className="relative group">
                    <i className="fas fa-compass absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input type="text" placeholder="e.g. Lead Engineer" className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={role} onChange={(e) => setRole(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Seniority Tier</label>
                 <div className="relative group">
                    <i className="fas fa-layer-group absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                    <select className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-10 py-4 outline-none focus:border-indigo-500/50 appearance-none font-bold text-white shadow-inner cursor-pointer" value={exp} onChange={(e) => setExp(e.target.value)}>
                       <option value="0-2 YEARS">Entry Vector (0-2y)</option>
                       <option value="2-5 YEARS">Mid Vector (2-5y)</option>
                       <option value="5+ YEARS">Senior Vector (5+y)</option>
                       <option value="10+ YEARS">Principal Vector (10+y)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-600"></i>
                 </div>
              </div>
           </div>

           <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }} onClick={() => fileInputRef.current?.click()} className={`group border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-white/5 bg-black/30 hover:bg-white/5'}`}>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
              {extracting ? (
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Parsing Neural Map...</p>
                 </div>
              ) : (
                 <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto text-indigo-400 text-4xl group-hover:scale-110 transition-transform">
                       <i className={`fas ${content ? 'fa-fingerprint' : 'fa-upload'}`}></i>
                    </div>
                    <div>
                       <p className="text-xl font-black text-white">{content ? 'DNA Extracted' : 'Upload Career Map'}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{content ? 'Click to re-scan' : 'Drag & Drop PDF Intelligence'}</p>
                    </div>
                 </div>
              )}
           </div>

           <div className="relative pt-4">
              <textarea rows={6} placeholder="Manual Career Stream..." className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-6 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-400 text-sm scrollbar-thin" value={content} onChange={(e) => setContent(e.target.value)} />
           </div>

           <button onClick={handleAnalyze} disabled={loading || extracting} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50">
              {loading ? 'Analyzing Competency Matrix...' : 'Execute Neural Scan'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeTool;
