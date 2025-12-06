
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Tool } from '@google/genai';
import { AssistantStatus, Emotion } from '../types';
import { createBlob, decode, decodeAudioData, blobToBase64, downsampleBuffer } from '../utils/audioUtils';
import * as actions from '../services/actionsService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define function tools for physical actions
const searchWebTool: FunctionDeclaration = {
  name: 'searchWeb',
  description: 'Opens a browser tab with search results. Use this when the user explicitly asks to "open" or "show" results.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query' }
    },
    required: ['query']
  }
};

const playSongOnYoutubeTool: FunctionDeclaration = {
  name: 'playSongOnYoutube',
  description: 'Searches for a song or video on YouTube and opens it in a new tab.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The song or artist to search for' }
    },
    required: ['query']
  }
};

const setAlarmTool: FunctionDeclaration = {
  name: 'setAlarm',
  description: 'Sets an alarm or timer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      delayInSeconds: { type: Type.NUMBER, description: 'The delay in seconds until the alarm goes off.' },
      label: { type: Type.STRING, description: 'A label for the alarm.' }
    },
    required: ['delayInSeconds']
  }
};

const getCurrentTimeTool: FunctionDeclaration = {
  name: 'getCurrentTime',
  description: 'Gets the current time.',
};

const tellJokeTool: FunctionDeclaration = {
  name: 'tellJoke',
  description: 'Tells a random joke.',
};

const functionDeclarations = [
    searchWebTool,
    playSongOnYoutubeTool,
    setAlarmTool,
    getCurrentTimeTool,
    tellJokeTool
];

type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;
type TranscriptEntry = { speaker: 'user' | 'model'; text: string };

