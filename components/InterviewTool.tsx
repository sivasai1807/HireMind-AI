
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, InterviewEvaluation } from '../types';
import { gemini } from '../services/geminiService';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const difficultyOptions = [
  { id: 'EASY', label: 'Junior', desc: 'Core Fundamentals', color: 'border-emerald-500/30 text-emerald-400' },
  { id: 'MEDIUM', label: 'Mid-Level', desc: 'Practical Experience', color: 'border-indigo-500/30 text-indigo-400' },
  { id: 'HARD', label: 'Senior+', desc: 'Architecture & Leadership', color: 'border-rose-500/30 text-rose-400' }
];

interface Props {
  initialJobRole: string;
  initialTechStack: string;
  onEvaluationComplete: (evalData: InterviewEvaluation, transcript: Message[], jobRole: string, techStack: string) => void;
}

type Mode = 'text' | 'video';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const InterviewTool: React.FC<Props> = ({ initialJobRole, initialTechStack, onEvaluationComplete }) => {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('MEDIUM');

  const [jobRole, setJobRole] = useState(initialJobRole || '');
  const [techStack, setTechStack] = useState(initialTechStack || '');
  
  const [isLive, setIsLive] = useState(false);
  const [userTranscription, setUserTranscription] = useState('');
  const [aiTranscription, setAiTranscription] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const inputTranscriptionRef = useRef('');
  const outputTranscriptionRef = useRef('');

  useEffect(() => { 
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => { return () => stopLiveSession(); }, []);

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    setIsLive(false);
  };

  const startLiveSession = async (currentMode: Mode) => {
    if (!techStack || !jobRole) return alert("Please specify the job role and technology stack.");
    setLoading(true); setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const constraints = { audio: true, video: currentMode === 'video' ? { width: 1280, height: 720, frameRate: 15 } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (currentMode === 'video' && videoRef.current) videoRef.current.srcObject = stream;
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, 
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          systemInstruction: `Professional Interviewer for a ${jobRole} position. Core focus: ${techStack}. Seniority: ${difficulty}. Conduct a realistic mock interview.` 
        },
        callbacks: {
          onopen: () => { setIsLive(true); setLoading(false); setStarted(true); 
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
              visualize(inputData, userCanvasRef.current);
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            if (currentMode === 'video') frameIntervalRef.current = window.setInterval(() => captureAndSendFrame(sessionPromise), 1000);
          },
          onmessage: async (message) => {
            if (message.serverContent?.inputTranscription) {
              inputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setUserTranscription(inputTranscriptionRef.current);
            }
            if (message.serverContent?.outputTranscription) {
              outputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              setAiTranscription(outputTranscriptionRef.current);
            }
            if (message.serverContent?.turnComplete) {
              const userText = inputTranscriptionRef.current;
              const aiText = outputTranscriptionRef.current;
              setMessages(prev => [...prev, 
                { role: 'candidate', text: userText, timestamp: Date.now() - 1000 }, 
                { role: 'interviewer', text: aiText, timestamp: Date.now() }
              ]);
              inputTranscriptionRef.current = '';
              outputTranscriptionRef.current = '';
              setUserTranscription('');
              setAiTranscription('');
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current; if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
              const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
              source.start(nextStartTimeRef.current); nextStartTimeRef.current += buffer.duration;
              visualize(buffer.getChannelData(0), canvasRef.current);
            }
          },
          onerror: (e) => { if (e.message?.includes('429')) setError("LIMIT_REACHED"); },
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { setLoading(false); setError(err.status === 429 ? "LIMIT_REACHED" : "HARDWARE_ERROR"); }
  };

  const captureAndSendFrame = (sessionPromise: Promise<any>) => {
    const video = videoRef.current; const canvas = frameCanvasRef.current; if (!video || !canvas || isVideoOff) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', JPEG_QUALITY);
  };

  const visualize = (data: Float32Array, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 3; ctx.strokeStyle = '#6366f1'; ctx.beginPath();
    const sliceWidth = canvas.width / data.length; let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 120; const y = (canvas.height / 2) + v;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  };

  const startTextInterview = async () => {
    if (!jobRole || !techStack) return alert("Please specify the job role and tech stack.");
    setLoading(true);
    try {
      const firstQ = await gemini.startInterview(jobRole, techStack, difficulty);
      setMessages([{ role: 'interviewer', text: firstQ, timestamp: Date.now() }]);
      setStarted(true);
    } catch (e: any) { if (e.status === 429) setError("LIMIT_REACHED"); } finally { setLoading(false); }
  };

  const handleSendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'candidate', text: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg]; setMessages(newMessages); setInput(''); setLoading(true);
    try {
      const transcriptStr = newMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const nextQ = await gemini.getFollowUpQuestion(transcriptStr, input);
      setMessages(prev => [...prev, { role: 'interviewer', text: nextQ, timestamp: Date.now() }]);
    } catch (e: any) { if (e.status === 429) setError("LIMIT_REACHED"); } finally { setLoading(false); }
  };

  const proceedToEvaluation = async () => {
    setEvaluating(true); setIsConfirming(false); stopLiveSession();
    try {
      const transcriptStr = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const evalData = await gemini.evaluateInterview(transcriptStr);
      onEvaluationComplete(evalData, messages, jobRole, techStack);
    } catch (e: any) { if (e.status === 429) setError("LIMIT_REACHED"); } finally { setEvaluating(false); }
  };

  const toggleMute = () => setIsMuted(prev => !prev);
  const toggleVideo = () => setIsVideoOff(prev => !prev);

  if (error === "LIMIT_REACHED") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="glass rounded-[3rem] p-12 border-red-500/20">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 text-3xl"><i className="fas fa-exclamation-circle"></i></div>
          <h2 className="text-3xl font-black text-white mb-4">Service Unavailable</h2>
          <p className="text-slate-400 mb-10 leading-relaxed">The interview service is currently at full capacity. Please try again in a few minutes.</p>
          <button onClick={() => window.location.reload()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Retry</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tighter">Mock Interview Setup</h2>
          <p className="text-slate-400 mb-12 max-w-xl text-lg font-medium">Select your interview mode and focus area to begin your professional practice session.</p>
          
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Target Job Role</label>
                <input type="text" placeholder="e.g. Frontend Developer" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Technology Focus</label>
                <input type="text" placeholder="e.g. React, Python, AWS" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Interview Mode</label>
                <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 gap-1.5">
                  {(['text', 'video'] as Mode[]).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-white'}`}>
                      <i className={`fas fa-${m === 'text' ? 'keyboard' : 'video'} mb-1.5 block text-base`}></i>
                      {m === 'text' ? 'Interactive Text' : 'Video Simulation'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Seniority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {difficultyOptions.map((opt) => (
                    <button key={opt.id} onClick={() => setDifficulty(opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${difficulty === opt.id ? `${opt.color} bg-indigo-500/5 border-current` : 'border-white/5 bg-black/20 hover:border-white/10 text-slate-500'}`}>
                      <span className="font-black text-xs mb-0.5 tracking-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => mode === 'text' ? startTextInterview() : startLiveSession(mode)} disabled={loading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50">
              {loading ? <><i className="fas fa-circle-notch animate-spin"></i> Initializing Session...</> : 'Start Professional Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modern Text Mode Interface
  if (mode === 'text') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-[#030712] relative animate-in fade-in duration-500">
        {/* Left Info Panel - Professional Touch */}
        <aside className="hidden lg:flex w-80 border-r border-white/5 bg-black/20 backdrop-blur-3xl flex-col p-8 space-y-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Session Context</h3>
            <div className="p-5 glass rounded-2xl border-indigo-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                  <i className="fas fa-briefcase text-sm"></i>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Role</div>
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">{jobRole}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-code text-sm"></i>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Skills</div>
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">{techStack}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Evaluation Criteria</h3>
            <ul className="space-y-3">
              {['Technical Depth', 'Communication', 'Clarity'].map(c => (
                <li key={c} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto">
            <button onClick={() => setIsConfirming(true)} className="w-full py-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              <i className="fas fa-door-open mr-2"></i> End Interview
            </button>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-grow flex flex-col h-full bg-[#030712] relative">
          <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-8 z-20 shrink-0">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10">
                 <i className="fas fa-user-tie text-xl"></i>
               </div>
               <div>
                  <h3 className="text-white text-base font-black tracking-tight">Executive Recruiter</h3>
                  <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Session Active
                  </span>
               </div>
            </div>
            <div className="flex items-center gap-4 lg:hidden">
               <button onClick={() => setIsConfirming(true)} className="px-5 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest">End Session</button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 py-10 space-y-10 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-30">
                <i className="fas fa-comments text-5xl"></i>
                <p className="text-sm font-bold uppercase tracking-widest">Waiting for response...</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`group relative max-w-[85%] sm:max-w-[70%] p-6 rounded-[2rem] text-[15px] leading-relaxed transition-all shadow-2xl ${
                  m.role === 'interviewer' 
                  ? 'glass text-slate-200 rounded-tl-none border-l-4 border-l-indigo-500' 
                  : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/20 font-medium'
                }`}>
                  <div className="text-[10px] uppercase font-black tracking-[0.2em] mb-3 opacity-40">
                    {m.role === 'interviewer' ? 'Strategic Inquiry' : 'Candidate Response'}
                  </div>
                  {m.text}
                  <div className={`mt-4 text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2 ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                     <i className="far fa-clock"></i> {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                 <div className="glass px-6 py-4 rounded-[1.5rem] rounded-tl-none border-l-4 border-l-indigo-500/50 flex gap-2 items-center">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Evaluating Response...</span>
                 </div>
              </div>
            )}
          </div>

          <footer className="p-6 md:p-10 bg-[#030712] border-t border-white/5 relative z-30 shrink-0">
             <div className="max-w-4xl mx-auto flex items-end gap-5">
                <div className="flex-grow relative group">
                  <textarea 
                    rows={1}
                    className="w-full bg-black/40 border border-white/5 group-focus-within:border-indigo-500/40 rounded-[2rem] pl-8 pr-20 py-5 text-sm text-white outline-none shadow-inner transition-all resize-none scrollbar-none" 
                    placeholder="Formulate your detailed response..." 
                    value={input} 
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendText();
                      }
                    }} 
                    disabled={loading} 
                  />
                  <div className="absolute right-6 bottom-5 flex items-center gap-4">
                    <span className="hidden sm:inline text-[9px] font-black text-slate-600 uppercase tracking-widest">Press Enter to Send</span>
                  </div>
                </div>
                <button 
                  onClick={handleSendText} 
                  disabled={loading || !input.trim()} 
                  className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30 active:scale-90 disabled:opacity-50 disabled:grayscale transition-all shrink-0"
                >
                  <i className="fas fa-paper-plane-top text-lg"></i>
                </button>
             </div>
          </footer>

          {/* Chat Overlays */}
          {isConfirming && (
             <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
                <div className="glass rounded-[3.5rem] p-12 max-w-sm w-full text-center space-y-10 animate-in zoom-in-95 duration-300">
                   <div className="w-24 h-24 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500 text-5xl">
                      <i className="fas fa-flag-checkered"></i>
                   </div>
                   <div>
                      <h3 className="text-white font-black text-3xl tracking-tighter mb-4">Complete Interview?</h3>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">Ending the session will generate your professional performance analysis based on the conversation history.</p>
                   </div>
                   <div className="flex flex-col gap-4">
                      <button onClick={proceedToEvaluation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">Submit & Evaluate</button>
                      <button onClick={() => setIsConfirming(false)} className="w-full py-5 text-slate-500 font-bold text-xs uppercase hover:text-white transition-colors">Resume Conversation</button>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  // Video Mode (Remains consistent with the refined aesthetic)
  return (
    <div className="h-[calc(100vh-80px)] bg-[#030712] text-white flex flex-col relative overflow-hidden">
      <div className="flex-grow p-6 lg:p-8 grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className="relative glass rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center border-white/5">
           <div className="absolute top-6 left-6 z-10 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2"><i className="fas fa-user-tie text-indigo-400 text-[10px]"></i><span className="text-[10px] font-black uppercase tracking-widest">Interviewer</span></div>
           <div className="relative w-48 h-48">
              <div className={`absolute inset-0 bg-indigo-600/10 rounded-full ${isLive && !loading ? 'animate-ping' : ''}`}></div>
              <div className="relative w-full h-full rounded-full bg-indigo-600/10 border-2 border-indigo-500/20 flex items-center justify-center overflow-hidden"><i className="fas fa-user-tie text-6xl text-indigo-500 opacity-60"></i><canvas ref={canvasRef} width={200} height={100} className="absolute bottom-6 left-0 w-full opacity-60" /></div>
           </div>
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none z-20">
              {aiTranscription && showCaptions && <div className="bg-black/80 backdrop-blur-2xl px-8 py-5 rounded-[2rem] text-center text-xl font-bold italic border border-white/10 leading-relaxed">{aiTranscription}</div>}
           </div>
        </div>

        <div className="relative glass rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center border-white/5">
          <div className="absolute top-6 left-6 z-10 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2"><i className="fas fa-user text-emerald-400 text-[10px]"></i><span className="text-[10px] font-black uppercase tracking-widest">Candidate (You)</span></div>
          {mode === 'video' ? (
            <><video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />{isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950"><div className="w-32 h-32 rounded-full bg-zinc-900 flex items-center justify-center"><i className="fas fa-video-slash text-5xl text-zinc-700"></i></div></div>}<canvas ref={frameCanvasRef} className="hidden" /></>
          ) : null}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none z-20">
            {userTranscription && showCaptions && <div className="bg-emerald-500/10 backdrop-blur-2xl px-8 py-5 rounded-[2rem] text-center text-xl font-bold italic border border-emerald-500/20 leading-relaxed">{userTranscription}</div>}
          </div>
        </div>
      </div>

      <div className="h-28 bg-[#030712]/80 backdrop-blur-2xl flex items-center justify-center px-10 relative z-30 border-t border-white/5">
        <div className="flex items-center gap-5">
          <button onClick={toggleMute} className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-white'}`}><i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i></button>
          {mode === 'video' && <button onClick={toggleVideo} className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-white'}`}><i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'} text-xl`}></i></button>}
          <button onClick={() => setShowCaptions(!showCaptions)} className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl ${showCaptions ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-white/5 hover:bg-white/10 text-white'}`}><i className="fas fa-closed-captioning text-xl"></i></button>
          <button onClick={() => setIsConfirming(true)} className="px-10 h-16 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-red-600/20 ml-6"><i className="fas fa-phone-slash rotate-[135deg]"></i> Exit Session</button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6">
          <div className="glass rounded-[3rem] p-12 max-md w-full text-center space-y-10 border-indigo-500/20 animate-in zoom-in-95">
             <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-400 text-5xl"><i className="fas fa-check-circle"></i></div>
             <div><h3 className="text-3xl font-black mb-3 tracking-tighter">Complete Session?</h3><p className="text-slate-500 text-sm font-medium">Ending the session will generate your performance evaluation.</p></div>
             <div className="flex flex-col gap-3">
                <button onClick={proceedToEvaluation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30">Finish</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-5 text-slate-500 font-black text-xs uppercase hover:text-white transition-colors">Resume Practice</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-[#030712] z-[200] flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700">
           <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center"><h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Generating Evaluation...</h3><p className="text-slate-500 text-sm font-bold uppercase tracking-[0.4em]">Reviewing Performance Metrics</p></div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
