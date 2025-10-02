
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { PluginRegistry } from './components/PluginRegistry';
import { Hud } from './components/Hud';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { ErrorDisplay } from './components/ErrorDisplay';
import { PowersGuide } from './components/PowersGuide';
import { analyzeCode, executeCode, generateImage, googleSearch, createExecutionPlan, categorizePlugin, AgentStep } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { vmixService } from './services/vmixService';
import { blenderService } from './services/blenderService';
import { videoService } from './services/videoService';
import { spotifyService } from './services/spotifyService';
import { twitchService } from './services/twitchService';

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export type { AgentStep };

export interface Message {
  role: 'fux' | 'user' | 'system_core';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  sources?: GroundingChunk[];
  agentPlan?: AgentStep[];
}

export interface Plugin {
  power_name: string;
  source: string;
  category: string;
  description: string;
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
  const [isPowersGuideOpen, setIsPowersGuideOpen] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);

  // Plugin State
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [favoritePowers, setFavoritePowers] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    // Load favorites from localStorage on initial mount
    try {
      const storedFavorites = localStorage.getItem('fux_favorite_powers');
      if (storedFavorites) {
        setFavoritePowers(new Set(JSON.parse(storedFavorites)));
      }
    } catch (e) {
      console.error("Failed to load favorite powers from localStorage", e);
    }
  }, []);

  useEffect(() => {
    // Save favorites to localStorage whenever they change
    try {
      localStorage.setItem('fux_favorite_powers', JSON.stringify(Array.from(favoritePowers)));
    } catch (e) {
      console.error("Failed to save favorite powers to localStorage", e);
    }
  }, [favoritePowers]);


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
  
  const handleVMixCommand = async (args: string[]): Promise<string> => {
    const [subCommand, ...rest] = args;
    
    switch (subCommand?.toLowerCase()) {
        case 'switch': {
            const [keyword, inputId] = rest;
            if (keyword?.toLowerCase() === 'input' && inputId) {
                await vmixService.switchInput(inputId);
                return `vMix command successful: Switched to input ${inputId}`;
            }
            break;
        }
        case 'transition': {
            const [keyword, inputId, transitionType, duration] = rest;
             if (keyword?.toLowerCase() === 'input' && inputId && transitionType && duration) {
                if (isNaN(parseInt(duration))) throw new Error('Invalid duration. Must be a number in milliseconds.');
                await vmixService.transitionInput(inputId, transitionType, duration);
                return `vMix command successful: Transitioned to input ${inputId}`;
            }
            break;
        }
        case 'script': {
            const script = rest.join(' ');
            if (script) {
                await vmixService.runScript(script);
                return `vMix script sent for execution.`;
            }
            break;
        }
        case 'audio': {
            const [audioCmd, ...audioArgs] = rest;
            switch (audioCmd?.toLowerCase()) {
                case 'volume': {
                    const [keyword, inputId, levelStr] = audioArgs;
                    if (keyword?.toLowerCase() === 'input' && inputId && levelStr) {
                        const level = parseInt(levelStr, 10);
                        if (isNaN(level) || level < 0 || level > 100) throw new Error('Volume level must be a number between 0 and 100.');
                        await vmixService.sendCommand('SetVolume', { Input: inputId, Value: level.toString() });
                        return `vMix command successful: Set volume for input ${inputId} to ${level}.`;
                    }
                    break;
                }
                case 'mute': {
                    const [keyword, inputId] = audioArgs;
                    if (keyword?.toLowerCase() === 'input' && inputId) {
                        await vmixService.sendCommand('AudioOff', { Input: inputId });
                        return `vMix command successful: Muted input ${inputId}.`;
                    }
                    break;
                }
                case 'unmute': {
                    const [keyword, inputId] = audioArgs;
                    if (keyword?.toLowerCase() === 'input' && inputId) {
                        await vmixService.sendCommand('AudioOn', { Input: inputId });
                        return `vMix command successful: Unmuted input ${inputId}.`;
                    }
                    break;
                }
                case 'master': {
                    const [levelStr] = audioArgs;
                    if (levelStr) {
                        const level = parseInt(levelStr, 10);
                        if (isNaN(level) || level < 0 || level > 100) throw new Error('Master volume level must be a number between 0 and 100.');
                        await vmixService.sendCommand('SetMasterVolume', { Value: level.toString() });
                        return `vMix command successful: Set master volume to ${level}.`;
                    }
                    break;
                }
            }
            break;
        }
    }
    
    throw new Error("Invalid vMix command or arguments.");
  };

  const handleVideoCommand = async (args: string[]): Promise<{ message: string; videoUrl: string }> => {
    const [subCommand, ...rest] = args;
    
    switch (subCommand?.toLowerCase()) {
        case 'autocut': {
            const commandString = rest.join(' ');
            const parts = commandString.split(' with instructions ');
            if (parts.length === 2) {
                const sourceFile = parts[0].trim();
                const instructions = parts[1].trim();
                const result = await videoService.autoCutVideo(sourceFile, instructions);
                 return result;
            }
            break;
        }
    }
    
    throw new Error("Invalid video command or arguments. Use: autocut <source> with instructions <prompt>");
  };

  const handleSpotifyCommand = async (args: string[]): Promise<string> => {
    const [subCommand, ...rest] = args;
    const trackName = rest.join(' ');
    
    switch (subCommand?.toLowerCase()) {
        case 'play': {
            if (!trackName) {
                throw new Error("Please specify a song or artist to play.");
            }
            return await spotifyService.play(trackName);
        }
    }
    
    throw new Error("Invalid Spotify command. Supported: play <track name>");
  };

  const handleTwitchCommand = async (args: string[]): Promise<string> => {
    const [subCommand] = args;
    switch (subCommand?.toLowerCase()) {
      case 'start_stream':
        return await twitchService.startStream();
      case 'stop_stream':
        return await twitchService.stopStream();
    }
    throw new Error("Invalid Twitch command. Supported: start_stream, stop_stream");
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
        addMessage({ role: 'fux', content: 'Available Commands:\n/help - Show this message\n/agent <goal> - Engage agent mode for a complex task\n/ingest <module_concept> - Ingest a new Power Module\n/powers - List ingested Power Modules\n/use <module> [args] - Use a Power Module (e.g. vmix, blender, video, spotify, twitch)\n  - vmix switch input <id>\n  - vmix transition input <id> <type> <duration_ms>\n  - vmix script <python_script>\n  - vmix audio volume input <id> <0-100>\n  - vmix audio mute input <id>\n  - vmix audio unmute input <id>\n  - vmix audio master <0-100>\n  - blender <python_script>\n  - video autocut <source_path> with instructions <text>\n  - spotify play <song_name>\n  - twitch start_stream | stop_stream\n/generate image <prompt> - Create an image from a text description\n/search <query> - Get a web-grounded answer to a query' });
        break;
      case '/ingest':
        const source = args.join(' ');
        if (!source) {
          addMessage({ role: 'fux', content: 'Please provide a concept for the Power Module to ingest. Usage: /ingest <concept>' });
          break;
        }
        setCurrentTask('Analyzing and categorizing module...');
        try {
          const existingNames = plugins.map(p => p.power_name);
          const newPlugin = await categorizePlugin(source, existingNames);
          setPlugins(prev => [...prev, { ...newPlugin, source }]);
          addMessage({ role: 'system_core', content: `Successfully ingested Power Module: ${newPlugin.power_name} [${newPlugin.category}]`});
        } catch(e: any) {
          addMessage({ role: 'system_core', content: `Failed to ingest Power Module: ${e.message}` });
        }
        break;
      case '/powers':
        if (plugins.length === 0) {
          addMessage({ role: 'fux', content: 'No Power Modules have been ingested. Use /ingest <concept> to add one.' });
        } else {
          const groupedByCategory = plugins.reduce((acc, plugin) => {
            if (!acc[plugin.category]) {
              acc[plugin.category] = [];
            }
            acc[plugin.category].push(plugin);
            return acc;
          }, {} as Record<string, Plugin[]>);

          let content = 'Available Power Modules:\n';
          for (const category in groupedByCategory) {
            content += `\n[${category.toUpperCase()}]\n`;
            content += groupedByCategory[category].map(p => `- ${p.power_name}`).join('\n');
          }
          addMessage({ role: 'fux', content });
        }
        break;
      case '/use':
        const [powerName, ...powerArgs] = args;
        if (!powerName) {
            addMessage({ role: 'fux', content: 'Please specify a Power Module to use. Usage: /use <power_name> <...args>' });
            break;
        }
        
        if (powerName.toLowerCase() === 'vmix') {
          setCurrentTask(`Executing vMix command...`);
          try {
              const resultMessage = await handleVMixCommand(powerArgs);
              addMessage({ role: 'system_core', content: resultMessage });
          } catch (e: any) {
              addMessage({ role: 'system_core', content: `vMix command failed: ${e.message}` });
          }
          break;
        }
        
        if (powerName.toLowerCase() === 'blender') {
          const script = powerArgs.join(' ');
          if (!script) {
            addMessage({ role: 'fux', content: 'Please provide a Python script to execute. Usage: /use blender <script>' });
            break;
          }
          setCurrentTask(`Executing Blender script...`);
          try {
            const result = await blenderService.runScript(script);
            addMessage({
              role: 'system_core',
              content: `Blender script executed successfully. Result:\n${JSON.stringify(result, null, 2)}`
            });
          } catch (e: any) {
            addMessage({ role: 'system_core', content: `Blender script execution failed: ${e.message}` });
          }
          break;
        }

        if (powerName.toLowerCase() === 'video') {
            setCurrentTask(`Executing video command...`);
            try {
                const result = await handleVideoCommand(powerArgs);
                addMessage({ 
                  role: 'system_core', 
                  content: `Video command successful: ${result.message}`,
                  videoUrl: result.videoUrl
                });
            } catch (e: any) {
                addMessage({ role: 'system_core', content: `Video command failed: ${e.message}` });
            }
            break;
        }

        if (powerName.toLowerCase() === 'spotify') {
            setCurrentTask(`Executing Spotify command...`);
            try {
                const resultMessage = await handleSpotifyCommand(powerArgs);
                addMessage({ role: 'system_core', content: resultMessage });
            } catch (e: any) {
                addMessage({ role: 'system_core', content: `Spotify command failed: ${e.message}` });
            }
            break;
        }

        if (powerName.toLowerCase() === 'twitch') {
          setCurrentTask(`Executing Twitch command...`);
          try {
              const resultMessage = await handleTwitchCommand(powerArgs);
              addMessage({ role: 'system_core', content: resultMessage });
          } catch (e: any) {
              addMessage({ role: 'system_core', content: `Twitch command failed: ${e.message}` });
          }
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
      case '/generate':
        const [subCmd, ...imagePromptParts] = args;
        if (subCmd?.toLowerCase() === 'image') {
          const prompt = imagePromptParts.join(' ');
          if (!prompt) {
            addMessage({ role: 'fux', content: 'Please provide a prompt for the image. Usage: /generate image <your prompt>' });
            break;
          }
          setCurrentTask(`Generating image: "${prompt}"`);
          try {
            const base64Image = await generateImage(prompt);
            const imageUrl = `data:image/png;base64,${base64Image}`;
            addMessage({
              role: 'fux',
              content: `Image generated for: "${prompt}"`,
              imageUrl: imageUrl,
            });
          } catch (e: any) {
            addMessage({ role: 'system_core', content: `Image generation failed: ${e.message}` });
          }
        } else {
          addMessage({ role: 'fux', content: "Unknown /generate command. Did you mean '/generate image <prompt>'?" });
        }
        break;
      case '/search':
        const query = args.join(' ');
        if (!query) {
            addMessage({ role: 'fux', content: 'Please provide a search query. Usage: /search <your query>' });
            break;
        }
        setCurrentTask(`Searching web for: "${query}"`);
        try {
            const result = await googleSearch(query);
            addMessage({
                role: 'fux',
                content: result.text,
                sources: result.sources,
            });
        } catch (e: any) {
            addMessage({ role: 'system_core', content: `Search failed: ${e.message}` });
        }
        break;
      case '/agent':
        const goal = args.join(' ');
        if (!goal) {
          addMessage({ role: 'fux', content: 'Please provide a goal for the agent. Usage: /agent <your goal>' });
          break;
        }
        setCurrentTask(`Formulating plan for: "${goal}"`);
        addMessage({ role: 'system_core', content: `AGENT MODE: ENGAGED. Goal: ${goal}` });
        try {
          const plan = await createExecutionPlan(goal);
          addMessage({
            role: 'fux',
            content: 'Execution plan formulated. Initiating sequence.',
            agentPlan: plan
          });
          
          const stepOutputs: Record<string, any> = {};

          for (const [index, step] of plan.entries()) {
            addMessage({ role: 'system_core', content: `[STEP ${index + 1}/${plan.length}] Executing: ${step.tool}` });
            setCurrentTask(`Executing step ${index + 1}: ${step.tool}`);
            
            // Resolve placeholders in args from previous step outputs
            const placeholderRegex = /\{\{step_(\d+)_output\}\}/g;
            const resolvedArgs = step.args.replace(placeholderRegex, (match, stepIndexStr) => {
                const stepIndex = parseInt(stepIndexStr, 10) - 1; // 1-based to 0-based
                if (stepOutputs[stepIndex] !== undefined && stepOutputs[stepIndex] !== null) {
                    return String(stepOutputs[stepIndex]);
                }
                throw new Error(`Could not resolve placeholder ${match}. Output from step ${stepIndex + 1} not found or was null.`);
            });
            
            let currentStepOutput: any = null;
            
            switch (step.tool) {
              case 'vmix':
                const vmixCommandParts = resolvedArgs.split(/\s+/);
                try {
                    const resultMessage = await handleVMixCommand(vmixCommandParts);
                    addMessage({ role: 'system_core', content: resultMessage });
                } catch (e: any) {
                    throw new Error(`Agent vMix command failed: ${e.message}`);
                }
                break;
              case 'blender':
                const result = await blenderService.runScript(resolvedArgs);
                currentStepOutput = JSON.stringify(result);
                addMessage({ role: 'system_core', content: `Blender script result:\n${currentStepOutput}` });
                break;
              case 'video':
                const videoResult = await handleVideoCommand(resolvedArgs.split(/\s+/));
                currentStepOutput = videoResult.videoUrl;
                addMessage({ 
                    role: 'system_core', 
                    content: `Video command successful: ${videoResult.message}`,
                    videoUrl: videoResult.videoUrl 
                });
                break;
              case 'spotify':
                const spotifyResult = await handleSpotifyCommand(resolvedArgs.split(/\s+/));
                currentStepOutput = spotifyResult;
                addMessage({ role: 'system_core', content: spotifyResult });
                break;
              case 'twitch':
                const twitchResult = await handleTwitchCommand(resolvedArgs.split(/\s+/));
                currentStepOutput = twitchResult;
                addMessage({ role: 'system_core', content: twitchResult });
                break;
              case 'generateImage':
                const base64Image = await generateImage(resolvedArgs);
                const imageUrl = `data:image/png;base64,${base64Image}`;
                currentStepOutput = imageUrl;
                addMessage({ role: 'fux', content: `Image generated for: "${resolvedArgs}"`, imageUrl: imageUrl });
                break;
              case 'search':
                const searchResult = await googleSearch(resolvedArgs);
                currentStepOutput = searchResult.text;
                addMessage({ role: 'fux', content: searchResult.text, sources: searchResult.sources });
                break;
              case 'finalAnswer':
                addMessage({ role: 'fux', content: resolvedArgs });
                break;
              default:
                throw new Error(`Unknown tool specified by agent: ${step.tool}`);
            }
            stepOutputs[index] = currentStepOutput;
          }
          addMessage({ role: 'system_core', content: `AGENT MODE: COMPLETED.` });
        } catch (e: any) {
          addMessage({ role: 'system_core', content: `AGENT MODE: FAILED. Error: ${e.message}` });
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

  const handleDeployPower = (powerName: string) => {
    setInput(`/use ${powerName} <arguments>`);
    setIsPowersGuideOpen(false);
  }
  
  const handleToggleFavorite = (powerName: string) => {
    setFavoritePowers(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(powerName)) {
        newFavorites.delete(powerName);
      } else {
        newFavorites.add(powerName);
      }
      return newFavorites;
    });
  };

  return (
    <div className="bg-slate-950 text-slate-300 font-sans h-screen overflow-hidden flex flex-col items-center">
      <Hud 
        isListening={isListening}
        isInitializing={isSessionInitializing}
        liveTranscription={liveTranscription}
        activatingModule={currentTask}
        analyser={analyser}
      />
      <div className="w-full max-w-4xl mx-auto p-2 md:p-4 flex flex-col flex-grow h-full">
        <Header 
          onToggleRegistry={() => setIsPluginRegistryOpen(p => !p)}
          isTtsEnabled={isTtsEnabled}
          onToggleTts={() => setIsTtsEnabled(p => !p)}
          onToggleConnections={() => setIsConnectionsPanelOpen(p => !p)}
          onTogglePowersGuide={() => setIsPowersGuideOpen(p => !p)}
        />
        {error && <ErrorDisplay message={error} />}
        <main className="flex-grow min-h-0">
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
        favoritePowers={favoritePowers}
      />
      <ConnectionsPanel
        isOpen={isConnectionsPanelOpen}
        onClose={() => setIsConnectionsPanelOpen(false)}
      />
      <PowersGuide
        // FIX: The `isOpen` prop for PowersGuide should be controlled by the `isPowersGuideOpen` state variable.
        isOpen={isPowersGuideOpen}
        plugins={plugins}
        onClose={() => setIsPowersGuideOpen(false)}
        onDeployPower={handleDeployPower}
        favoritePowers={favoritePowers}
        onToggleFavorite={handleToggleFavorite}
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
