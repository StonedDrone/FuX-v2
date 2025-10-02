import React, { useState, useCallback, useEffect } from 'react';
import type { Chat } from '@google/genai';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { startChat, continueChat, createChatWithHistory } from './services/geminiService';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatInterface } from './components/ChatInterface';

type Message = {
  role: 'user' | 'fux';
  content: string;
};

const CHAT_HISTORY_KEY = 'fux-chat-history';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);

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
    if (messages.length > 0 && !chatSession) {
      try {
        const session = createChatWithHistory(messages);
        setChatSession(session);
      } catch (e) {
        console.error("Failed to recreate chat session from history.", e);
        setError(e instanceof Error ? e.message : "Failed to restore session. Please start over by uploading a module.");
        setMessages([]); // Clear corrupted or unusable history
      }
    }
    // This effect should only run on initial mount to restore a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (isLoading) return;
    
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setChatSession(null);
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

      const { chat, initialResponse } = await startChat(combinedContent, descriptiveName);
      setChatSession(chat);
      setMessages([{ role: 'fux', content: initialResponse }]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while absorbing the modules.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);
  
  const handleUrlSubmit = useCallback(async (urls: string) => {
    if (isLoading) return;

    const urlArray = urls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urlArray.length === 0) {
        setError("Please provide at least one valid GitHub repository URL.");
        return;
    }

    const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/;
    
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setChatSession(null);
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
      
      const { chat, initialResponse } = await startChat(combinedContent, descriptiveName);
      setChatSession(chat);
      setMessages([{ role: 'fux', content: initialResponse }]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while absorbing modules from source.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);


  const handleSendMessage = useCallback(async (message: string) => {
    if (!chatSession || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const responseText = await continueChat(chatSession, message);
      setMessages([...newMessages, { role: 'fux', content: responseText }]);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An error occurred during the chat session.';
      setError(errorMessage);
      // Keep user message, but show error
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  }, [chatSession, isLoading, messages]);


  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto">
        <Header />
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
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;