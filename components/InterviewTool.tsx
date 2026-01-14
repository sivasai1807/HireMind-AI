
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, InterviewEvaluation } from '../types';
import { gemini } from '../services/geminiService';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const difficultyOptions = [
  { id: 'EASY', label: 'Junior', desc: 'Syntax & Concepts', color: 'border-emerald-500/30 text-emerald-400' },
  { id: 'MEDIUM', label: 'Engineer', desc: 'Problem Solving', color: 'border-indigo-500/30 text-indigo-400' },
  { id: 'HARD', label: 'Senior', desc: 'Architecture & Scale', color: 'border-rose-500/30 text-rose-400' }
];

interface Props {
  jobRole: string;
  techStack: string;
  setTechStack: (stack: string) => void;
  onEvaluationComplete: (evalData: InterviewEvaluation, transcript: Message[]) => void;
}

type Mode = 'text' | 'voice' | 'video';

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

const InterviewTool: React.FC<Props> = ({ jobRole, techStack, setTechStack, onEvaluationComplete }) => {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('voice');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  
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
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);
  useEffect(() => { return () => stopLiveSession(); }, []);

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    setIsLive(false);
  };

  const startLiveSession = async (currentMode: Mode) => {
    if (!techStack) return alert("Please specify tech stack.");
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
          systemInstruction: `Interviewer for ${jobRole}. Tech stack: ${techStack}. Difficulty: ${difficulty}. Ask one technical question at a time.` 
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
            if (message.serverContent?.inputTranscription) setUserTranscription(message.serverContent.inputTranscription.text);
            if (message.serverContent?.outputTranscription) setAiTranscription(message.serverContent.outputTranscription.text);
            if (message.serverContent?.turnComplete) {
              setMessages(prev => [...prev, { role: 'candidate', text: userTranscription, timestamp: Date.now() - 1000 }, { role: 'interviewer', text: aiTranscription, timestamp: Date.now() }]);
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current; if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
              const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
              source.start(nextStartTimeRef.current); nextStartTimeRef.current += buffer.duration;
              const mockData = new Float32Array(1024).map(() => (Math.random() - 0.5) * 0.5); visualize(mockData, canvasRef.current);
            }
          },
          onerror: (e) => { if (e.message?.includes('429')) setError("QUOTA_EXHAUSTED"); },
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { setLoading(false); setError(err.status === 429 ? "QUOTA_EXHAUSTED" : "HARDWARE_ERROR"); }
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
    setLoading(true);
    try {
      const firstQ = await gemini.startInterview(jobRole, techStack, difficulty);
      setMessages([{ role: 'interviewer', text: firstQ, timestamp: Date.now() }]);
      setStarted(true);
    } catch (e: any) { if (e.status === 429) setError("QUOTA_EXHAUSTED"); } finally { setLoading(false); }
  };

  const handleSendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'candidate', text: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg]; setMessages(newMessages); setInput(''); setLoading(true);
    try {
      const transcriptStr = newMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const nextQ = await gemini.getFollowUpQuestion(transcriptStr, input);
      setMessages(prev => [...prev, { role: 'interviewer', text: nextQ, timestamp: Date.now() }]);
    } catch (e: any) { if (e.status === 429) setError("QUOTA_EXHAUSTED"); } finally { setLoading(false); }
  };

  const proceedToEvaluation = async () => {
    setEvaluating(true); setIsConfirming(false); stopLiveSession();
    try {
      const transcriptStr = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const evalData = await gemini.evaluateInterview(transcriptStr);
      onEvaluationComplete(evalData, messages);
    } catch (e: any) { if (e.status === 429) setError("QUOTA_EXHAUSTED"); } finally { setEvaluating(false); }
  };

  // Add missing toggle functions to fix "Cannot find name" errors
  const toggleMute = () => setIsMuted(prev => !prev);
  const toggleVideo = () => setIsVideoOff(prev => !prev);

  if (error === "QUOTA_EXHAUSTED") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="glass rounded-[3rem] p-12 border-red-500/20">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 text-3xl"><i className="fas fa-triangle-exclamation"></i></div>
          <h2 className="text-3xl font-black text-white mb-4">Neural Buffer Exhausted</h2>
          <p className="text-slate-400 mb-10 leading-relaxed">The AI models are currently at peak capacity. Please check your plan limits or wait a few minutes.</p>
          <button onClick={() => window.location.reload()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Reset Sync</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tighter">Session Calibration</h2>
          <p className="text-slate-400 mb-12 max-w-xl text-lg font-medium">Select your communication mode to begin the competency assessment.</p>
          
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Stack Vector</label>
                <input type="text" placeholder="e.g. React, Node, PostgreSQL" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all font-bold text-white shadow-inner" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Communication Logic</label>
                <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 gap-1.5">
                  {(['text', 'voice', 'video'] as Mode[]).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-white'}`}>
                      <i className={`fas fa-${m === 'text' ? 'keyboard' : m === 'voice' ? 'microphone' : 'video'} mb-1.5 block text-base`}></i>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Intensity Level</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {difficultyOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setDifficulty(opt.id)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${difficulty === opt.id ? `${opt.color} bg-indigo-500/5 border-current` : 'border-white/5 bg-black/20 hover:border-white/10 text-slate-500'}`}>
                    <span className="font-black text-xl mb-1 tracking-tight">{opt.label}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => mode === 'text' ? startTextInterview() : startLiveSession(mode)} disabled={loading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50">
              {loading ? <><i className="fas fa-circle-notch animate-spin"></i> Initializing Neural Session...</> : 'Initiate Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Text Mode (WhatsApp Style)
  if (mode === 'text') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0b141a] relative animate-in fade-in duration-500">
        <header className="h-16 bg-[#202c33] flex items-center justify-between px-6 z-20 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white"><i className="fas fa-user-tie"></i></div>
             <div>
                <h3 className="text-white text-sm font-bold">HireMind Neural Recruiter</h3>
                <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Synchronized</span>
             </div>
          </div>
          <button onClick={() => setIsConfirming(true)} className="px-4 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">End Call</button>
        </header>
        <div ref={scrollRef} className="flex-grow overflow-y-auto px-4 py-8 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-95 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-md relative ${m.role === 'interviewer' ? 'bg-[#202c33] text-white rounded-tl-none border-l-4 border-indigo-500' : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'}`}>
                {m.text}
                <div className="mt-1 text-right text-[8px] opacity-40 flex items-center justify-end gap-1 font-bold">
                   {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   {m.role === 'candidate' && <i className="fas fa-check-double text-sky-400"></i>}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="bg-[#202c33] px-4 py-2 rounded-xl rounded-tl-none flex gap-1.5 items-center"><span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span><span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span></div>
            </div>
          )}
        </div>
        <footer className="bg-[#202c33] p-4 flex items-center gap-4">
           <div className="flex-grow relative">
              <input type="text" className="w-full bg-[#2a3942] border-none rounded-xl px-5 py-3 text-sm text-white outline-none" placeholder="Transmit response..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()} disabled={loading} />
           </div>
           <button onClick={handleSendText} disabled={loading || !input.trim()} className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 disabled:opacity-50 transition-all"><i className="fas fa-paper-plane"></i></button>
        </footer>
        {isConfirming && (
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
              <div className="glass rounded-[3rem] p-10 max-w-sm w-full text-center space-y-8 animate-in zoom-in-95">
                 <h3 className="text-white font-black text-2xl tracking-tighter">End Evaluation?</h3>
                 <p className="text-slate-500 text-sm font-medium">Your scorecard will be generated based on this technical stream.</p>
                 <div className="flex flex-col gap-3">
                    <button onClick={proceedToEvaluation} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">End & Analyze</button>
                    <button onClick={() => setIsConfirming(false)} className="w-full py-4 text-slate-500 font-bold text-xs uppercase hover:text-white transition-colors">Continue</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // Voice/Video Mode (Google Meet Style)
  return (
    <div className="h-[calc(100vh-80px)] bg-[#030712] text-white flex flex-col relative overflow-hidden">
      <div className="flex-grow p-6 lg:p-8 grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className="relative glass rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center border-white/5">
           <div className="absolute top-6 left-6 z-10 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2"><i className="fas fa-brain text-indigo-400 text-[10px]"></i><span className="text-[10px] font-black uppercase tracking-widest">HireMind AI</span></div>
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
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-8"><div className="relative w-40 h-40 rounded-full bg-zinc-950 border-2 border-white/5 flex items-center justify-center shadow-2xl shadow-indigo-500/5"><i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-user'} text-5xl text-zinc-800`}></i>{!isMuted && <canvas ref={userCanvasRef} width={150} height={80} className="absolute bottom-6 left-0 w-full opacity-60" />}</div><div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">{isMuted ? 'Transmission Muted' : 'Voice Synchronizing...'}</div></div>
          )}
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
          <button onClick={() => setIsConfirming(true)} className="px-10 h-16 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-red-600/20 ml-6"><i className="fas fa-phone-slash rotate-[135deg]"></i> Leave Grid</button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-6">
          <div className="glass rounded-[3rem] p-12 max-w-md w-full text-center space-y-10 border-indigo-500/20 animate-in zoom-in-95">
             <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-400 text-5xl"><i className="fas fa-shield-halved"></i></div>
             <div><h3 className="text-3xl font-black mb-3 tracking-tighter">Synchronize Evaluation?</h3><p className="text-slate-500 text-sm font-medium">Finalizing this session will generate your professional performance matrix.</p></div>
             <div className="flex flex-col gap-3">
                <button onClick={proceedToEvaluation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30">End Session</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-5 text-slate-500 font-black text-xs uppercase hover:text-white transition-colors">Resume Matrix</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-[#030712] z-[200] flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700">
           <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center"><h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Extracting Evaluation Data...</h3><p className="text-slate-500 text-sm font-bold uppercase tracking-[0.4em]">Competency Mapping Active</p></div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
