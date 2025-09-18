import React, { useState, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { startChat, continueChat } from './services/geminiService';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ChatInterface } from './components/ChatInterface';

type Message = {
  role: 'user' | 'fux';
  content: string;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setChatSession(null);
    setFileName(file.name);

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File size exceeds 10MB limit. Please upload a smaller module.");
      setIsLoading(false);
      return;
    }

    try {
      const fileContent = await file.text();
      const { chat, initialResponse } = await startChat(fileContent, file.name);
      setChatSession(chat);
      setMessages([{ role: 'fux', content: initialResponse }]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while absorbing the module.');
      setMessages([]); // Clear any partial state
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
             <FileUpload onFileUpload={handleFileUpload} disabled={isLoading} />
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
