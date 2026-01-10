import React, { useState, useRef } from 'react';
import { gemini } from '../services/geminiService';
import { AtsAnalysis } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
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
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }

    setExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      setContent(text);
      setResumeText(text);
    } catch (err) {
      console.error("PDF Extraction error:", err);
      alert("Failed to extract text from PDF. Please try pasting the text manually.");
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!role) {
      alert("Please specify the target role for accuracy.");
      return;
    }
    if (!content) {
      alert("Please upload a resume or paste your resume content.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await gemini.analyzeResume(role, exp, content);
      onAnalysisComplete(result, role);
    } catch (error) {
      console.error(error);
      alert("Neural analysis failed. Please check your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -z-10"></div>
        
        <div className="relative z-10">
          <header className="mb-10">
            <h2 className="text-4xl font-black mb-2 text-white tracking-tighter">Resume Intelligence</h2>
            <p className="text-slate-400">Benchmarking your career trajectory against top product company standards.</p>
          </header>
          
          <div className="space-y-8">
            {/* Step 1: Role Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Target Role</label>
                <div className="relative group">
                  <i className="fas fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 focus:border-indigo-500 outline-none transition-all font-bold text-white shadow-inner"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Seniority Intent</label>
                <div className="relative group">
                  <i className="fas fa-stairs absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors pointer-events-none"></i>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 focus:border-indigo-500 outline-none transition-all appearance-none font-bold text-white shadow-inner cursor-pointer"
                    value={exp}
                    onChange={(e) => setExp(e.target.value)}
                  >
                    <option value="FRESHER">Graduate / Fresher</option>
                    <option value="INTERN">Internship</option>
                    <option value="0-2 YEARS">Entry (0-2 Years)</option>
                    <option value="2-5 YEARS">Mid-Level (2-5 Years)</option>
                    <option value="5+ YEARS">Senior (5+ Years)</option>
                    <option value="10+ YEARS">Principal / Lead</option>
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none"></i>
                </div>
              </div>
            </div>

            {/* Step 2: Upload or Content */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Content Ingestion</label>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 
                  extracting ? 'border-indigo-500/50 bg-black/40 cursor-wait' :
                  'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf" 
                  onChange={handleFileChange}
                />

                {extracting ? (
                  <div className="text-center space-y-4 animate-in fade-in duration-300">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                      <i className="fas fa-file-pdf absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 text-lg"></i>
                    </div>
                    <p className="text-sm font-black text-indigo-400 uppercase tracking-widest">Scanning Document Structures...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 shadow-lg">
                      <i className={`fas ${content ? 'fa-check-double' : 'fa-cloud-arrow-up'} text-3xl`}></i>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">{content ? 'Resume Loaded' : 'Upload PDF Resume'}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{content ? 'Click to replace or drop another' : 'Drag & Drop PDF or Browse'}</p>
                    </div>
                  </div>
                )}
                
                {/* Visual Feedback on Drag */}
                {isDragging && (
                  <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="px-6 py-3 bg-indigo-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl">Drop to analyze</div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.4em]">
                <span className="bg-[#0a0a0b] px-6 text-slate-700">Manually inspect or edit below</span>
              </div>
            </div>

            <div className="relative">
              <textarea 
                rows={10}
                placeholder="Paste resume text if you prefer manual entry..."
                className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-300 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-white/10 shadow-inner"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="absolute bottom-6 right-6 flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{content.length} characters</span>
              </div>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || extracting}
              className={`w-full py-6 rounded-2xl font-black text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-4 relative overflow-hidden group active:scale-[0.98] ${
                loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <i className="fas fa-brain animate-pulse"></i>
                  <span>Evaluating Competencies...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <i className="fas fa-shield-halved group-hover:rotate-12 transition-transform"></i>
                  <span>Initiate Neural Scan</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Platform Guarantees */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/5">
          <i className="fas fa-lock text-indigo-400"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encryption</span>
        </div>
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/5">
          <i className="fas fa-bolt text-amber-400"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">Low Latency Analysis</span>
        </div>
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/5">
          <i className="fas fa-robot text-emerald-400"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">FAANG Calibration</span>
        </div>
      </div>
    </div>
  );
};

export default ResumeTool;