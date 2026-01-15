
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, InterviewEvaluation, InterviewRound } from '../types';
import { gemini } from '../services/geminiService';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const difficultyOptions = [
  { id: 'EASY', label: 'Junior', color: 'border-emerald-500/30 text-emerald-400' },
  { id: 'MEDIUM', label: 'Mid-Level', color: 'border-indigo-500/30 text-indigo-400' },
  { id: 'HARD', label: 'Senior+', color: 'border-rose-500/30 text-rose-400' }
];

const roundOptions: { id: InterviewRound; label: string; icon: string }[] = [
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: 'fa-comments' },
  { id: 'TECHNICAL', label: 'Technical', icon: 'fa-microchip' },
  { id: 'CODING', label: 'Coding Lab', icon: 'fa-code' }
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
  const [round, setRound] = useState<InterviewRound>('TECHNICAL');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [code, setCode] = useState('// Your professional solution\n\nfunction solveProblem(input) {\n    // Implementation logic\n    return null;\n}');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  const [jobRole, setJobRole] = useState(initialJobRole || '');
  const [techStack, setTechStack] = useState(initialTechStack || '');
  
  const [isLive, setIsLive] = useState(false);
  const [userTranscription, setUserTranscription] = useState('');
  const [aiTranscription, setAiTranscription] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const inputTranscriptionRef = useRef('');
  const outputTranscriptionRef = useRef('');

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => { return () => stopLiveSession(); }, []);

  const stopLiveSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close().catch(() => {});
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    setIsLive(false);
  };

  const startLiveSession = async () => {
    if (!techStack || !jobRole) return alert("Please specify the role and tech stack.");
    setLoading(true); setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      const outputCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, 
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          systemInstruction: `Professional Recruiter. Round: ${round}. Seniority: ${difficulty}. Challenge the candidate on ${jobRole} and ${techStack}. High stakes. No emojis.` 
        },
        callbacks: {
          onopen: () => { 
            setIsLive(true); setLoading(false); setStarted(true); 
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
            frameIntervalRef.current = window.setInterval(() => captureAndSendFrame(sessionPromise), 1000);
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
              setMessages(prev => [...prev, { role: 'candidate', text: inputTranscriptionRef.current, timestamp: Date.now() }, { role: 'interviewer', text: outputTranscriptionRef.current, timestamp: Date.now() }]);
              inputTranscriptionRef.current = ''; outputTranscriptionRef.current = '';
              setUserTranscription(''); setAiTranscription('');
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
    } catch (err: any) { setLoading(false); setError("HARDWARE_ERROR"); }
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
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 2; ctx.strokeStyle = '#6366f1'; ctx.beginPath();
    const sliceWidth = canvas.width / data.length; let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 100; const y = (canvas.height / 2) + v;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  };

  const startTextInterview = async () => {
    setLoading(true);
    try {
      const q = await gemini.startInterview(jobRole, techStack, difficulty, round);
      setMessages([{ role: 'interviewer', text: q, timestamp: Date.now() }]);
      setStarted(true);
    } catch (e: any) { setError("LIMIT_REACHED"); } finally { setLoading(false); }
  };

  const handleSendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'candidate', text: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg]; setMessages(newMessages); setInput(''); setLoading(true);
    try {
      const transcriptStr = newMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const nextQ = await gemini.getFollowUpQuestion(transcriptStr, input, round);
      setMessages(prev => [...prev, { role: 'interviewer', text: nextQ, timestamp: Date.now() }]);
    } catch (e: any) { setError("LIMIT_REACHED"); } finally { setLoading(false); }
  };

  // Added toggle functions to resolve 'Cannot find name' errors for UI control handlers
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    setIsVideoOff(prev => !prev);
  };

  const proceedToEvaluation = async () => {
    setEvaluating(true); setIsConfirming(false); stopLiveSession();
    try {
      const transcriptStr = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const evalData = await gemini.evaluateInterview(transcriptStr);
      onEvaluationComplete(evalData, messages, jobRole, techStack);
    } catch (e: any) { setError("LIMIT_REACHED"); } finally { setEvaluating(false); }
  };

  if (!started) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 animate-in fade-in duration-700">
        <div className="glass rounded-[3rem] p-10 md:p-16 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
          <h2 className="text-5xl font-black mb-10 text-white tracking-tighter">Interview Laboratory</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Target Role</label>
              <input type="text" placeholder="e.g. Staff Product Engineer" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500/50 transition-all" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Core Stack</label>
              <input type="text" placeholder="e.g. Distributed Systems, Golang" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500/50 transition-all" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
            </div>
          </div>

          <div className="space-y-8 mb-12">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assessment Round</label>
            <div className="grid grid-cols-3 gap-4">
              {roundOptions.map((opt) => (
                <button key={opt.id} onClick={() => setRound(opt.id)} className={`flex flex-col items-center justify-center py-6 rounded-3xl border-2 transition-all ${round === opt.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'}`}>
                  <i className={`fas ${opt.icon} text-xl mb-3`}></i>
                  <span className="font-black text-[10px] uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Mode</label>
              <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 gap-2">
                {(['text', 'video'] as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {difficultyOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setDifficulty(opt.id)} className={`py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${difficulty === opt.id ? opt.color + ' bg-white/5' : 'border-white/5 text-slate-600'}`}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => mode === 'text' ? startTextInterview() : startLiveSession()} disabled={loading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs tracking-[0.4em] uppercase transition-all shadow-2xl shadow-indigo-600/30">
            {loading ? 'Initializing...' : 'Launch Session'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'text') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0b141a] animate-in fade-in duration-500 overflow-hidden">
        <header className="h-20 px-10 bg-[#182229] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <i className="fas fa-user-tie text-xl"></i>
            </div>
            <div>
              <h3 className="text-white font-black tracking-tight">{round} Assessment</h3>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Connected • Live Audit</p>
            </div>
          </div>
          <button onClick={() => setIsConfirming(true)} className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Terminate</button>
        </header>

        <div ref={scrollRef} className="flex-grow overflow-y-auto py-10 px-4 scroll-smooth scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-4`}>
                <div className={`relative max-w-[80%] px-6 py-4 rounded-3xl text-[15px] leading-relaxed shadow-xl ${m.role === 'interviewer' ? 'bg-[#202c33] text-slate-100 rounded-tl-none border border-white/5' : 'bg-[#005c4b] text-white rounded-tr-none'}`}>
                  <p className="font-medium">{m.text}</p>
                  <div className="text-[9px] mt-2 opacity-40 text-right font-black">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
               <div className="flex justify-start">
                  <div className="bg-[#202c33] px-6 py-4 rounded-3xl rounded-tl-none border border-white/5 space-x-1 flex items-center">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            )}
          </div>
        </div>

        <footer className="h-28 bg-[#182229] border-t border-white/5 px-10 flex items-center shrink-0">
          <div className="max-w-4xl mx-auto w-full flex items-center gap-4">
            <textarea 
              rows={1}
              className="flex-grow bg-[#2a3942] rounded-2xl px-6 py-4 text-slate-100 outline-none resize-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" 
              placeholder="Provide your professional input..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              disabled={loading}
            />
            <button onClick={handleSendText} disabled={loading || !input.trim()} className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Google Meet Style Video Mode
  return (
    <div className="h-[calc(100vh-80px)] bg-[#202124] text-white flex flex-col relative animate-in fade-in duration-1000">
      
      {/* Side-by-Side Video Layout */}
      <div className="flex-grow flex p-6 gap-6 min-h-0">
        
        {/* Interviewer Tile */}
        <div className={`flex-1 relative rounded-[2rem] overflow-hidden bg-[#3c4043] border border-white/5 shadow-2xl transition-all duration-700 ${round === 'CODING' ? 'hidden md:flex' : 'flex'}`}>
           <div className="absolute top-6 left-6 z-10 bg-black/40 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 backdrop-blur-md">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Associate
           </div>
           <div className="w-full h-full flex items-center justify-center relative">
              <div className={`absolute inset-0 bg-indigo-600/5 transition-opacity ${aiTranscription ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className="w-48 h-48 rounded-full bg-white/5 flex items-center justify-center text-white/10 text-9xl">
                <i className="fas fa-user-shield"></i>
              </div>
              <canvas ref={canvasRef} width={300} height={100} className="absolute bottom-10 left-0 w-full opacity-40 pointer-events-none" />
           </div>
        </div>

        {/* Candidate Feed or Code Editor */}
        <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-[#3c4043] border border-white/5 shadow-2xl flex flex-col">
          <div className="absolute top-6 left-6 z-10 bg-black/40 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 backdrop-blur-md">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> You
          </div>

          {round === 'CODING' ? (
            <div className="flex-grow flex flex-col pt-16 bg-[#1e1e1e]">
               <header className="px-8 py-3 bg-[#252526] flex items-center justify-between border-b border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Code Environment</span>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"></span>
                  </div>
               </header>
               <textarea 
                className="flex-grow bg-transparent p-10 font-mono text-sm text-indigo-300 outline-none resize-none leading-relaxed" 
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />
          )}

          {isVideoOff && round !== 'CODING' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
               <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center text-4xl text-zinc-700"><i className="fas fa-video-slash"></i></div>
            </div>
          )}
          
          <canvas ref={frameCanvasRef} className="hidden" />
          <canvas ref={userCanvasRef} width={100} height={50} className="absolute bottom-6 right-6 w-20 h-10 opacity-30 pointer-events-none" />
        </div>
      </div>

      {/* Subtitles Overlay (Meet Style - Below the video) */}
      <div className="h-24 flex items-center justify-center px-10 shrink-0">
         {(showCaptions && (aiTranscription || userTranscription)) ? (
           <div className="bg-black/60 backdrop-blur-xl px-12 py-3.5 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-2">
              <p className="text-lg font-bold tracking-tight text-white leading-relaxed">
                <span className="text-indigo-400 mr-3">{aiTranscription ? 'Associate:' : 'You:'}</span>
                {aiTranscription || userTranscription}
              </p>
           </div>
         ) : (
           <div className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em]">Session Protocol Active</div>
         )}
      </div>

      {/* Meet Control Bar */}
      <div className="h-28 bg-[#202124] flex items-center justify-between px-10 border-t border-white/5 shrink-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:block">
           {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {jobRole}
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51]'}`}>
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51]'}`}>
            <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
          <button onClick={() => setShowCaptions(!showCaptions)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showCaptions ? 'bg-indigo-600 text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51]'}`}>
            <i className="fas fa-closed-captioning"></i>
          </button>
          
          <button onClick={() => setIsConfirming(true)} className="px-10 h-12 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 ml-4">
            <i className="fas fa-phone-slash rotate-[135deg]"></i> Leave
          </button>
        </div>

        <div className="flex items-center gap-4 hidden lg:flex">
          <button className="w-10 h-10 text-slate-500 hover:text-white"><i className="fas fa-info-circle"></i></button>
          <button className="w-10 h-10 text-slate-500 hover:text-white"><i className="fas fa-users"></i></button>
          <button className="w-10 h-10 text-slate-500 hover:text-white"><i className="fas fa-comment-alt"></i></button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[150] flex items-center justify-center p-6 animate-in fade-in">
          <div className="glass rounded-[4rem] p-16 md:p-24 max-w-2xl w-full text-center space-y-12 border-white/10 shadow-2xl">
             <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-400 text-5xl shadow-2xl"><i className="fas fa-check-double"></i></div>
             <div className="space-y-6">
                <h3 className="text-4xl font-black text-white tracking-tighter">Submit Session Audit?</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-md mx-auto">This will conclude the interview and finalize your professional grade based on the full session.</p>
             </div>
             <div className="flex flex-col gap-6">
                <button onClick={proceedToEvaluation} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl">Complete Audit</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-6 text-slate-600 font-black text-xs uppercase hover:text-white transition-all tracking-[0.3em]">Back to Call</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-[#202124] z-[200] flex flex-col items-center justify-center gap-12 animate-in fade-in duration-1000">
           <div className="w-40 h-40 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-white tracking-tighter">Running Diagnostic Scoring</h3>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.8em] animate-pulse">Analyzing Performance Data</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
