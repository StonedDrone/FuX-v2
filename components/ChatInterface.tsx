
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { SendIcon } from './icons/SendIcon';
import type { Message } from '../App';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isReplying: boolean;
  isTtsEnabled: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isReplying, isTtsEnabled }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isReplying) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] w-full mt-6 border border-slate-700 bg-slate-900/50 rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage 
            key={index} 
            message={msg} 
            isLastMessage={index === messages.length - 1}
            isTtsEnabled={isTtsEnabled}
          />
        ))}
        {isReplying && messages.length > 0 && messages[messages.length-1].role === 'user' && (
          <div className="flex justify-start">
             <div className="flex items-center space-x-2 p-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Engage with FuX... try /ingest <repo_url>"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-2 text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            disabled={isReplying}
          />
          <button
            type="submit"
            disabled={isReplying || !input.trim()}
            className="p-2 rounded-full bg-cyan-500 text-black enabled:hover:bg-cyan-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
