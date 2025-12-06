
import React from 'react';
import { useJarvis } from './hooks/useJarvis';
import { AssistantStatus, Emotion } from './types';
import Visualizer from './components/Visualizer';
import { MicIcon } from './components/icons/MicIcon';
import { CloseIcon } from './components/icons/CloseIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { CameraIcon } from './components/icons/CameraIcon';
import { CameraOffIcon } from './components/icons/CameraOffIcon';
import StatusIndicator from './components/StatusIndicator';
import TranscriptDisplay from './components/TranscriptDisplay';
import CameraFeed from './components/CameraFeed';

const App: React.FC = () => {
  const {
    status,
    start,
    stop,
    analyserNode,
    transcript,
    interimText,
    emotion,
    clearTranscript,
    isCameraOn,
    toggleCamera,
    videoStream,
  } = useJarvis();

  const isListening = status !== AssistantStatus.IDLE;

  // Jarvis Color Scheme: Cyan/Blue focused
  const emotionBorderColors: Record<Emotion, string> = {
    [Emotion.NEUTRAL]: 'border-cyan-500/60',
    [Emotion.HAPPY]: 'border-cyan-400/80',
    [Emotion.SARCASTIC]: 'border-blue-500/80',
    [Emotion.WITTY]: 'border-sky-500/80',
    [Emotion.HELPFUL]: 'border-teal-400/80',
    [Emotion.THINKING]: 'border-indigo-500/80',
  };
  
  const shadowColors: Record<Emotion, string> = {
    [Emotion.NEUTRAL]: 'shadow-cyan-500/20',
    [Emotion.HAPPY]: 'shadow-cyan-400/30',
    [Emotion.SARCASTIC]: 'shadow-blue-500/30',
    [Emotion.WITTY]: 'shadow-sky-500/30',
    [Emotion.HELPFUL]: 'shadow-teal-400/30',
    [Emotion.THINKING]: 'shadow-indigo-500/30',
  };

  return (
    <div className="bg-black text-cyan-50 h-screen w-full flex flex-col items-center justify-center font-mono overflow-hidden relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
             }}>
        </div>
        
        {/* Decorative HUD Circles */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-[600px] h-[600px] border border-cyan-900/30 rounded-full animate-[spin_60s_linear_infinite] ${isListening ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}></div>
            <div className={`absolute w-[500px] h-[500px] border border-cyan-800/20 rounded-full animate-[spin_40s_linear_infinite_reverse] ${isListening ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}></div>
        </div>

      <TranscriptDisplay transcript={transcript} interimText={interimText} />
      <CameraFeed stream={videoStream} isCameraOn={isCameraOn} />

      <main className="w-full flex-grow flex items-center justify-center relative z-10">
        <Visualizer analyserNode={analyserNode} emotion={emotion} />
        
        {/* Arc Reactor Core */}
        <div className={`absolute transition-all duration-700 ease-in-out ${isListening ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div className="relative flex items-center justify-center">
                 {/* Outer Glow Ring */}
                <div
                className={`absolute rounded-full w-72 h-72 border-2 border-dashed ${emotionBorderColors[emotion]} animate-[spin_10s_linear_infinite] opacity-40`}
                />
                 {/* Inner Core */}
                <div
                className={`rounded-full w-64 h-64 bg-black/60 border-4 backdrop-blur-sm shadow-[0_0_50px_rgba(0,255,255,0.3)] transition-all duration-300 ${emotionBorderColors[emotion]} ${shadowColors[emotion]}`}
                />
            </div>
        </div>
      </main>

      <footer className="w-full flex flex-col items-center pb-8 pt-4 z-20">
        <StatusIndicator status={status} />
        
        <div className="flex justify-center items-center space-x-6 mt-6">
          <button
            onClick={stop}
            className={`p-5 rounded-full border border-red-500/30 bg-red-900/10 hover:bg-red-900/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-300 ${isListening ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
            disabled={!isListening}
            aria-label="Stop Assistant"
          >
            <CloseIcon className="w-6 h-6 text-red-400" />
          </button>
          
          <button
            onClick={start}
            className={`p-6 rounded-full border border-cyan-500/50 bg-cyan-900/10 hover:bg-cyan-900/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed transform hover:scale-105`}
            disabled={isListening}
            aria-label="Start Assistant"
          >
            <MicIcon className="w-8 h-8 text-cyan-300" />
          </button>

          <button
            onClick={toggleCamera}
            className="p-5 rounded-full border border-cyan-500/30 bg-cyan-900/10 hover:bg-cyan-900/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
            disabled={!isListening}
            aria-label={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? <CameraOffIcon className="w-6 h-6 text-cyan-400" /> : <CameraIcon className="w-6 h-6 text-cyan-400" />}
          </button>

          <button
            onClick={clearTranscript}
            className="p-5 rounded-full border border-gray-500/30 bg-gray-900/10 hover:bg-gray-900/30 hover:shadow-[0_0_20px_rgba(156,163,175,0.3)] transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
            disabled={isListening || transcript.length === 0}
            aria-label="Clear History"
          >
            <TrashIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <div className="mt-6 flex items-center space-x-2 opacity-50">
             <div className="h-px w-12 bg-cyan-900"></div>
             <p className="text-cyan-900 text-xs tracking-[0.2em] uppercase font-bold">J.A.R.V.I.S. SYSTEM ONLINE</p>
             <div className="h-px w-12 bg-cyan-900"></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
