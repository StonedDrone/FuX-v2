import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { startChat, continueChat } from './services/geminiService';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatInterface } from './components/ChatInterface';

export type Message = {
  role: 'user' | 'fux' | 'system_core';
  content: string;
};

const CHAT_HISTORY_KEY = 'fux-chat-history';
const TTS_ENABLED_KEY = 'fux-tts-enabled';

// Web Worker code as a string to be sandboxed
const workerCode = `
self.onmessage = (event) => {
  const code = event.data;
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    try {
      logs.push(args.map(arg => JSON.stringify(arg, null, 2)).join(' '));
    } catch (e) {
      logs.push('<<Unserializable Log>>');
    }
    originalLog.apply(console, args);
  };

  try {
    const result = new Function(code)();
    let output = logs.join('\\n');
    if (result !== undefined) {
      try {
        output += \`\\n---\\nReturn Value: \${JSON.stringify(result, null, 2)}\`;
      } catch (e) {
        output += \`\\n---\\nReturn Value: <<Unserializable>>\`;
      }
    }
    self.postMessage({ type: 'success', output: output || 'Execution finished with no output.' });
  } catch (error) {
    let output = logs.join('\\n');
    output += \`\\n---\\nError: \${error.message}\`;
    self.postMessage({ type: 'error', output });
  } finally {
    console.log = originalLog;
  }
};
`;

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TTS_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const workerRef = useRef<Worker | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Could not load chat history from localStorage", e);
      return [];
    }
  });

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      }
    } catch (e) {
      console.error("Could not save chat history to localStorage", e);
    }
  }, [messages]);
  
  useEffect(() => {
    try {
      localStorage.setItem(TTS_ENABLED_KEY, String(isTtsEnabled));
    } catch (e) {
      console.error("Could not save TTS preference to localStorage", e);
    }
  }, [isTtsEnabled]);

  const handleToggleTts = () => {
    if (!isTtsEnabled === false) {
      window.speechSynthesis.cancel();
    }
    setIsTtsEnabled(prev => !prev);
  };

  // Initialize Web Worker
  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type, output } = event.data;
      const systemMessage: Message = {
        role: 'system_core',
        content: `Execution Result (${type}):\n${output}`
      };
      setMessages(prev => [...prev, systemMessage]);

      // Feed the result back to the AI
      continueChain(systemMessage);
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
       // Ensure speech stops on component unmount
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processResponse = (response: string) => {
    const codeRegex = /```javascript-exec\s*([\s\S]*?)```/;
    const match = response.match(codeRegex);

    if (match && match[1] && workerRef.current) {
        const code = match[1];
        const fuxMessage: Message = { role: 'fux', content: "Initializing self-enhancement protocol..." };
        setMessages(prev => [...prev, fuxMessage]);
        workerRef.current.postMessage(code);
    } else {
        const fuxMessage: Message = { role: 'fux', content: response };
        setMessages(prev => [...prev, fuxMessage]);
        setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (isLoading) return;
    
    window.speechSynthesis.cancel();
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    const fileCount = fileArray.length;
    setFileName(`${fileCount} module${fileCount > 1 ? 's' : ''}`);

    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024 * 1024) { // 50MB limit
      setError("Total file size exceeds 50MB limit. Please upload smaller modules.");
      setIsLoading(false);
      return;
    }

    try {
      const modules = await Promise.all(
        fileArray.map(async (file) => ({
          name: file.name,
          content: await file.text()
        }))
      );
      
      const combinedContent = modules
        .map(m => `--- Module: ${m.name} ---\n\n\`\`\`\n${m.content}\n\`\`\``)
        .join('\n\n');
        
      const descriptiveName = `${fileCount} module${fileCount > 1 ? 's' : ''} uploaded`;

      const initialResponse = await startChat(combinedContent, descriptiveName);
      processResponse(initialResponse);

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while absorbing the modules.');
      setMessages([]);
      setIsLoading(false);
    }
  }, [isLoading]);
  
  const handleUrlSubmit = useCallback(async (urls: string) => {
    if (isLoading) return;

    window.speechSynthesis.cancel();
    const urlArray = urls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urlArray.length === 0) {
        setError("Please provide at least one valid GitHub repository URL.");
        return;
    }

    const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/;
    
    setIsLoading(true);
    setError(null);
    setMessages([]);
    const urlCount = urlArray.length;
    setFileName(`${urlCount} repositor${urlCount > 1 ? 'ies' : 'y'}`);

    try {
      const modules = await Promise.all(
        urlArray.map(async (url) => {
          const match = url.match(githubRegex);
          if (!match) {
            throw new Error(`Invalid GitHub URL format: ${url}`);
          }
          const [, owner, repo] = match;

          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
          });
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(`Repository or its README.md not found for ${owner}/${repo}.`);
            }
            const errorData = await response.json().catch(() => ({ message: 'An unknown GitHub error occurred' }));
            throw new Error(`Failed to fetch from GitHub for ${owner}/${repo}: ${errorData.message || response.statusText}`);
          }

          const data = await response.json();
          return {
            name: `Repository: ${owner}/${repo}`,
            content: atob(data.content),
          };
        })
      );

      const combinedContent = modules
        .map(m => `--- Module: ${m.name} ---\n\n\`\`\`\n${m.content}\n\`\`\``)
        .join('\n\n');

      const descriptiveName = `${urlCount} module${urlCount > 1 ? 's' : ''} from source`;
      
      const initialResponse = await startChat(combinedContent, descriptiveName);
      processResponse(initialResponse);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while absorbing modules from source.');
      setMessages([]);
      setIsLoading(false);
    }
  }, [isLoading]);

  // Continues the chain of conversation, used for system-generated messages.
  const continueChain = async (systemMessage: Message) => {
    const currentMessages = [...messages, systemMessage];
    try {
      const responseText = await continueChat(currentMessages);
      processResponse(responseText);
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An error occurred during the chat session.';
        setError(errorMessage);
        setIsLoading(false);
    }
  }


  const handleSendMessage = useCallback(async (message: string) => {
    if (isLoading) return;

    window.speechSynthesis.cancel();
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const responseText = await continueChat(newMessages);
      processResponse(responseText);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An error occurred during the chat session.';
      setError(errorMessage);
      setMessages(newMessages); // Keep user message on error
      setIsLoading(false);
    }
  }, [isLoading, messages]);


  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto">
        <Header isTtsEnabled={isTtsEnabled} onToggleTts={handleToggleTts} />
        <main className="mt-8">
          {messages.length === 0 && !isLoading && (
             <FileUpload 
                onFileUpload={handleFileUpload} 
                onUrlSubmit={handleUrlSubmit}
                disabled={isLoading} />
          )}
          {isLoading && messages.length === 0 && <Loader fileName={fileName} />}
          {error && <ErrorDisplay message={error} />}
          {messages.length > 0 && (
            <ChatInterface 
              messages={messages} 
              onSendMessage={handleSendMessage}
              isReplying={isLoading}
              isTtsEnabled={isTtsEnabled}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