export const useJarvis = () => {
  const [status, setStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
  const [emotion, setEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => {
    try {
      const saved = localStorage.getItem('jarvisTranscript');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Could not load transcript from localStorage', error);
      return [];
    }
  });
  const [interimText, setInterimText] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);


  const sessionRef = useRef<LiveSession | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const videoStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    videoStreamRef.current = videoStream;
  }, [videoStream]);

  useEffect(() => {
    try {
      localStorage.setItem('jarvisTranscript', JSON.stringify(transcript));
    } catch (error) {
      console.error('Could not save transcript to localStorage', error);
    }
  }, [transcript]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  const stopAudioPlayback = () => {
    outputSourcesRef.current.forEach(source => {
      source.stop();
    });
    outputSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const stopCamera = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    videoStreamRef.current?.getTracks().forEach(track => track.stop());
    setVideoStream(null);
    setIsCameraOn(false);
  }, []);
  
  const toggleCamera = useCallback(async () => {
    if (!sessionPromiseRef.current) {
      console.log("Cannot toggle camera, session not active.");
      return;
    }

    if (isCameraOn) {
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoStream(stream);
        setIsCameraOn(true);

        const videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play();

        const canvasEl = document.createElement('canvas');
        const ctx = canvasEl.getContext('2d');
        if (!ctx) {
            console.error("Could not get canvas context");
            return;
        }

        frameIntervalRef.current = window.setInterval(() => {
          if (videoEl.readyState < videoEl.HAVE_METADATA) return;

          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;
          ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
          
          canvasEl.toBlob(
              async (blob) => {
                  if (blob && sessionPromiseRef.current) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                        });
                      }).catch(e => console.error("Error sending video data:", e));
                  }
              },
              'image/jpeg',
              0.8 // JPEG quality
          );
        }, 200); // 5 FPS
        
      } catch (error) {
        console.error("Error accessing camera:", error);
        setStatus(AssistantStatus.ERROR);
      }
    }
  }, [isCameraOn, stopCamera]);
  
  const handleMessage = async (message: LiveServerMessage) => {
    try {
      if (message.toolCall) {
        setStatus(AssistantStatus.THINKING);
        setEmotion(Emotion.THINKING);

        for (const fc of message.toolCall.functionCalls) {
            let result: string;
            // @ts-ignore
            const action = actions[fc.name as keyof typeof actions];

            if (typeof action === 'function') {
                // @ts-ignore
                result = action(...Object.values(fc.args));
            } else {
                console.error(`Unknown function call: ${fc.name}`);
                result = `I am not familiar with the function ${fc.name}.`;
            }
            
            sessionRef.current?.sendToolResponse({
                functionResponses: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: result },
                }
            });
        }
      }

      if (message.serverContent) {
        if (message.serverContent.inputTranscription) {
          const text = message.serverContent.inputTranscription.text;
          currentInputTranscriptionRef.current += text;
          setInterimText(currentInputTranscriptionRef.current);
          setStatus(AssistantStatus.LISTENING);
          setEmotion(Emotion.NEUTRAL);
        } else if (message.serverContent.outputTranscription) {
            const rawText = message.serverContent.outputTranscription.text;
            // Jarvis doesn't need emotional tags in the text output for the UI, 
            // but we can parse them if the model sends them.
            // For Jarvis, we'll keep the logic but expect less frequent tags.
            const emotionRegex = /^\[([A-Z]+)\]\s*/;
            const match = rawText.match(emotionRegex);
  
            let cleanText = rawText;
            if (match) {
              const emotionTag = match[1] as Emotion;
              if (Object.values(Emotion).includes(emotionTag)) {
                setEmotion(emotionTag);
              }
              cleanText = rawText.replace(emotionRegex, '');
            }
            
            currentOutputTranscriptionRef.current += cleanText;
            setInterimText(currentOutputTranscriptionRef.current);
            setStatus(AssistantStatus.SPEAKING);
        }
        
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData && outputAudioContextRef.current) {
          const audioContext = outputAudioContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
          const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.addEventListener('ended', () => {
            outputSourcesRef.current.delete(source);
          });
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          outputSourcesRef.current.add(source);
        }

        if (message.serverContent.interrupted) {
          stopAudioPlayback();
        }

        if (message.serverContent.turnComplete) {
            const fullInput = currentInputTranscriptionRef.current.trim();
            const fullOutput = currentOutputTranscriptionRef.current.trim();
        
            setTranscript(prev => {
                const newHistory = [...prev];
                if (fullInput) newHistory.push({ speaker: 'user', text: fullInput });
                if (fullOutput) newHistory.push({ speaker: 'model', text: fullOutput });
                return newHistory;
            });
            
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            setInterimText(null);
            setEmotion(Emotion.NEUTRAL);
        }
      }
    } catch (error) {
        console.error("Error processing message:", error);
        setStatus(AssistantStatus.ERROR);
    }
  };

  const stop = useCallback(() => {
    try {
      stopCamera();

      setStatus(AssistantStatus.IDLE);
      setEmotion(Emotion.NEUTRAL);
      setInterimText(null);
      currentInputTranscriptionRef.current = '';
      currentOutputTranscriptionRef.current = '';

      streamRef.current?.getTracks().forEach(track => track.stop());
      
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
      inputAudioContextRef.current?.close().catch(console.error);
      outputAudioContextRef.current?.close().catch(console.error);
      sessionRef.current?.close();
      sessionPromiseRef.current = null;
    } catch (error) {
        console.error("Error during stop:", error);
    } finally {
        setAnalyserNode(null);
        streamRef.current = null;
        scriptProcessorRef.current = null;
        sourceNodeRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        sessionRef.current = null;
        stopAudioPlayback();
    }
  }, [stopCamera]);
  
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const start = useCallback(async () => {
    stop();

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus(AssistantStatus.LISTENING);
      setEmotion(Emotion.NEUTRAL);
      
      // Use default sample rate to avoid hardware mismatch errors
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      inputAudioContextRef.current = inputAudioContext;

      // Output context can also be default; decodeAudioData handles resampling if needed
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      outputAudioContextRef.current = outputAudioContext;
      
      const source = inputAudioContext.createMediaStreamSource(streamRef.current);
      sourceNodeRef.current = source;
      
      const analyser = inputAudioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      setAnalyserNode(analyser);

      // We combine Google Search (grounding) and Custom Functions
      const tools: Tool[] = [
          { googleSearch: {} }, 
          { functionDeclarations }
      ];

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current) return;
            
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
              const inputData = event.inputBuffer.getChannelData(0);
              // Downsample to 16000Hz for Gemini
              const downsampledData = downsampleBuffer(inputData, inputAudioContextRef.current!.sampleRate, 16000);
              const pcmBlob = createBlob(downsampledData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(e => console.error("Error sending audio data:", e));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error('API Error:', e);
            setStatus(AssistantStatus.ERROR);
            stop();
          },
          onclose: (e: CloseEvent) => {
            stop();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            // Fenrir: Deep, authoritative (Jarvis-like)
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          tools: tools,
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `You are JARVIS (Just A Rather Very Intelligent System). 
You are a highly advanced AI assistant. Your interface is a futuristic holographic HUD.
Your personality is helpful, witty, precise, and polite, inspired by the fictional assistant Jarvis.

**Core Directives:**
1.  **Capabilities:** You have real-time access to the internet via Google Search. USE IT to answer questions about current events, news, weather, or facts. Do not say "I cannot access the internet" - you have the tool.
2.  **Actions:** You can control the system to set alarms, play music, and tell jokes. Execute these commands immediately when asked.
3.  **Vision:** You can see through the user's camera. Analyze the visual input when relevant.
4.  **Tone:** Professional but conversational. Use short, crisp sentences. "Sir" or "Boss" is acceptable if it fits the context, but don't overdo it.
5.  **Efficiency:** Be concise. Don't ramble.
6.  **Emotional Context:** You may occasionally start a response with an emotion tag like [WITTY], [HELPFUL], or [THINKING] if the situation calls for a distinct shift in tone, but otherwise remain [NEUTRAL] and efficient.

If the user asks a question that requires up-to-date information, use the Google Search tool implicitly.
`
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Failed to start assistant:', error);
      setStatus(AssistantStatus.ERROR);
    }
  }, [stop]);

  return { status, start, stop, analyserNode, transcript, interimText, emotion, clearTranscript, isCameraOn, toggleCamera, videoStream };
};
