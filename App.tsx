import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { PluginRegistry } from './components/PluginRegistry';
import { Hud } from './components/Hud';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { ErrorDisplay } from './components/ErrorDisplay';
import { analyzeCode, executeCode } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

export interface Message {
  role: 'fux' | 'user' | 'system_core';
  content: string;
}

interface Plugin {
  power_name: string;
  source: string;
  category?: string;
}

// According to guidelines, API key must be from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'fux', content: 'FuX CORE ONLINE\nSTATUS: NOMINAL\nAwaiting directive. Use /help for a list of commands.' }
  ]);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<string | null>(null);

  // UI State
  const [isPluginRegistryOpen, setIsPluginRegistryOpen] = useState(false);
  const [isConnectionsPanelOpen, setIsConnectionsPanelOpen] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);

  // Plugin State
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSessionInitializing, setIsSessionInitializing] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [activatingModule, setActivatingModule] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);
  const currentInputTranscriptionRef = useRef('');

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      // The supported audio MIME type is 'audio/pcm'. Do not use other types.
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startVoiceSession = useCallback(async () => {
    if (isListening || isSessionInitializing) return;

    setIsSessionInitializing(true);
    setLiveTranscription('');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;

      const newAnalyser = inputAudioContext.createAnalyser();
      newAnalyser.fftSize = 2048;
      setAnalyser(newAnalyser);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(newAnalyser); // Connect analyser here
            newAnalyser.connect(inputAudioContext.destination);

            setIsListening(true);
            setIsSessionInitializing(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setLiveTranscription(currentInputTranscriptionRef.current);
            }

             if (message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current.trim();
                if (fullInput) {
                    addMessage({ role: 'user', content: fullInput });
                    handleSendMessage(fullInput);
                }
                currentInputTranscriptionRef.current = '';
                setLiveTranscription('');
             }

            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              const outputAudioContext = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContext.currentTime,
              );
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContext,
                24000,
                1,
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Voice session error:', e);
            setError('Voice connection failed. Please try again.');
            stopVoiceSession();
          },
          onclose: (e: CloseEvent) => {
            stopVoiceSession(false); // Don't try to close the session again
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
        },
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error('Failed to get user media', err);
      setError('Could not access microphone. Please check permissions.');
      setIsSessionInitializing(false);
    }
  }, [isListening, isSessionInitializing]);

  const stopVoiceSession = useCallback((closeSession = true) => {
    if (closeSession && sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    setIsListening(false);
    setIsSessionInitializing(false);
    setAnalyser(null);
    setLiveTranscription('');
    currentInputTranscriptionRef.current = '';
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const handleToggleVoice = () => {
    if (isListening) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  const handleSendMessage = async (messageToSend?: string) => {
    const messageContent = messageToSend || input;
    if (!messageContent.trim()) return;

    if (!messageToSend) {
      addMessage({ role: 'user', content: messageContent });
    }
    setInput('');
    setIsReplying(true);
    setError(null);

    try {
      if (messageContent.startsWith('/')) {
        await handleCommand(messageContent);
      } else {
        setCurrentTask('Analyzing request...');
        const response = await analyzeCode(messageContent, messages);
        addMessage({ role: 'fux', content: response });
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || 'An unexpected error occurred.');
      addMessage({ role: 'system_core', content: `ERROR: ${err.message}` });
    } finally {
      setIsReplying(false);
      setCurrentTask(null);
    }
  };

  const handleCommand = async (command: string) => {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    switch (cmd) {
      case '/help':
        addMessage({ role: 'fux', content: 'Available Commands:\n/help - Show this message\n/ingest <source> - Ingest a new Power Module\n/powers - List ingested Power Modules\n/use <power_name> <...args> - Use a Power Module' });
        break;
      case '/ingest':
        // Mock ingestion
        setCurrentTask('Ingesting Power Module...');
        await new Promise(res => setTimeout(res, 1500));
        const newPlugin: Plugin = { power_name: `plugin_${plugins.length + 1}`, source: args.join(' ') || 'Unknown Source', category: 'General' };
        setPlugins(prev => [...prev, newPlugin]);
        addMessage({ role: 'system_core', content: `Successfully ingested Power Module: ${newPlugin.power_name} from ${newPlugin.source}`});
        break;
      case '/powers':
        if (plugins.length === 0) {
          addMessage({ role: 'fux', content: 'No Power Modules have been ingested. Use /ingest <source> to add one.' });
        } else {
          const powerList = plugins.map(p => `- ${p.power_name} (${p.source})`).join('\n');
          addMessage({ role: 'fux', content: `Available Power Modules:\n${powerList}` });
        }
        break;
      case '/use':
        const [powerName, ...powerArgs] = args;
        if (!powerName) {
            addMessage({ role: 'fux', content: 'Please specify a Power Module to use. Usage: /use <power_name> <...args>' });
            break;
        }
        setCurrentTask(`Executing Power Module: ${powerName}`);
        try {
            const result = await executeCode(powerName, powerArgs);
            addMessage({ role: 'system_core', content: `Execution Result from ${powerName}:\n${result}` });
        } catch (e: any) {
            addMessage({ role: 'system_core', content: `Execution failed for ${powerName}: ${e.message}` });
        }
        break;
      default:
        addMessage({ role: 'fux', content: `Unknown command: ${cmd}. Use /help for a list of available commands.` });
    }
  }

  const handlePluginSelect = (powerName: string) => {
    setInput(`/use ${powerName} <arguments>`);
    setIsPluginRegistryOpen(false);
  }

  return (
    <div className="bg-slate-950 text-slate-300 font-sans min-h-screen flex flex-col items-center">
      <Hud 
        isListening={isListening}
        isInitializing={isSessionInitializing}
        liveTranscription={liveTranscription}
        activatingModule={currentTask}
        analyser={analyser}
      />
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col flex-grow">
        <Header 
          onToggleRegistry={() => setIsPluginRegistryOpen(p => !p)}
          isTtsEnabled={isTtsEnabled}
          onToggleTts={() => setIsTtsEnabled(p => !p)}
          onToggleConnections={() => setIsConnectionsPanelOpen(p => !p)}
        />
        {error && <ErrorDisplay message={error} />}
        <main className="flex-grow">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            isReplying={isReplying}
            currentTask={currentTask}
            isTtsEnabled={isTtsEnabled}
            isListening={isListening}
            isSessionInitializing={isSessionInitializing}
            onToggleVoice={handleToggleVoice}
          />
        </main>
      </div>
      <PluginRegistry 
        isOpen={isPluginRegistryOpen}
        plugins={plugins}
        onPluginSelect={handlePluginSelect}
        onClose={() => setIsPluginRegistryOpen(false)}
      />
      <ConnectionsPanel
        isOpen={isConnectionsPanelOpen}
        onClose={() => setIsConnectionsPanelOpen(false)}
      />
    </div>
  );
};

// This is a new utils file but for simplicity of the fix, it is added here.
// In a real project this should be in a separate file `utils/audioUtils.ts`.
namespace audioUtils {
  export function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  export function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  export async function decodeAudioData(
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
}

// Make them available in the file scope
const { encode, decode, decodeAudioData } = audioUtils;

export default App;