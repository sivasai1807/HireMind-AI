
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, InterviewEvaluation } from '../types';
import { gemini } from '../services/geminiService';

// Constants for Audio and Video processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const difficultyOptions = [
  { id: 'EASY', label: 'Junior', desc: 'Syntax & Concepts', color: 'border-emerald-500/50 text-emerald-400' },
  { id: 'MEDIUM', label: 'Engineer', desc: 'Problem Solving', color: 'border-indigo-500/50 text-indigo-400' },
  { id: 'HARD', label: 'Senior', desc: 'Architecture & Scale', color: 'border-rose-500/50 text-rose-400' }
];

interface Props {
  jobRole: string;
  techStack: string;
  setTechStack: (stack: string) => void;
  onEvaluationComplete: (evalData: InterviewEvaluation, transcript: Message[]) => void;
}

type Mode = 'text' | 'voice' | 'video';

// Utility: SDK-required Base64 encoding/decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

const InterviewTool: React.FC<Props> = ({ jobRole, techStack, setTechStack, onEvaluationComplete }) => {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('voice');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  
  // Real-time Session State
  const [isLive, setIsLive] = useState(false);
  const [userTranscription, setUserTranscription] = useState('');
  const [aiTranscription, setAiTranscription] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Refs for UI and Hardware
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Logic Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  const stopLiveSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsLive(false);
  };

  const startLiveSession = async (currentMode: Mode) => {
    if (!techStack) return alert("Please specify your tech stack.");
    setLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const constraints = {
        audio: true,
        video: currentMode === 'video' ? { width: 1280, height: 720, frameRate: 15 } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (currentMode === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioContextRef.current = outputCtx;

      const systemInstruction = `You are HireMind AI, a senior technical interviewer. 
          Today you are conducting a ${currentMode} interview for ${jobRole} with a focus on ${techStack}. 
          Current difficulty: ${difficulty}. 
          Language: You can communicate in multiple languages if the candidate responds in them, but default to professional English.
          Personality: Professional, slightly formal, Tier-1 tech company standards.
          Goal: Ask one technical or behavioral question at a time.
          Subtitles: Real-time subtitles are enabled. Speak clearly.
          Initial Prompt: Welcome the candidate to the call and ask: "To start, tell me about yourself and your experience with ${techStack}."`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction
        },
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setLoading(false);
            setStarted(true);

            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              visualize(inputData, userCanvasRef.current);
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            if (currentMode === 'video') {
              frameIntervalRef.current = window.setInterval(() => {
                captureAndSendFrame(sessionPromise);
              }, 1000 / FRAME_RATE);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setUserTranscription(message.serverContent.inputTranscription.text);
            }
            if (message.serverContent?.outputTranscription) {
              setAiTranscription(message.serverContent.outputTranscription.text);
            }
            if (message.serverContent?.turnComplete) {
              setMessages(prev => [
                ...prev,
                { role: 'candidate', text: userTranscription, timestamp: Date.now() - 1000 },
                { role: 'interviewer', text: aiTranscription, timestamp: Date.now() }
              ]);
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current;
              if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              // AI Visualizer placeholder
              const mockData = new Float32Array(1024).map(() => (Math.random() - 0.5) * 0.5);
              visualize(mockData, canvasRef.current);
            }
          },
          onerror: (e) => console.error("Session Error:", e),
          onclose: () => setIsLive(false),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      alert("Hardware access (mic/camera) is required.");
      setLoading(false);
    }
  };

  const captureAndSendFrame = (sessionPromise: Promise<any>) => {
    const video = videoRef.current;
    const canvas = frameCanvasRef.current;
    if (!video || !canvas || isVideoOff) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          sessionPromise.then(session => {
            session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
          });
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', JPEG_QUALITY);
  };

  const visualize = (data: Float32Array, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath();
    const sliceWidth = canvas.width / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 120;
      const y = (canvas.height / 2) + v;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'candidate', text: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const transcriptStr = newMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const nextQ = await gemini.getFollowUpQuestion(transcriptStr, input);
      setMessages(prev => [...prev, { role: 'interviewer', text: nextQ, timestamp: Date.now() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = isMuted);
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => track.enabled = isVideoOff);
    }
  };

  const proceedToEvaluation = async () => {
    setEvaluating(true);
    setIsConfirming(false);
    stopLiveSession();
    try {
      const transcriptStr = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      const evalData = await gemini.evaluateInterview(transcriptStr);
      onEvaluationComplete(evalData, messages);
    } catch (error) {
      console.error(error);
      alert("Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  };

  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#111113] border border-white/10 rounded-[2.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tighter">Mock Interview Simulator</h2>
          <p className="text-slate-400 mb-10 max-w-xl text-lg leading-relaxed">Choose your communication style to begin your evaluation.</p>
          
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stack Focus</label>
                <input 
                  type="text" 
                  placeholder="e.g. React & Node"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:border-indigo-500 outline-none transition-all font-bold text-white shadow-inner"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Session Mode</label>
                <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1.5 gap-1.5">
                  {(['text', 'voice', 'video'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        mode === m ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <i className={`fas fa-${m === 'text' ? 'keyboard' : m === 'voice' ? 'microphone' : 'video'} mb-1.5 block text-base`}></i>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recruiter Intensity</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {difficultyOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDifficulty(opt.id)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group ${
                      difficulty === opt.id 
                        ? `${opt.color} bg-indigo-500/5 border-current shadow-[0_0_20px_rgba(99,102,241,0.1)]` 
                        : 'border-white/5 bg-black/20 hover:border-white/20 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-black text-xl mb-1 uppercase tracking-tight">{opt.label}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => mode === 'text' ? startTextInterview() : startLiveSession(mode)}
              disabled={loading}
              className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <><i className="fas fa-circle-notch animate-spin"></i> Initializing Call...</> : <><i className="fas fa-phone"></i> Join Interview</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING TEXT INTERVIEW (WhatsApp Style) ---
  if (mode === 'text') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0b141a] animate-in fade-in duration-500 relative">
        {/* WhatsApp Header */}
        <header className="h-16 bg-[#202c33] flex items-center justify-between px-4 z-20 shadow-lg">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <i className="fas fa-user-tie text-lg"></i>
             </div>
             <div>
                <h3 className="text-white text-sm font-bold leading-none mb-1">HireMind AI (Recruiter)</h3>
                <span className="text-emerald-400 text-[10px] font-medium flex items-center gap-1.5 uppercase tracking-widest">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   Evaluating...
                </span>
             </div>
          </div>
          <div className="flex items-center gap-5 text-[#aebac1]">
             <i className="fas fa-search cursor-pointer"></i>
             <button 
                onClick={() => setIsConfirming(true)}
                className="px-4 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest"
             >
                End Session
             </button>
          </div>
        </header>

        {/* Chat Body */}
        <div 
          ref={scrollRef} 
          className="flex-grow overflow-y-auto px-4 py-6 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-95 scrollbar-thin scrollbar-thumb-white/10"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
              <div 
                className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-xl text-sm shadow-sm relative ${
                  m.role === 'interviewer' 
                  ? 'bg-[#202c33] text-white rounded-tl-none border-l-2 border-indigo-500' 
                  : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                }`}
              >
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest opacity-40">
                   {m.role === 'interviewer' ? 'HireMind AI' : 'You'}
                </div>
                {m.text}
                <div className="mt-1 text-right text-[8px] opacity-40">
                   {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="bg-[#202c33] px-4 py-2 rounded-xl rounded-tl-none animate-pulse flex gap-1.5 items-center">
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
               </div>
            </div>
          )}
        </div>

        {/* WhatsApp Footer */}
        <footer className="bg-[#202c33] p-3 flex items-center gap-3">
           <button className="text-[#aebac1] px-2"><i className="fas fa-smile text-xl"></i></button>
           <button className="text-[#aebac1] px-2"><i className="fas fa-plus text-xl"></i></button>
           <div className="flex-grow relative">
              <input 
                 type="text" 
                 className="w-full bg-[#2a3942] border-none rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8696a0] outline-none"
                 placeholder="Type a message"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                 disabled={loading}
              />
           </div>
           <button 
              onClick={handleSendText}
              disabled={loading || !input.trim()}
              className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 disabled:opacity-50 transition-all"
           >
              <i className="fas fa-paper-plane text-lg"></i>
           </button>
        </footer>

        {isConfirming && (
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="bg-[#202c33] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
                 <h3 className="text-white font-bold text-xl">End Interview Session?</h3>
                 <p className="text-slate-400 text-sm">You will receive an AI-generated scorecard and technical analysis immediately.</p>
                 <div className="flex flex-col gap-3">
                    <button onClick={proceedToEvaluation} className="w-full py-3 bg-[#00a884] hover:bg-[#00c298] text-white rounded-xl font-bold transition-all">Confirm & Evaluate</button>
                    <button onClick={() => setIsConfirming(false)} className="w-full py-3 text-slate-500 hover:text-white transition-all font-medium text-sm">Go Back</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- RENDERING VOICE/VIDEO INTERVIEW (Google Meet Style) ---
  return (
    <div className="h-[calc(100vh-80px)] bg-[#1a1c1e] text-white flex flex-col relative overflow-hidden">
      
      {/* Participant Grid */}
      <div className="flex-grow p-4 lg:p-6 grid gap-4 grid-cols-1 md:grid-cols-2 transition-all duration-500">
        
        {/* AI Participant Card */}
        <div className="relative bg-[#202124] rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-lg border border-white/5">
           <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <i className="fas fa-user-tie text-indigo-400 text-xs"></i>
              <span className="text-xs font-bold tracking-tight">HireMind AI (Interviewer)</span>
           </div>
           
           <div className="w-full h-full flex items-center justify-center">
              <div className="relative w-48 h-48">
                 <div className={`absolute inset-0 bg-indigo-600/10 rounded-full ${isLive && !loading ? 'animate-ping' : ''}`}></div>
                 <div className="relative w-full h-full rounded-full bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center overflow-hidden">
                    <i className="fas fa-brain text-6xl text-indigo-500"></i>
                    <canvas ref={canvasRef} width={200} height={100} className="absolute bottom-4 left-0 w-full opacity-60" />
                 </div>
              </div>
           </div>
           
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
              {aiTranscription && showCaptions && (
                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center text-lg font-medium leading-relaxed italic animate-in fade-in slide-in-from-bottom-2">
                  {aiTranscription}
                </div>
              )}
           </div>
        </div>

        {/* Candidate Participant Card */}
        <div className="relative bg-[#202124] rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-lg border border-white/5">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
            <i className="fas fa-user text-emerald-400 text-xs"></i>
            <span className="text-xs font-bold tracking-tight">You (Candidate)</span>
          </div>

          {mode === 'video' ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />
              {isVideoOff && (
                 <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center">
                       <i className="fas fa-video-slash text-4xl text-zinc-600"></i>
                    </div>
                 </div>
              )}
              <canvas ref={frameCanvasRef} className="hidden" />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              <div className="relative w-32 h-32 rounded-full bg-zinc-800 border-2 border-white/5 flex items-center justify-center">
                 <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-user'} text-4xl text-zinc-600`}></i>
                 {!isMuted && <canvas ref={userCanvasRef} width={150} height={80} className="absolute bottom-2 left-0 w-full opacity-60" />}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {isMuted ? 'Microphone is Muted' : 'Speaking...'}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
            {userTranscription && showCaptions && (
              <div className="bg-emerald-500/10 backdrop-blur-md px-4 py-3 rounded-xl border border-emerald-500/20 text-center text-lg font-medium leading-relaxed italic animate-in fade-in slide-in-from-bottom-2">
                {userTranscription}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-[#1a1c1e] flex items-center justify-between px-8 border-t border-white/5 relative z-30 shadow-2xl">
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="hidden sm:block tabular-nums opacity-60">Session Live | Professional Review</span>
          <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
          <span className="text-indigo-400 font-bold hidden sm:block truncate max-w-[150px]">{techStack}</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-[#ea4335] text-white hover:bg-[#d93025]' : 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          
          {mode === 'video' && (
            <button 
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-[#ea4335] text-white hover:bg-[#d93025]' : 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
          )}

          <button 
            onClick={() => setShowCaptions(!showCaptions)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showCaptions ? 'bg-indigo-600 text-white' : 'bg-[#3c4043] hover:bg-[#4a4e52] text-white'}`}
            title="Captions"
          >
            <i className="fas fa-closed-captioning"></i>
          </button>

          <button 
            onClick={() => setIsConfirming(true)}
            className="px-6 py-2.5 bg-[#ea4335] hover:bg-[#d93025] text-white rounded-full font-bold flex items-center gap-2 transition-all ml-4"
          >
            <i className="fas fa-phone-slash rotate-[135deg]"></i>
            <span className="hidden sm:block">Leave Session</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
           <button className="p-3 hover:bg-[#3c4043] rounded-full text-white transition-all">
              <i className="fas fa-circle-info"></i>
           </button>
        </div>
      </div>

      {/* Evaluation Trigger Modal */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#202124] border border-white/10 rounded-3xl p-10 text-center space-y-8 animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 text-4xl">
                <i className="fas fa-check-double"></i>
             </div>
             <div>
                <h3 className="text-2xl font-bold mb-2">Finalize Evaluation?</h3>
                <p className="text-slate-400">Generate your performance report now. This will end the current session.</p>
             </div>
             <div className="flex flex-col gap-3">
                <button onClick={proceedToEvaluation} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold active:scale-95 transition-all">End & Grade</button>
                <button onClick={() => setIsConfirming(false)} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">Resume Session</button>
             </div>
          </div>
        </div>
      )}

      {evaluating && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[60] flex flex-col items-center justify-center gap-6">
           <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center">
              <h3 className="text-xl font-bold mb-1">Recruiter Assessment In Progress...</h3>
              <p className="text-slate-500">Mapping transcription data to industry-standard competencies.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTool;
