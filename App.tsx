

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { PluginRegistry } from './components/PluginRegistry';
import { Hud } from './components/Hud';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { ErrorDisplay } from './components/ErrorDisplay';
import { PowersGuide } from './components/PowersGuide';
import { ChatHistoryPanel } from './components/ChatHistoryPanel';
import { IngestRepositoryPanel } from './components/IngestRepositoryPanel';
import { analyzeCode, executeCode, generateImage, googleSearch, createExecutionPlan, ingestRepository, generateChatTitle, AgentStep, ToolDefinition } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { vmixService } from './services/vmixService';
import { blenderService } from './services/blenderService';
import { videoService } from './services/videoService';
import { spotifyService } from './services/spotifyService';
import { twitchService } from './services/twitchService';
import { githubService } from './services/githubService';
import { CodexPanel, CodexFile } from './components/CodexPanel';

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

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export interface Plugin {
  power_name: string;
  source: string; // Filename or concept
  code: string; // The actual source code
  tools: ToolDefinition[];
  category: string;
  description: string;
}

// According to guidelines, API key must be from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<string | null>(null);

  // UI State
  const [isPluginRegistryOpen, setIsPluginRegistryOpen] = useState(false);
  const [isConnectionsPanelOpen, setIsConnectionsPanelOpen] = useState(false);
  const [isPowersGuideOpen, setIsPowersGuideOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isIngestPanelOpen, setIsIngestPanelOpen] = useState(false);
  const [isCodexPanelOpen, setIsCodexPanelOpen] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);

  // Plugin State
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [favoritePowers, setFavoritePowers] = useState<Set<string>>(new Set());

  // Codex State
  const [codexFiles, setCodexFiles] = useState<CodexFile[]>([]);

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

  const createNewSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Session',
      messages: [
        { role: 'fux', content: 'FuX CORE ONLINE\nSTATUS: NOMINAL\nAwaiting directive. Use /help for a list of commands.' }
      ],
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    return newSessionId;
  }, []);

  useEffect(() => {
    // Load sessions from localStorage on initial mount
    try {
      const savedSessions = localStorage.getItem('fux_chat_sessions');
      const savedActiveId = localStorage.getItem('fux_active_session_id');

      if (savedSessions) {
        // FIX: Explicitly type parsed JSON to maintain type safety for `sessions` state.
        const parsedSessions: ChatSession[] = JSON.parse(savedSessions);
        if (parsedSessions.length > 0) {
          setSessions(parsedSessions);
          if (savedActiveId && parsedSessions.some((s: ChatSession) => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
          } else {
            setActiveSessionId(parsedSessions[0].id);
          }
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (e) {
      console.error("Failed to load sessions from localStorage", e);
      createNewSession();
    }
    
    // Load plugins from localStorage
    try {
        const savedPlugins = localStorage.getItem('fux_plugins');
        if (savedPlugins) {
            // FIX: Explicitly type parsed JSON. The lack of type information caused `plugins` to be `any[]`, which was the root cause of the type error on line 303.
            const parsedPlugins: Plugin[] = JSON.parse(savedPlugins);
            setPlugins(parsedPlugins);
        }
    } catch (e) {
        console.error("Failed to load plugins from localStorage", e);
    }

    // Load favorites from localStorage on initial mount
    try {
      const storedFavorites = localStorage.getItem('fux_favorite_powers');
      if (storedFavorites) {
        // FIX: Replaced type assertion with a type guard for robust parsing.
        const parsedFavorites = JSON.parse(storedFavorites);
        if (Array.isArray(parsedFavorites) && parsedFavorites.every(item => typeof item === 'string')) {
          setFavoritePowers(new Set(parsedFavorites));
        }
      }
    } catch (e) {
      console.error("Failed to load favorite powers from localStorage", e);
    }

    // Load codex from localStorage
    try {
      const savedCodex = localStorage.getItem('fux_codex_files');
      if (savedCodex) {
        // FIX: Explicitly type parsed JSON to ensure type safety for `codexFiles` state.
        const parsedCodex: CodexFile[] = JSON.parse(savedCodex);
        setCodexFiles(parsedCodex);
      }
    } catch (e) {
      console.error("Failed to load codex from localStorage", e);
    }
  }, [createNewSession]);

  useEffect(() => {
    // Save sessions to localStorage whenever they change
    try {
      if (sessions.length > 0) {
        localStorage.setItem('fux_chat_sessions', JSON.stringify(sessions));
      }
      if (activeSessionId) {
        localStorage.setItem('fux_active_session_id', activeSessionId);
      }
    } catch (e) {
      console.error("Failed to save sessions to localStorage", e);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    // Save plugins to localStorage whenever they change
    try {
        localStorage.setItem('fux_plugins', JSON.stringify(plugins));
    } catch (e) {
        console.error("Failed to save plugins to localStorage", e);
    }
  }, [plugins]);

  useEffect(() => {
    // Save favorites to localStorage whenever they change
    try {
      localStorage.setItem('fux_favorite_powers', JSON.stringify(Array.from(favoritePowers)));
    } catch (e) {
      console.error("Failed to save favorite powers from localStorage", e);
    }
  }, [favoritePowers]);

  useEffect(() => {
    // Save codex to localStorage
    try {
      localStorage.setItem('fux_codex_files', JSON.stringify(codexFiles));
    } catch (e) {
      console.error("Failed to save codex to localStorage", e);
    }
  }, [codexFiles]);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const addMessage = useCallback((message: Message) => {
    if (!activeSessionId) return;
    setSessions(prev => 
      prev.map(session => 
        session.id === activeSessionId 
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    );
  }, [activeSessionId]);
  
  const handleCreateNewSession = () => {
    createNewSession();
    setIsChatHistoryOpen(false);
  };
  
  const handleSwitchSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsChatHistoryOpen(false);
  };
  
  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        if (newSessions.length > 0) {
          setActiveSessionId(newSessions[0].id);
        } else {
          const newId = createNewSession();
          setActiveSessionId(newId);
          return sessions.find(s => s.id === newId) ? [sessions.find(s => s.id === newId)!] : [];
        }
      }
      if (newSessions.length === 0) {
          createNewSession();
      }
      return newSessions;
    });
  };

  const getCombinedCodexContent = useCallback((): string => {
    if (codexFiles.length === 0) return '';
    
    return codexFiles
      .map(file => `--- START OF ${file.name} ---\n${file.content}\n--- END OF ${file.name} ---`)
      .join('\n\n');
  }, [codexFiles]);
  
  const handleIngestFile = async (file: File) => {
    setIsIngestPanelOpen(false);
    setIsReplying(true);
    setCurrentTask(`Ingesting repository: ${file.name}`);
    addMessage({ role: 'system_core', content: `[INGESTION PROTOCOL] Analyzing ${file.name}...` });

    try {
      const fileContent = await file.text();
      const existingNames = plugins.map(p => p.power_name);
      const newPlugin = await ingestRepository(file.name, fileContent, existingNames, getCombinedCodexContent());
      
      setPlugins(prev => [...prev, newPlugin]);
      addMessage({ role: 'system_core', content: `Successfully ingested and activated Power Module: ${newPlugin.power_name} [${newPlugin.category}].\n${newPlugin.tools.length} new tools available.`});
    } catch (e: any) {
      setError(`Failed to ingest repository: ${e.message}`);
      addMessage({ role: 'system_core', content: `[INGESTION FAILED] ${e.message}` });
    } finally {
      setIsReplying(false);
      setCurrentTask(null);
    }
  };

  const handleIngestUrls = useCallback(async (urls: string[]) => {
    setIsIngestPanelOpen(false);
    setIsReplying(true);
    addMessage({ role: 'system_core', content: `[BATCH INGESTION PROTOCOL] Initiated for ${urls.length} repositories.` });
  
    const currentPluginNames = new Set(plugins.map(p => p.power_name));
    const successfullyIngestedPlugins: Plugin[] = [];
  
    for (const [index, url] of urls.entries()) {
      const shortUrl = url.split('/').slice(-2).join('/');
      try {
        setCurrentTask(`[${index + 1}/${urls.length}] Fetching: ${shortUrl}`);
        addMessage({ role: 'system_core', content: `[INGESTION] Fetching content from ${url}...` });
  
        const { repoName, content } = await githubService.fetchRepoContents(url);
  
        setCurrentTask(`[${index + 1}/${urls.length}] Ingesting: ${repoName}`);
        addMessage({ role: 'system_core', content: `[INGESTION] Analyzing ${repoName}...` });
  
        const existingNamesForThisCall = Array.from(currentPluginNames);
        const newPlugin = await ingestRepository(repoName, content, existingNamesForThisCall, getCombinedCodexContent());
        
        successfullyIngestedPlugins.push(newPlugin);
        currentPluginNames.add(newPlugin.power_name); // Update local set for next iteration
  
        addMessage({ role: 'system_core', content: `Successfully ingested and activated Power Module: ${newPlugin.power_name} [${newPlugin.category}].\n${newPlugin.tools.length} new tools available.`});
  
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`Failed to ingest repository from ${url}: ${errorMessage}`);
        addMessage({ role: 'system_core', content: `[INGESTION FAILED for ${shortUrl}] ${errorMessage}` });
      }
    }
  
    if (successfullyIngestedPlugins.length > 0) {
      setPlugins(prev => [...prev, ...successfullyIngestedPlugins]);
    }
  
    addMessage({ role: 'system_core', content: `[BATCH INGESTION PROTOCOL] Completed.` });
    setIsReplying(false);
    setCurrentTask(null);
  }, [addMessage, getCombinedCodexContent, plugins]);


  const handleAddCodexFile = async (file: File) => {
    if (codexFiles.some(f => f.name === file.name)) {
        setError(`A file named "${file.name}" already exists in the Codex.`);
        return;
    }
    try {
        const content = await file.text();
        setCodexFiles(prev => [...prev, { name: file.name, content }]);
    } catch(e: any) {
        setError(`Failed to read file: ${e.message}`);
    }
  };

  const handleDeleteCodexFile = (fileName: string) => {
    setCodexFiles(prev => prev.filter(f => f.name !== fileName));
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
  }, [isListening, isSessionInitializing, addMessage]);

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

    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.messages.filter(m => m.role === 'user').length <= 1 && currentSession.title === 'New Session') {
      generateChatTitle(messageContent, getCombinedCodexContent()).then(newTitle => {
        setSessions(prev =>
          prev.map(s => (s.id === activeSessionId ? { ...s, title: newTitle } : s))
        );
      });
    }

    try {
      if (messageContent.startsWith('/')) {
        await handleCommand(messageContent);
      } else {
        setCurrentTask('Analyzing request...');
        const response = await analyzeCode(messageContent, messages, getCombinedCodexContent());
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
        addMessage({ role: 'fux', content: 'Available Commands:\n/help - Show this message\n/agent <goal> - Engage agent mode for a complex task\n/powers - List ingested Power Modules\n/use <module_tool> [args] - Use a Power Module tool (e.g. vmix, blender, or custom tools from ingested repos)\n  Built-in examples:\n  - vmix switch input <id>\n  - blender <python_script>\n  - video autocut <source_path> with instructions <text>\n  - spotify play <song_name>\n  - twitch start_stream | stop_stream\n/generate image <prompt> - Create an image from a text description\n/search <query> - Get a web-grounded answer to a query' });
        break;
      case '/powers':
        if (plugins.length === 0) {
          addMessage({ role: 'fux', content: 'No Power Modules have been ingested. Use the Ingest Matrix icon to add one.' });
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
            content += groupedByCategory[category].map(p => `- ${p.power_name} (${p.tools.length} tools)`).join('\n');
          }
          addMessage({ role: 'fux', content });
        }
        break;
      case '/use':
        const [toolName, ...toolArgs] = args;
        if (!toolName) {
            addMessage({ role: 'fux', content: 'Please specify a tool to use. Usage: /use <tool_name> <...args>' });
            break;
        }
        
        // Handle built-in tools
        if (toolName.toLowerCase() === 'vmix') {
          setCurrentTask(`Executing vMix command...`);
          try {
              const resultMessage = await handleVMixCommand(toolArgs);
              addMessage({ role: 'system_core', content: resultMessage });
          } catch (e: any) {
              addMessage({ role: 'system_core', content: `vMix command failed: ${e.message}` });
          }
          break;
        }
        if (toolName.toLowerCase() === 'blender') {
          const script = toolArgs.join(' ');
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
        if (toolName.toLowerCase() === 'video') {
            setCurrentTask(`Executing video command...`);
            try {
                const result = await handleVideoCommand(toolArgs);
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
        if (toolName.toLowerCase() === 'spotify') {
            setCurrentTask(`Executing Spotify command...`);
            try {
                const resultMessage = await handleSpotifyCommand(toolArgs);
                addMessage({ role: 'system_core', content: resultMessage });
            } catch (e: any) {
                addMessage({ role: 'system_core', content: `Spotify command failed: ${e.message}` });
            }
            break;
        }
        if (toolName.toLowerCase() === 'twitch') {
          setCurrentTask(`Executing Twitch command...`);
          try {
              const resultMessage = await handleTwitchCommand(toolArgs);
              addMessage({ role: 'system_core', content: resultMessage });
          } catch (e: any) {
              addMessage({ role: 'system_core', content: `Twitch command failed: ${e.message}` });
          }
          break;
        }

        // Handle custom tools from plugins
        const allCustomTools = plugins.flatMap(p => p.tools.map(t => ({ ...t, plugin: p })));
        const targetTool = allCustomTools.find(t => t.name === toolName);

        if (!targetTool) {
             addMessage({ role: 'system_core', content: `Error: Tool "${toolName}" not found. It is not a built-in tool or a function from an ingested repository.` });
             break;
        }

        setCurrentTask(`Executing Tool: ${toolName}`);
        try {
            const result = await executeCode(targetTool.plugin, toolName, toolArgs.join(' '));
            addMessage({ role: 'system_core', content: `Execution Result from ${toolName}:\n${result}` });
        } catch (e: any) {
            addMessage({ role: 'system_core', content: `Execution failed for ${toolName}: ${e.message}` });
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
          const plan = await createExecutionPlan(goal, plugins, getCombinedCodexContent());
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
            
            // Check if it's a built-in tool first
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
                // If not a built-in tool, search in custom plugins
                const allCustomTools = plugins.flatMap(p => p.tools.map(t => ({ ...t, plugin: p })));
                const targetCustomTool = allCustomTools.find(t => t.name === step.tool);
                if (targetCustomTool) {
                    const customResult = await executeCode(targetCustomTool.plugin, step.tool, resolvedArgs);
                    currentStepOutput = customResult;
                    addMessage({ role: 'system_core', content: `Tool ${step.tool} result: ${customResult}` });
                } else {
                    throw new Error(`Unknown tool specified by agent: ${step.tool}`);
                }
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

  const handleDeployPower = (toolName: string) => {
    setInput(`/use ${toolName} `);
    setIsPowersGuideOpen(false);
    // Find the input element and focus it
    setTimeout(() => {
        const inputElement = document.querySelector('textarea');
        if (inputElement) {
            inputElement.focus();
        }
    }, 0);
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

  // Effect for one-time initial ingestion of the chaos engine
  useEffect(() => {
    const performInitialIngest = async () => {
      const initialIngestFlag = 'fux_initial_ingest_complete_v2';
      const hasIngested = localStorage.getItem(initialIngestFlag);
      
      if (activeSessionId && !hasIngested && plugins.length === 0) {
        localStorage.setItem(initialIngestFlag, 'true');
        addMessage({
          role: 'system_core',
          content: "[FIRST BOOT SEQUENCE] No Power Modules detected. Ingesting foundational Chaos Engine from StonedDrone/fux-chaos-engine..."
        });
        await handleIngestUrls(['https://github.com/StonedDrone/fux-chaos-engine']);
      }
    };
  
    // We only want this to run after the initial state from localStorage has been loaded.
    // The activeSessionId is a good signal for this.
    if (sessions.length > 0 && activeSessionId) {
       performInitialIngest();
    }
  }, [activeSessionId, sessions, plugins, addMessage, handleIngestUrls]);


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
          onToggleChatHistory={() => setIsChatHistoryOpen(p => !p)}
          onToggleIngest={() => setIsIngestPanelOpen(p => !p)}
          onToggleCodex={() => setIsCodexPanelOpen(p => !p)}
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
       <ChatHistoryPanel
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleCreateNewSession}
        onSwitchChat={handleSwitchSession}
        onDeleteChat={handleDeleteSession}
      />
      <IngestRepositoryPanel 
        isOpen={isIngestPanelOpen}
        onClose={() => setIsIngestPanelOpen(false)}
        onIngestFile={handleIngestFile}
        onIngestUrls={handleIngestUrls}
      />
      <CodexPanel
        isOpen={isCodexPanelOpen}
        onClose={() => setIsCodexPanelOpen(false)}
        codexFiles={codexFiles}
        onAddFile={handleAddCodexFile}
        onDeleteFile={handleDeleteCodexFile}
      />
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