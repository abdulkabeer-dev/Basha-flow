import React, { useState, useEffect } from 'react';
import { Mic, Loader2, Volume2, AlertCircle, RefreshCw, Settings, X, Key } from 'lucide-react';
import { recognizeSpeech, speakText, stopAllSpeech } from './lib/speech';
import { translateText } from './lib/translator';

type User = 1 | 2;

const LANGUAGES = [
  { code: 'te-IN', name: 'Telugu', label: 'తెలుగు (Telugu)' },
  { code: 'kn-IN', name: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'hi-IN', name: 'Hindi', label: 'हिंदी (Hindi)' },
  { code: 'en-IN', name: 'English', label: 'English' },
];

export default function App() {
  const [user1Lang, setUser1Lang] = useState('te-IN');
  const [user2Lang, setUser2Lang] = useState('kn-IN');
  
  // App State
  const [activeSpeaker, setActiveSpeaker] = useState<User | null>(null);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'translating' | 'speaking'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('GEMINI_CUSTOM_KEY') || '');

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopAllSpeech();
    };
  }, []);

  const handleStartTurn = async (speaker: User) => {
    // Reset state for new turn
    setErrorMsg(null);
    setFinalText('');
    setTranslatedText('');
    setInterimText('');
    
    const sourceLangCode = speaker === 1 ? user1Lang : user2Lang;
    const targetLangCode = speaker === 1 ? user2Lang : user1Lang;
    const sourceLangName = LANGUAGES.find(l => l.code === sourceLangCode)?.name || '';
    const targetLangName = LANGUAGES.find(l => l.code === targetLangCode)?.name || '';

    try {
      // 1. Listen
      setActiveSpeaker(speaker);
      setStatus('listening');
      
      const spokenText = await recognizeSpeech(sourceLangCode, (interim) => {
        setInterimText(interim);
      });

      if (!spokenText.trim()) {
        setStatus('idle');
        setActiveSpeaker(null);
        return; // Empty recording
      }

      setFinalText(spokenText);
      setInterimText(''); // Clear interim

      // 2. Translate
      setStatus('translating');
      const translation = await translateText(spokenText, sourceLangName, targetLangName, customApiKey);
      setTranslatedText(translation);

      // 3. Speak
      setStatus('speaking');
      await speakText(translation, targetLangCode);
      
      setStatus('idle');
      setActiveSpeaker(null);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setStatus('idle');
      setActiveSpeaker(null);
      stopAllSpeech();
    }
  };

  const handleStop = () => {
    stopAllSpeech();
    setStatus('idle');
    setActiveSpeaker(null);
    setInterimText('');
  };

  const swapLanguages = () => {
    setUser1Lang(user2Lang);
    setUser2Lang(user1Lang);
  };

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    if (key.trim()) {
      localStorage.setItem('GEMINI_CUSTOM_KEY', key.trim());
    } else {
      localStorage.removeItem('GEMINI_CUSTOM_KEY');
    }
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] font-sans flex flex-col p-4 md:p-8 overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 md:mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-white rounded-sm rotate-45"></div>
          </div>
          <h1 className="text-xl md:text-2xl font-light tracking-widest uppercase">Bhasha<span className="font-bold">Flow</span></h1>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {(status !== 'idle') && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status !== 'idle' ? 'bg-emerald-500' : 'bg-white/20'}`}></span>
            </span>
            <span className={`hidden md:inline-block text-[10px] md:text-xs tracking-widest uppercase font-medium ${status !== 'idle' ? 'text-emerald-500' : 'text-white/40'}`}>
              {status !== 'idle' ? 'Live Connection' : 'Ready'}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-white/20 hidden md:block"></div>
          <span className="hidden md:inline-block text-[10px] text-white/40 tracking-tighter uppercase mr-2">GEMINI 3.1 FLASH LITE</span>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col pb-12 relative">
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl flex items-start space-x-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[10px] uppercase tracking-widest mb-1">System Error</p>
              <p className="text-sm opacity-90">{errorMsg}</p>
              {errorMsg.includes('API Key') && (
                 <button onClick={() => { setErrorMsg(null); setIsSettingsOpen(true); }} className="mt-2 text-xs font-medium underline opacity-80 hover:opacity-100">
                   Open Settings
                 </button>
              )}
            </div>
            <button onClick={() => setErrorMsg(null)} className="ml-auto text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
              Dismiss
            </button>
          </div>
        )}

        {/* Translation Panels Container */}
        <div className={`flex flex-col lg:flex-row gap-6 md:gap-8 flex-1 h-full items-stretch transition-opacity duration-300 ${isSettingsOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {/* User 1 Panel */}
          <UserPanel 
            userNumber={1}
            lang={user1Lang}
            setLang={setUser1Lang}
            isActive={activeSpeaker === 1}
            isRecipient={activeSpeaker === 2}
            status={status}
            finalText={activeSpeaker === 1 ? finalText : (activeSpeaker === 2 ? translatedText : '')}
            interimText={activeSpeaker === 1 ? interimText : ''}
            onStart={() => handleStartTurn(1)}
            onStop={handleStop}
          />

          {/* Swap Languages Button */}
          <div className="flex justify-center items-center lg:-mx-4 z-10 shrink-0">
            <button 
              onClick={swapLanguages}
              className="bg-[#0A0A0B] p-4 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:scale-105 transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
              title="Swap Languages"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* User 2 Panel */}
          <UserPanel 
            userNumber={2}
            lang={user2Lang}
            setLang={setUser2Lang}
            isActive={activeSpeaker === 2}
            isRecipient={activeSpeaker === 1}
            status={status}
            finalText={activeSpeaker === 2 ? finalText : (activeSpeaker === 1 ? translatedText : '')}
            interimText={activeSpeaker === 2 ? interimText : ''}
            onStart={() => handleStartTurn(2)}
            onStop={handleStop}
          />
        </div>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
             <div className="bg-[#121214] border border-white/10 p-8 rounded-2xl w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-light tracking-widest uppercase flex items-center gap-2">
                   <Key className="w-5 h-5 text-purple-400" />
                   Configuration
                 </h2>
                 <button onClick={() => setIsSettingsOpen(false)} className="text-white/40 hover:text-white transition-colors">
                   <X className="w-6 h-6" />
                 </button>
               </div>
               
               <div className="mb-8">
                 <label htmlFor="apiKey" className="block text-xs font-medium uppercase tracking-widest text-white/60 mb-2">Gemini API Key</label>
                 <input 
                   id="apiKey"
                   type="password"
                   placeholder="Enter your API Key..."
                   className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
                   value={customApiKey}
                   onChange={(e) => setCustomApiKey(e.target.value)}
                 />
                 <p className="mt-2 text-[10px] text-white/40">
                   Your API key will only be stored locally in your browser to power translations. Get one from Google AI Studio.
                 </p>
               </div>

               <div className="flex justify-end gap-3">
                 <button 
                   onClick={() => setIsSettingsOpen(false)}
                   className="px-6 py-2 rounded-full border border-white/10 text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => handleSaveApiKey(customApiKey)}
                   className="px-6 py-2 rounded-full bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-colors"
                 >
                   Save
                 </button>
               </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

