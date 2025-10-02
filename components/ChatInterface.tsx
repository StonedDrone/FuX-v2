import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { SendIcon } from './icons/SendIcon';
import type { Message } from '../App';

// --- Locally Defined Icon ---
const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

// --- Locally Defined VoiceControl Component ---
interface VoiceControlProps {
  isListening: boolean;
  isSessionInitializing: boolean;
  onToggleVoice: () => void;
}
const VoiceControl: React.FC<VoiceControlProps> = ({ isListening, isSessionInitializing, onToggleVoice }) => {
  let buttonContent;
  let buttonClass = "p-2 rounded-full text-slate-200 transition-colors ";

  if (isSessionInitializing) {
    buttonContent = <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>;
    buttonClass += "bg-slate-700 cursor-not-allowed";
  } else if (isListening) {
    buttonContent = <MicrophoneIcon className="w-5 h-5" />;
    buttonClass += "bg-red-600 hover:bg-red-500 animate-pulse";
  } else {
    buttonContent = <MicrophoneIcon className="w-5 h-5" />;
    buttonClass += "bg-slate-700 hover:bg-slate-600";
  }

  return (
    <button
      type="button"
      onClick={onToggleVoice}
      disabled={isSessionInitializing}
      className={buttonClass}
      aria-label={isListening ? 'Stop listening' : 'Start listening'}
    >
      {buttonContent}
    </button>
  );
};


interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: () => void;
  isReplying: boolean;
  currentTask: string | null;
  isTtsEnabled: boolean;
  isListening: boolean;
  isSessionInitializing: boolean;
  onToggleVoice: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages, input, setInput, onSendMessage, isReplying, currentTask, isTtsEnabled,
  isListening, isSessionInitializing, onToggleVoice
}) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // A slight delay to allow the DOM to update before scrolling
    setTimeout(scrollToBottom, 100);
  }, [messages]);
  
  useEffect(() => {
    // When a plugin is selected, focus the input and pre-select the placeholder args.
    const placeholder = '<arguments>';
    if (input.trim().endsWith(placeholder)) {
      const inputEl = inputRef.current;
      if (inputEl) {
        inputEl.focus();
        const selectionStart = input.lastIndexOf(placeholder);
        const selectionEnd = selectionStart + placeholder.length;
        inputEl.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isReplying) {
      onSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  
  const isDisabled = isReplying || isListening || isSessionInitializing;

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
        {isReplying && currentTask && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3 p-4">
              <div className="w-6 h-6 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
              <p className="text-sm text-slate-400">{currentTask}</p>
            </div>
          </div>
        )}
        {isReplying && !currentTask && messages[messages.length-1]?.role !== 'fux' && (
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Engage with FuX... or use /help"}
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-2 text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:cursor-not-allowed"
            disabled={isDisabled}
            autoFocus
          />
          <VoiceControl 
            isListening={isListening}
            isSessionInitializing={isSessionInitializing}
            onToggleVoice={onToggleVoice}
          />
          <button
            type="submit"
            disabled={isDisabled || !input.trim()}
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
