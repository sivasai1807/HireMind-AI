
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, InterviewEvaluation, InterviewRound } from '../types';
import { gemini } from '../services/geminiService';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
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

const voiceOptions = [
  { id: 'Puck', label: 'Authoritative', tone: 'Lead Architect', icon: 'fa-user-ninja' },
  { id: 'Kore', label: 'Friendly', tone: 'Talent Partner', icon: 'fa-face-smile-beam' },
  { id: 'Fenrir', label: 'Neutral', tone: 'Technical Lead', icon: 'fa-user-gear' },
  { id: 'Zephyr', label: 'Clear', tone: 'Executive Coach', icon: 'fa-headset' }
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
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const InterviewTool: React.FC<Props> = ({ initialJobRole, initialTechStack, onEvaluationComplete }) => {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [round, setRound] = useState<InterviewRound>('TECHNICAL');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [code, setCode] = useState('// FAANG Technical Assessment\n\nfunction solve(input) {\n    // Implementation logic here\n    return null;\n}');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
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
    if (!techStack || !jobRole) return alert("Please specify the target role and tech stack.");
    setLoading(true); setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      const outputCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioContextRef.current = outputCtx;
      
      // Critical: Explicitly resume the context to allow audio output
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      const voiceConfig = voiceOptions.find(v => v.id === selectedVoice);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }, 
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          systemInstruction: `You are a ${voiceConfig?.tone} at a top tech firm conducting a ${round} interview for a ${jobRole} role. 
          Tech stack: ${techStack}. Difficulty: ${difficulty}.
          IMPORTANT: You are the interviewer. YOU MUST INITIATE THE CONVERSATION. Start immediately by introducing yourself and asking the first question.
          STRICT: NO EMOJIS. Maintain a discerning, high-stakes professional tone. 
          In CODING rounds, provide a clear challenge and instruct the candidate to use the IDE.
          Speak clearly and interact naturally.` 
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
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
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
              setMessages(prev => [...prev, 
                { role: 'candidate', text: inputTranscriptionRef.current || '...', timestamp: Date.now() }, 
                { role: 'interviewer', text: outputTranscriptionRef.current || '...', timestamp: Date.now() }
              ]);
              inputTranscriptionRef.current = ''; outputTranscriptionRef.current = '';
              setUserTranscription(''); setAiTranscription('');
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current; if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
              const source = ctx.createBufferSource(); 
              source.buffer = buffer; 
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current); 
              nextStartTimeRef.current += buffer.duration;
              visualize(buffer.getChannelData(0), canvasRef.current);
            }
          },
          onerror: (e) => { 
            console.error("Live API Error:", e);
            if (e.message?.includes('429')) setError("LIMIT_REACHED"); 
          },
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error("Hardware Error:", err);
      setLoading(false); 
      setError("HARDWARE_ERROR"); 
    }
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

  const toggleMute = () => setIsMuted(p => !p);
  const toggleVideo = () => setIsVideoOff(p => !p);

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
      <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-700">
        <div className="glass rounded-[4rem] p-10 md:p-16 border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-50"></div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tighter italic">Mock Interview Lab</h2>
              <p className="text-slate-400 font-medium max-w-xl text-lg leading-relaxed">Configure your high-stakes assessment session. Choose your interviewer's persona and technical depth.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Target Role</label>
              <input type="text" placeholder="e.g. Staff Software Engineer" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-indigo-500/50 transition-all shadow-inner" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Tech Focus</label>
              <input type="text" placeholder="e.g. Distributed Systems, Kubernetes" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-indigo-500/50 transition-all shadow-inner" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Interview Round</label>
              <div className="grid grid-cols-3 gap-3">
                {roundOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setRound(opt.id)} className={`flex flex-col items-center justify-center py-6 rounded-2xl border-2 transition-all ${round === opt.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-xl' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'}`}>
                    <i className={`fas ${opt.icon} text-xl mb-3`}></i>
                    <span className="font-black text-[9px] uppercase tracking-widest">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Challenge Level</label>
              <div className="grid grid-cols-3 gap-3 h-full min-h-[100px]">
                {difficultyOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setDifficulty(opt.id)} className={`rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center ${difficulty === opt.id ? opt.color + ' bg-white/5 shadow-xl' : 'border-white/5 text-slate-600'}`}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-12">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Interviewer Persona</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {voiceOptions.map((voice) => (
                <button 
                  key={voice.id} 
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${selectedVoice === voice.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl scale-105' : 'glass text-slate-400 border-white/5 hover:border-white/10'}`}
                >
                  <i className={`fas ${voice.icon} text-3xl mb-2`}></i>
                  <div className="text-center">
                    <div className="text-[11px] font-black uppercase tracking-widest">{voice.label}</div>
                    <div className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">{voice.tone}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex bg-black/40 border border-white/5 rounded-3xl p-2 gap-3 mb-16 h-20">
             {(['text', 'video'] as Mode[]).map((m) => (
               <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 ${mode === m ? 'bg-indigo-600 text-white shadow-2xl' : 'text-slate-500 hover:text-white'}`}>
                 <i className={`fas ${m === 'text' ? 'fa-comments' : 'fa-video'}`}></i>
                 {m === 'text' ? 'Elite Chat' : 'Native Video'}
               </button>
             ))}
          </div>

          <button onClick={() => mode === 'text' ? startTextInterview() : startLiveSession()} disabled={loading} className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black text-xs tracking-[0.5em] uppercase transition-all shadow-2xl shadow-indigo-600/40">
            {loading ? <i className="fas fa-circle-notch animate-spin text-2xl"></i> : 'Initialize System Audit'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'text') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0b141a] animate-in fade-in duration-500 overflow-hidden">
        <header className="h-24 px-12 bg-[#182229] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <i className="fas fa-user-shield text-2xl"></i>
            </div>
            <div>
              <h3 className="text-white font-black tracking-tight text-xl">{round} Round</h3>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Security Active
              </p>
            </div>
          </div>
          <button onClick={() => setIsConfirming(true)} className="px-10 py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/10">End Assessment</button>
        </header>

        <div ref={scrollRef} className="flex-grow overflow-y-auto py-12 px-6 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-12">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-6`}>
                <div className={`relative max-w-[85%] px-10 py-8 rounded-[3rem] text-[16px] leading-relaxed shadow-2xl ${m.role === 'interviewer' ? 'bg-[#202c33] text-slate-100 rounded-tl-none border border-white/5' : 'bg-[#005c4b] text-white rounded-tr-none'}`}>
                  <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                  <div className="text-[9px] mt-4 opacity-40 text-right font-black tracking-widest uppercase">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
               <div className="flex justify-start">
                  <div className="bg-[#202c33] px-10 py-6 rounded-[3rem] rounded-tl-none border border-white/5 space-x-3 flex items-center">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            )}
          </div>
        </div>

        <footer className="h-36 bg-[#182229] border-t border-white/5 px-12 flex items-center shrink-0">
          <div className="max-w-4xl mx-auto w-full flex items-center gap-8">
            <textarea 
              rows={1}
              className="flex-grow bg-[#2a3942] rounded-[2rem] px-10 py-6 text-slate-100 outline-none resize-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium text-base shadow-inner" 
              placeholder="Submit professional input..." 
              value={input} 
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              disabled={loading}
            />
            <button onClick={handleSendText} disabled={loading || !input.trim()} className="w-20 h-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] flex items-center justify-center transition-all shadow-2xl active:scale-95 shrink-0">
              <i className="fas fa-paper-plane text-2xl"></i>
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // GOOGLE MEET PROFESSIONAL VIDEO UI
  return (
    <div className="h-[calc(100vh-80px)] bg-[#202124] text-white flex flex-col relative animate-in fade-in duration-1000 overflow-hidden">
      
      {/* Grid Layout Stage */}
      <div className="flex-grow flex p-6 lg:p-10 gap-8 min-h-0 overflow-hidden relative">
        
        {/* Interviewer Tile */}
        <div className={`flex-1 relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-[#3c4043] to-[#202124] border border-white/5 shadow-2xl transition-all duration-700 flex flex-col group ${showCodeEditor ? 'hidden lg:flex lg:max-w-[350px] lg:h-[260px] absolute top-10 left-10 z-[100]' : ''}`}>
           <div className="absolute top-8 left-8 z-10 bg-black/50 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-4 backdrop-blur-3xl border border-white/5 uppercase">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> Associate: {selectedVoice}
           </div>
           
           <div className="flex-grow flex items-center justify-center relative">
              <div className={`absolute inset-0 bg-indigo-600/10 transition-opacity duration-1000 ${aiTranscription ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className="w-56 h-56 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/10 text-[9rem] shadow-inner group-hover:scale-105 transition-transform duration-1000">
                <i className={`fas ${voiceOptions.find(v => v.id === selectedVoice)?.icon || 'fa-user-tie'}`}></i>
              </div>
              <canvas ref={canvasRef} width={400} height={150} className="absolute bottom-12 left-0 w-full opacity-30 pointer-events-none" />
           </div>
        </div>

        {/* User / IDE Tile */}
        <div className={`relative rounded-[3rem] overflow-hidden bg-[#3c4043] border border-white/5 shadow-2xl transition-all duration-700 flex flex-col flex-1`}>
          <div className="absolute top-8 left-8 z-10 bg-black/50 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-4 backdrop-blur-3xl border border-white/5 uppercase">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div> You
          </div>

          {showCodeEditor ? (
            <div className="flex-grow flex flex-col bg-[#1e1e1e] pt-20 h-full">
               <header className="px-12 py-6 bg-[#252526] flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                      <i className="fas fa-terminal"></i>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Technical Protocol IDE</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <button className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] hover:text-white transition-all flex items-center gap-3 bg-emerald-500/5 px-6 py-3 rounded-xl border border-emerald-500/10">
                       <i className="fas fa-play"></i> Execute Solution
                    </button>
                    <div className="flex gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20"></span>
                    </div>
                  </div>
               </header>
               <textarea 
                className="flex-grow bg-[#1e1e1e] p-16 font-mono text-lg text-indigo-300 outline-none resize-none leading-relaxed scrollbar-thin shadow-inner" 
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          ) : (
            <div className="w-full h-full relative bg-zinc-900">
               <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />
               {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
                    <div className="w-56 h-56 rounded-full bg-white/5 flex items-center justify-center text-7xl text-zinc-700 shadow-inner border border-white/5"><i className="fas fa-video-slash"></i></div>
                  </div>
               )}
            </div>
          )}
          
          <canvas ref={frameCanvasRef} className="hidden" />
          <canvas ref={userCanvasRef} width={100} height={50} className="absolute bottom-12 right-12 w-28 h-14 opacity-30 pointer-events-none" />
        </div>
      </div>

      {/* Subtitles Overlay */}
      <div className="h-32 flex items-center justify-center px-12 shrink-0 bg-[#202124] relative z-20">
         {(showCaptions && (aiTranscription || userTranscription)) ? (
           <div className="bg-black/70 backdrop-blur-3xl px-16 py-6 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-6 duration-700 text-center max-w-6xl">
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed">
                <span className="text-indigo-400 mr-6 opacity-60 font-black uppercase text-[10px] tracking-widest">{aiTranscription ? 'Interviewer' : 'You'}</span>
                {aiTranscription || userTranscription}
              </p>
           </div>
         ) : (
           <div className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.8em] opacity-40 italic">Native High-Definition Stream Established</div>
         )}
      </div>

      {/* Meet Control Bar */}
      <div className="h-28 bg-[#202124] flex items-center justify-between px-16 border-t border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-12">
           <div className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 hidden xl:block tabular-nums">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {jobRole}
           </div>
           <div className="h-8 w-px bg-white/10 hidden xl:block"></div>
           <div className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400/80 italic">
              Audit Phase: {round}
           </div>
        </div>
        
        <div className="flex items-center gap-8">
          <button onClick={toggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white shadow-2xl shadow-red-500/30' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white border border-white/5'}`}>
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
          </button>
          <button onClick={toggleVideo} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white shadow-2xl shadow-red-500/30' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white border border-white/5'}`}>
            <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'} text-xl`}></i>
          </button>
          <button onClick={() => setShowCaptions(!showCaptions)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${showCaptions ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white border border-white/5'}`}>
            <i className="fas fa-closed-captioning text-xl"></i>
          </button>
          <button onClick={() => setShowCodeEditor(!showCodeEditor)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${showCodeEditor ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white border border-white/5'}`}>
            <i className="fas fa-terminal text-xl"></i>
          </button>
          
          <div className="w-px h-12 bg-white/10 mx-6"></div>

          <button onClick={() => setIsConfirming(true)} className="px-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-[12px] uppercase tracking-[0.3em] flex items-center gap-6 transition-all active:scale-95 shadow-2xl shadow-red-600/50">
            <i className="fas fa-phone-slash rotate-[135deg] text-2xl"></i> Leave Session
          </button>
        </div>

        <div className="flex items-center gap-10 hidden lg:flex">
          <button className="w-12 h-12 text-slate-500 hover:text-white transition-colors"><i className="fas fa-users text-2xl"></i></button>
          <button className="w-12 h-12 text-slate-500 hover:text-white transition-colors relative">
            <i className="fas fa-comment-alt text-2xl"></i>
            {aiTranscription && <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[#202124]"></div>}
          </button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 bg-black/99 backdrop-blur-[50px] z-[200] flex items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="glass rounded-[5rem] p-20 md:p-32 max-w-3xl w-full text-center space-y-16 border-white/10 shadow-[0_50px_150px_rgba(0,0,0,1)]">
             <div className="w-32 h-32 bg-indigo-600/10 rounded-[3.5rem] flex items-center justify-center mx-auto text-indigo-400 text-6xl shadow-2xl"><i className="fas fa-check-double"></i></div>
             <div className="space-y-8">
                <h3 className="text-5xl font-black text-white tracking-tighter italic leading-tight">Submit Session for Audit?</h3>
                <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-lg mx-auto">This will terminate the interactive protocol and synthesize all session metrics into your professional executive report.</p>
             </div>
             <div className="flex flex-col gap-8">
                <button onClick={proceedToEvaluation} className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[3rem] font-black text-sm uppercase tracking-[0.5em] shadow-2xl shadow-indigo-600/50 transition-all active:scale-95">Synthesize Final Grade</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-8 text-slate-600 font-black text-xs uppercase hover:text-white transition-all tracking-[0.4em]">Back to Assessment</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-[#030712] z-[300] flex flex-col items-center justify-center gap-20 animate-in fade-in duration-1000">
           <div className="w-56 h-56 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center space-y-8">
              <h3 className="text-5xl font-black text-white tracking-tighter uppercase tracking-[0.2em] italic">Synthesizing Results</h3>
              <p className="text-slate-600 text-xs font-black uppercase tracking-[1.2em] animate-pulse">Executing Career Alignment Logic</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