interface UserPanelProps {
  userNumber: User;
  lang: string;
  setLang: (l: string) => void;
  isActive: boolean;
  isRecipient: boolean;
  status: 'idle' | 'listening' | 'translating' | 'speaking';
  finalText: string;
  interimText: string;
  onStart: () => void;
  onStop: () => void;
}

function UserPanel({ 
  userNumber, 
  lang, 
  setLang, 
  isActive, 
  isRecipient, 
  status, 
  finalText, 
  interimText, 
  onStart, 
  onStop 
}: UserPanelProps) {
  
  // Decide panel border and glow state based on Sophisticated Dark theme
  let panelBorder = "border-white/10";
  let statusColor = "text-white/40";
  let statusText = "Ready";
  let dotColor = "bg-white/20";
  
  if (isActive && status === 'listening') {
    panelBorder = "border-emerald-500/50 bg-white/[0.04]";
    statusColor = "text-emerald-400";
    dotColor = "bg-emerald-400";
    statusText = "Listening";
  } else if (isRecipient && status === 'speaking') {
    panelBorder = "border-blue-500/50 bg-white/[0.04]";
    statusColor = "text-blue-400";
    dotColor = "bg-blue-400";
    statusText = "Speaking";
  } else if (isActive && status === 'translating') {
    panelBorder = "border-purple-500/50 bg-white/[0.04]";
    statusColor = "text-purple-400";
    dotColor = "bg-purple-400";
    statusText = "Translating";
  }

  return (
    <div className={`flex flex-col bg-white/[0.03] border rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 flex-1 ${panelBorder}`}>
      
      {/* Panel Header */}
      <div className="flex justify-between items-start mb-8 md:mb-12">
        <div className="relative w-full pr-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-1">Speaker {userNumber.toString().padStart(2, '0')}</span>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            disabled={isActive || (status !== 'idle')}
            className="w-full bg-transparent text-3xl md:text-3xl font-serif italic text-white/90 border-none p-0 focus:ring-0 cursor-pointer appearance-none outline-none disabled:opacity-60"
          >
            {LANGUAGES.map(l => (
               <option key={l.code} value={l.code} className="bg-[#0A0A0B] text-[#EDEDED] font-sans not-italic text-base py-2">{l.label}</option>
            ))}
          </select>
          {/* Custom Dropdown Caret */}
          <div className="pointer-events-none absolute right-2 top-[32px] text-white/30">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </div>
        </div>
        
        {/* Top-Right Badge */}
        <div className={`px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-wider shrink-0 transition-opacity duration-300 ${status !== 'idle' ? (isActive || isRecipient ? 'opacity-100' : 'opacity-0') : 'opacity-0'}`}>
          {isActive ? 'Input Active' : (isRecipient ? 'Output Active' : '')}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 flex flex-col justify-center min-h-[160px]">
        {(finalText || interimText) ? (
          <div className="space-y-4">
             <p className="text-3xl md:text-4xl font-serif leading-tight text-white/90">
               "{finalText || interimText}"
             </p>
          </div>
        ) : (
          <p className="text-lg md:text-xl text-white/20 italic font-serif text-center select-none">
            Tap the microphone to speak
          </p>
        )}
      </div>

      {/* Panel Footer & Actions */}
      <div className="mt-8 pt-6 flex justify-between items-center border-t border-white/5">
        
        {/* Status Area */}
        <div className="flex items-center gap-3">
          {isActive && status === 'translating' ? (
             <Loader2 className={`w-3.5 h-3.5 animate-spin ${statusColor}`} />
          ) : (
            <span className="relative flex h-2 w-2">
              {(status !== 'idle' && (isActive || isRecipient)) && (
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
            </span>
          )}
          <span className={`text-[10px] uppercase tracking-widest ${statusColor}`}>{statusText}</span>
        </div>

        {/* Buttons */}
        <div>
          {isActive && status === 'listening' ? (
            <button
              onClick={onStop}
              className="w-12 h-12 md:w-14 md:h-14 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all hover:scale-105 active:scale-95"
              aria-label="Stop recording"
            >
              <div className="w-4 h-4 bg-current rounded-sm" />
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={status !== 'idle' && !isActive}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 transform border 
                ${status !== 'idle' ? 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed scale-95' 
                                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white hover:text-black hover:scale-105 active:scale-95'}
              `}
              aria-label="Start recording"
            >
              <Mic className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

