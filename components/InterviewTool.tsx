
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
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (panelScrollRef.current) {
      panelScrollRef.current.scrollTo({ top: panelScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, userTranscription, aiTranscription]);

  useEffect(() => { return () => stopLiveSession(); }, []);

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
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
          systemInstruction: `Professional Interviewer for a ${jobRole} position. Core focus: ${techStack}. Seniority: ${difficulty}. Conduct a realistic mock interview. Speak naturally and professionaly.` 
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
              if (userText || aiText) {
                setMessages(prev => [...prev, 
                  { role: 'candidate', text: userText || '...', timestamp: Date.now() - 1000 }, 
                  { role: 'interviewer', text: aiText || '...', timestamp: Date.now() }
                ]);
              }
              inputTranscriptionRef.current = '';
              outputTranscriptionRef.current = '';
              setUserTranscription('');
              setAiTranscription('');
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current; if (!ctx || ctx.state === 'closed') return;
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
          <h2 className="text-3xl font-black text-white mb-4">Service Busy</h2>
          <p className="text-slate-400 mb-10 leading-relaxed">The AI recruiter is currently managing other candidates. Please refresh or try again in 2-3 minutes.</p>
          <button onClick={() => window.location.reload()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Retry Session</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tighter">Mock Interview Lab</h2>
          <p className="text-slate-400 mb-12 max-w-xl text-lg font-medium">Configure your professional practice environment to begin a high-fidelity recruitment simulation.</p>
          
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Job Role</label>
                <input type="text" placeholder="e.g. Lead Software Engineer" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Tech Stack</label>
                <input type="text" placeholder="e.g. TypeScript, Node, Kubernetes" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Practice Mode</label>
                <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 gap-1.5">
                  {(['text', 'video'] as Mode[]).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-white'}`}>
                      <i className={`fas fa-${m === 'text' ? 'keyboard' : 'video'} mb-1.5 block text-base`}></i>
                      {m === 'text' ? 'Text Interface' : 'Video Simulation'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Difficulty Level</label>
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
              {loading ? <><i className="fas fa-circle-notch animate-spin mr-3"></i> Syncing Session...</> : 'Launch Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Premium Video Mode Interface (Google Meet Style)
  return (
    <div className="h-[calc(100vh-80px)] bg-[#030712] text-white flex flex-col relative overflow-hidden">
      
      {/* Dynamic Status Bar (Meet Style) */}
      <div className="absolute top-8 left-8 z-50 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 px-4 py-2 rounded-xl backdrop-blur-3xl">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">Live Recording</span>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-3xl text-[10px] font-black uppercase tracking-widest text-slate-400">
           {jobRole} | Professional Audit
        </div>
      </div>

      <div className={`flex-grow p-4 lg:p-12 grid gap-6 lg:gap-10 transition-all duration-700 ${showTranscriptPanel ? 'grid-cols-1 md:grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
        
        {/* Cinematic Stage Area */}
        <div className="relative flex flex-col h-full bg-black/40 rounded-[4rem] border border-white/5 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
          
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 p-6 lg:p-10 items-center">
            {/* AI Recruiter Feed */}
            <div className="relative aspect-video glass rounded-[3rem] overflow-hidden flex items-center justify-center group border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
               <div className="absolute bottom-6 left-6 z-10 bg-black/70 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-2xl">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">Recruiter Agent</span>
               </div>
               
               <div className="relative w-44 h-44 lg:w-64 lg:h-64">
                  <div className={`absolute inset-0 bg-indigo-600/15 rounded-full blur-3xl transition-all ${isLive && !loading ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`}></div>
                  <div className="relative w-full h-full rounded-full bg-indigo-600/10 border-2 border-indigo-500/20 flex items-center justify-center overflow-hidden backdrop-blur-md">
                     <i className="fas fa-user-tie text-6xl lg:text-8xl text-indigo-500/50"></i>
                     <canvas ref={canvasRef} width={250} height={120} className="absolute bottom-10 left-0 w-full opacity-60 pointer-events-none" />
                  </div>
               </div>
            </div>

            {/* Candidate User Feed */}
            <div className="relative aspect-video glass rounded-[3rem] overflow-hidden flex items-center justify-center group border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
              <div className="absolute bottom-6 left-6 z-10 bg-black/70 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">You (Candidate)</span>
              </div>
              
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-all duration-700 ${isVideoOff ? 'scale-110 opacity-0 grayscale' : 'scale-100 opacity-100'}`} />
              
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
                   <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                     <i className="fas fa-video-slash text-4xl text-zinc-700"></i>
                   </div>
                </div>
              )}
              
              <canvas ref={frameCanvasRef} className="hidden" />
              <canvas ref={userCanvasRef} width={100} height={50} className="absolute bottom-6 right-6 w-24 h-12 opacity-60 pointer-events-none" />
            </div>
          </div>

          {/* Centered Captions Overlay (Google Meet Style) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-12 pointer-events-none z-20 text-center">
             {(showCaptions && (aiTranscription || userTranscription)) ? (
               <div className="bg-black/85 backdrop-blur-3xl px-12 py-8 rounded-[3.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-6 duration-500">
                  <div className="text-[9px] font-black uppercase tracking-[0.5em] mb-4 text-indigo-400 opacity-80">
                    {aiTranscription ? 'Executive Agent Speaking' : 'Candidate Audio Transcribed'}
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                    {aiTranscription || userTranscription}
                  </p>
               </div>
             ) : null}
          </div>
        </div>

        {/* Integrated Transcript Sidebar */}
        {showTranscriptPanel && (
          <aside className="glass rounded-[4rem] border-white/5 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-10 duration-700 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <header className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.03]">
               <div>
                 <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Full Transcript</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Session Feed</p>
               </div>
               <button onClick={() => setShowTranscriptPanel(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fas fa-times text-xs"></i></button>
            </header>
            <div ref={panelScrollRef} className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-thin">
               {messages.map((m, idx) => (
                 <div key={idx} className={`space-y-4 ${m.role === 'interviewer' ? 'text-left' : 'text-right'}`}>
                    <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${m.role === 'interviewer' ? 'justify-start text-indigo-400' : 'justify-end text-emerald-400'}`}>
                      {m.role === 'interviewer' ? <i className="fas fa-robot"></i> : <i className="fas fa-user"></i>}
                      {m.role}
                    </div>
                    <div className={`p-6 rounded-[2rem] text-[15px] leading-relaxed inline-block font-medium ${m.role === 'interviewer' ? 'bg-indigo-600/10 border border-indigo-500/10 text-slate-200' : 'bg-emerald-600/10 border border-emerald-500/10 text-slate-200'}`}>
                       {m.text}
                    </div>
                 </div>
               ))}
               {(userTranscription || aiTranscription) && (
                 <div className="space-y-10 pt-10 border-t border-white/5">
                   {aiTranscription && (
                     <div className="space-y-4 text-left animate-pulse">
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Agent Processing...</div>
                        <div className="text-base text-slate-400 italic leading-relaxed">{aiTranscription}</div>
                     </div>
                   )}
                   {userTranscription && (
                     <div className="space-y-4 text-right animate-pulse">
                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Candidate Streaming...</div>
                        <div className="text-base text-slate-400 italic leading-relaxed">{userTranscription}</div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </aside>
        )}
      </div>

      {/* Floating Controls Bar (Google Meet Style) */}
      <div className="h-32 bg-[#030712]/95 backdrop-blur-3xl flex items-center justify-center px-10 relative z-30 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-5 lg:gap-8">
          <button onClick={toggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5'}`}>
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
          </button>
          <button onClick={toggleVideo} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5'}`}>
            <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'} text-xl`}></i>
          </button>
          
          <div className="w-px h-10 bg-white/10 mx-4"></div>
          
          <button onClick={() => setShowCaptions(!showCaptions)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${showCaptions ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>
            <i className="fas fa-closed-captioning text-xl"></i>
          </button>
          <button onClick={() => setShowTranscriptPanel(!showTranscriptPanel)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${showTranscriptPanel ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>
            <i className="fas fa-list-ul text-xl"></i>
          </button>
          
          <button onClick={() => setIsConfirming(true)} className="px-12 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-red-600/30 ml-8 group">
            <i className="fas fa-phone-slash rotate-[135deg] text-lg group-hover:scale-110 transition-transform"></i> End Session
          </button>
        </div>
      </div>

      {/* Confirmation Overlay */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[150] flex items-center justify-center p-6">
          <div className="glass rounded-[4rem] p-16 max-w-lg w-full text-center space-y-12 border border-white/10 animate-in zoom-in-95 duration-500 shadow-2xl">
             <div className="w-28 h-28 bg-indigo-600/15 rounded-[2.5rem] flex items-center justify-center mx-auto text-indigo-400 text-6xl shadow-2xl border border-indigo-500/20"><i className="fas fa-check-double"></i></div>
             <div className="space-y-4">
                <h3 className="text-4xl font-black text-white tracking-tighter">Analysis Complete?</h3>
                <p className="text-slate-500 text-base font-medium leading-relaxed">Ending this call will freeze the transcript and begin your professional performance scoring.</p>
             </div>
             <div className="flex flex-col gap-5">
                <button onClick={proceedToEvaluation} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/40 transition-all">Submit for Professional Audit</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-6 text-slate-600 font-black text-xs uppercase hover:text-white transition-all">Resume Discussion</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-[#030712] z-[200] flex flex-col items-center justify-center gap-12 animate-in fade-in duration-1000">
           <div className="relative">
              <div className="w-40 h-40 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-500"><i className="fas fa-brain text-4xl animate-pulse"></i></div>
           </div>
           <div className="text-center space-y-6">
              <h3 className="text-4xl font-black text-white tracking-tighter">Generating Executive Evaluation</h3>
              <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse">Processing Performance Metrics</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
