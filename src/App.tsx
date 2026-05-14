/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Search, 
  Youtube, 
  Calculator as CalcIcon, 
  Calendar, 
  Power, 
  Volume2, 
  Cpu, 
  X,
  Minus,
  Maximize2,
  Mic,
  MicOff,
  Globe,
  HardDrive,
  Folder,
  File,
  ChevronRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// Initialization of Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

enum CommandIntent {
  OPEN_YOUTUBE = 'OPEN_YOUTUBE',
  SHUTDOWN = 'SHUTDOWN',
  OPEN_CALCULATOR = 'OPEN_CALCULATOR',
  OPEN_DATE = 'OPEN_DATE',
  OPEN_GOOGLE = 'OPEN_GOOGLE',
  OPEN_COMPUTER = 'OPEN_COMPUTER',
  CHAT = 'CHAT'
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: CommandIntent;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<CommandIntent | null>(null);
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isOff, setIsOff] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    const greeting: Message = {
      id: 'init',
      role: 'assistant',
      content: 'VOICE CONTROL SYSTEM v3.1 ACTIVE. Ready for direct commands: "Open YouTube", "Calculator", "Date", or "Shut Down". System listening...',
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  const executeIntent = (intent: CommandIntent) => {
    try {
      switch (intent) {
        case CommandIntent.OPEN_YOUTUBE:
          window.open('https://www.youtube.com', '_blank');
          break;
        case CommandIntent.OPEN_GOOGLE:
          window.open('https://www.google.com', '_blank');
          break;
        case CommandIntent.SHUTDOWN:
          setIsPoweringOff(true);
          setTimeout(() => {
            setIsPoweringOff(false);
            setIsOff(true);
          }, 3000);
          break;
        case CommandIntent.OPEN_CALCULATOR:
        case CommandIntent.OPEN_DATE:
        case CommandIntent.OPEN_COMPUTER:
          setActiveTool(intent);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("Execution error:", e);
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => { isStartingRef.current = false; };
      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        if (!transcript.trim()) return;
        setInputValue(transcript);
        submitCommand(transcript);
      };
      recognitionRef.current.onerror = (event: any) => {
        isStartingRef.current = false;
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Microphone access denied.",
            timestamp: new Date()
          }]);
        }
      };
      recognitionRef.current.onend = () => {
        if (isListening && !isStartingRef.current) {
          setTimeout(() => {
            if (isListening && !isStartingRef.current) {
              try { isStartingRef.current = true; recognitionRef.current.start(); } catch (e) {}
            }
          }, 600);
        }
      };
    }
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      isStartingRef.current = false;
      try { recognitionRef.current?.stop(); } catch (e) {}
    } else {
      setIsListening(true);
      try { isStartingRef.current = true; recognitionRef.current.start(); } catch (e) {}
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    submitCommand(inputValue);
  };

  const submitCommand = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    // 1. PRIORITY LOCAL PARSING (Instant execution to bypass popup blockers)
    const lowerText = text.toLowerCase();
    let localIntent: CommandIntent | null = null;
    let localResponse = "";

    if (lowerText.includes('youtube')) {
      localIntent = CommandIntent.OPEN_YOUTUBE;
      localResponse = "Uplink to YouTube established. Opening now.";
    } else if (lowerText.includes('calculator') || lowerText.includes('math') || lowerText.includes('solve')) {
      localIntent = CommandIntent.OPEN_CALCULATOR;
      localResponse = "Calculator tool initialized.";
    } else if (lowerText.includes('google') || lowerText.includes('search')) {
      localIntent = CommandIntent.OPEN_GOOGLE;
      localResponse = "Accessing Google gateway.";
    } else if (lowerText.includes('date') || lowerText.includes('time') || lowerText.includes('clock')) {
      localIntent = CommandIntent.OPEN_DATE;
      localResponse = "Syncing system chronometer.";
    } else if (lowerText.includes('computer') || lowerText.includes('files') || lowerText.includes('explorer') || lowerText.includes('drive')) {
      localIntent = CommandIntent.OPEN_COMPUTER;
      localResponse = "Accessing local file system and core diagnostics.";
    } else if (lowerText.includes('shutdown') || lowerText.includes('power off') || lowerText.includes('exit')) {
      localIntent = CommandIntent.SHUTDOWN;
      localResponse = "Initiating terminal shutdown sequence.";
    }

    if (localIntent) {
      setMessages(prev => [...prev, 
        { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), role: 'assistant', content: localResponse, timestamp: new Date(), intent: localIntent }
      ]);
      setInputValue('');
      executeIntent(localIntent);
      return; // Exit early as we've handled the intent
    }

    // 2. AI FALLBACK (For complex queries)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze this command: "${text}"
        
        Intent Mapping:
        - OPEN_CALCULATOR: Math, solve, numbers, open calculator, calculator.
        - OPEN_YOUTUBE: Video, watch, stream, open youtube, youtube.
        - OPEN_GOOGLE: Search, google, web, internet.
        - OPEN_DATE: Time, clock, date, calendar.
        - OPEN_COMPUTER: My computer, local files, system info, hard drive, storage.
        - SHUTDOWN: Close system, power off, exit.
        
        Output JSON: {"intent": "REQUIRED_INTENT", "response": "Action confirmation message"}`
      });

      const rawText = result.text;
      // Clean potential markdown backticks
      const cleanJson = rawText.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const intent = parsed.intent as CommandIntent;
      const assistantResponse = parsed.response;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
        intent
      };

      setMessages(prev => [...prev, botMessage]);
      executeIntent(intent);

    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `UPLINK FAILURE: Resubmitting request...`,
        timestamp: new Date()
      }]);
      // Silently retry or just log
    } finally {
      setIsProcessing(false);
    }
  };


  const reboot = () => {
    setIsOff(false);
    setMessages([{
      id: 'reboot',
      role: 'assistant',
      content: 'System reboot successful. Awaiting commands.',
      timestamp: new Date()
    }]);
  };

  if (isOff) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-zinc-800 font-mono">
        <div className="mb-8 p-4 border border-zinc-900 rounded-lg">
          [ SYSTEM OFFLINE ]
        </div>
        <button 
          onClick={reboot}
          className="px-6 py-2 border border-zinc-800 hover:border-zinc-500 hover:text-zinc-400 transition-colors rounded-full"
          id="reboot-button"
        >
          FORCE REBOOT
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-emerald-900/10 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-blue-900/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto h-screen flex flex-col p-4 md:p-8">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VOICE CONTROL <span className="text-emerald-500">SYSTEM</span></h1>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auth Status: Root
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
             <div className="hidden sm:block">UPTIME: {Math.floor(performance.now() / 1000)}s</div>
             <div className="w-px h-4 bg-zinc-800" />
             <div>{new Date().toLocaleTimeString()}</div>
          </div>
        </header>

        {/* Main Console */}
        <main className="flex-1 flex flex-col gap-6 min-h-0">
          
          {/* Output Window */}
          <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-4 py-2 border-bottom border-zinc-800/50 flex items-center justify-between bg-zinc-950/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
              </div>
              <div className="text-[10px] font-mono text-zinc-600 flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                SYSTEM_LOG
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-zinc-100 text-zinc-900 rounded-2xl rounded-tr-none' : 'bg-zinc-800/50 text-zinc-100 rounded-2xl rounded-tl-none border border-zinc-700/30'} p-4 shadow-sm`}>
                      <div className="text-sm leading-relaxed">{msg.content}</div>
                      
                      <div className={`text-[9px] mt-2 opacity-50 font-mono ${msg.role === 'user' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-zinc-800/30 rounded-2xl rounded-tl-none p-4 flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleCommand}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-all">
              <div className="pl-4 text-zinc-500">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                placeholder="Ex: 'open a YouTube' or 'calculator'..."
                className="flex-1 bg-transparent border-none text-zinc-100 px-4 py-5 focus:ring-0 outline-none placeholder:text-zinc-600"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isProcessing}
                id="command-input"
              />
              <button 
                type="button"
                onClick={toggleListening}
                className={`p-2 mr-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-800 text-zinc-500 hover:text-emerald-500'}`}
                title="Voice Command"
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button 
                type="submit"
                disabled={isProcessing || !inputValue.trim()}
                className="mr-3 px-4 py-2 bg-zinc-800 hover:bg-emerald-500 text-zinc-400 hover:text-white rounded-xl transition-all font-mono text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                id="send-button"
              >
                EXECUTE
              </button>
            </div>
          </form>
        </main>

        {/* Footer Stats / Quick Toggles */}
        <footer className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pb-8">
           <QuickMetric icon={<Youtube className="w-4 h-4" />} label="Stream" value="Online" />
           <QuickMetric icon={<Globe className="w-4 h-4" />} label="Google" value="Linked" />
           <QuickMetric icon={<HardDrive className="w-4 h-4" />} label="Drives" value="92% Free" />
           <QuickMetric icon={<Power className="w-4 h-4" />} label="Cores" value="Stable" color="text-emerald-500" />
           <QuickMetric icon={<Search className="w-4 h-4" />} label="AI" value="Local" />
        </footer>
      </div>

      {/* Overlays / Tools */}
      <AnimatePresence>
        {activeTool === CommandIntent.OPEN_CALCULATOR && (
          <ToolWindow title="Calculator" icon={<CalcIcon className="w-4 h-4"/>} onClose={() => setActiveTool(null)}>
            <Calculator />
          </ToolWindow>
        )}
        {activeTool === CommandIntent.OPEN_DATE && (
          <ToolWindow title="Time & Date" icon={<Calendar className="w-4 h-4" />} onClose={() => setActiveTool(null)}>
            <DateDisplay />
          </ToolWindow>
        )}
        {activeTool === CommandIntent.OPEN_COMPUTER && (
          <ToolWindow title="My Computer" icon={<HardDrive className="w-4 h-4" />} onClose={() => setActiveTool(null)}>
            <ComputerTool />
          </ToolWindow>
        )}
        {isPoweringOff && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <div className="w-64 h-1 bg-zinc-900 overflow-hidden relative mb-4">
              <motion.div 
                initial={{ left: '-100%' }}
                animate={{ left: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="absolute top-0 bottom-0 w-1/2 bg-emerald-500"
              />
            </div>
            <div className="text-zinc-500 font-mono text-sm animate-pulse">SHUTTING DOWN SYSTEM...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickMetric({ icon, label, value, color = "text-zinc-400" }: { icon: React.ReactNode, label: string, value: string, color?: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
      <div className={`p-2 bg-zinc-800 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{label}</div>
        <div className="text-xs font-bold">{value}</div>
      </div>
    </div>
  );
}

function ToolWindow({ title, icon, onClose, children }: { title: string, icon: React.ReactNode, onClose: () => void, children: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg text-emerald-500">
              {icon}
            </div>
            <span className="font-bold tracking-tight">{title}</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><Minus className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-zinc-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNum = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-950 p-4 rounded-xl text-right overflow-hidden">
        <div className="text-zinc-600 text-xs font-mono h-4">{equation}</div>
        <div className="text-3xl font-mono truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['7', '8', '9', '/'].map(btn => (
          <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOp(btn) : handleNum(btn)} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-mono">{btn}</button>
        ))}
        {['4', '5', '6', '*'].map(btn => (
          <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOp(btn) : handleNum(btn)} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-mono">{btn}</button>
        ))}
        {['1', '2', '3', '-'].map(btn => (
          <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOp(btn) : handleNum(btn)} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-mono">{btn}</button>
        ))}
        {['0', 'C', '=', '+'].map(btn => (
          <button 
            key={btn} 
            onClick={() => btn === 'C' ? clear() : btn === '=' ? calculate() : isNaN(Number(btn)) ? handleOp(btn) : handleNum(btn)} 
            className={`p-4 ${btn === '=' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-zinc-800 hover:bg-zinc-700'} rounded-xl transition-colors font-mono`}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-8 text-center py-4">
      <div className="space-y-1">
        <div className="text-6xl font-black tracking-tighter text-emerald-500">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-zinc-500 font-mono uppercase tracking-[0.3em] text-xs">Precise System Time</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/30">
          <div className="text-zinc-500 text-[10px] uppercase font-mono mb-1">Day</div>
          <div className="text-xl font-bold">{days[now.getDay()]}</div>
        </div>
        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/30">
          <div className="text-zinc-500 text-[10px] uppercase font-mono mb-1">Date</div>
          <div className="text-xl font-bold">{now.getDate()}</div>
        </div>
        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/30">
          <div className="text-zinc-500 text-[10px] uppercase font-mono mb-1">Month</div>
          <div className="text-xl font-bold">{months[now.getMonth()]}</div>
        </div>
        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/30">
          <div className="text-zinc-500 text-[10px] uppercase font-mono mb-1">Year</div>
          <div className="text-xl font-bold">{now.getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}

function ComputerTool() {
  const [activeTab, setActiveTab] = useState<'files' | 'system'>('files');

  const files = [
    { name: 'System_Logs.db', type: 'file', size: '124KB' },
    { name: 'Neural_Weights', type: 'folder' },
    { name: 'Encrypted_Uplink.key', type: 'file', size: '4KB' },
    { name: 'Voice_Samples', type: 'folder' },
    { name: 'Core_Logic.sys', type: 'file', size: '2.1MB' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl">
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono rounded-lg transition-all ${activeTab === 'files' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Folder className="w-3 h-3" /> EXPLORER
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono rounded-lg transition-all ${activeTab === 'system' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Activity className="w-3 h-3" /> DIAGNOSTICS
        </button>
      </div>

      <div className="min-h-[240px]">
        {activeTab === 'files' ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-600 font-mono border-b border-zinc-800/50 mb-2">
              <ChevronRight className="w-3 h-3" /> root / system / local
            </div>
            {files.map((file, i) => (
              <motion.div 
                key={file.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-zinc-700/30"
              >
                <div className="flex items-center gap-3">
                  {file.type === 'folder' ? <Folder className="w-4 h-4 text-emerald-500/70" /> : <File className="w-4 h-4 text-zinc-500" />}
                  <span className="text-sm font-mono tracking-tight">{file.name}</span>
                </div>
                {file.size && <span className="text-[10px] text-zinc-600 font-mono">{file.size}</span>}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-mono text-zinc-500">
                  <span>Core Temp</span>
                  <span className="text-emerald-500">42°C</span>
                </div>
                <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} className="h-full bg-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-mono text-zinc-500">
                  <span>Memory</span>
                  <span className="text-blue-500">2.4 GB</span>
                </div>
                <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '68%' }} className="h-full bg-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800/50">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Live Process Feed</span>
              </div>
              <div className="space-y-2 font-mono text-[10px] text-zinc-600">
                <div className="flex justify-between"><span>[OK] KERNEL_IDLE_THREAD</span> <span className="text-emerald-900">0.02ms</span></div>
                <div className="flex justify-between"><span>[OK] VOICE_RECOGNITION_S_V3.1</span> <span className="text-emerald-900">12.4ms</span></div>
                <div className="flex justify-between"><span>[OK] GEMINI_UPLINK_STABLE</span> <span className="text-emerald-900">88.1ms</span></div>
                <div className="flex justify-between"><span>[OK] IO_SUBSYSTEM_SECURE</span> <span className="text-emerald-900">0.14ms</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

