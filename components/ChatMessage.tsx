import React, { useState, useEffect } from 'react';
import type { Message } from '../App';

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastMessage }) => {
  const { role, content } = message;
  const useTypewriter = role === 'fux' && isLastMessage;
  const [displayedText, setDisplayedText] = useState(useTypewriter ? '' : content);

  useEffect(() => {
    if (useTypewriter) {
      setDisplayedText(''); // Reset on new message
      let i = 0;
      const intervalId = setInterval(() => {
        if (i < content.length) {
          setDisplayedText(prev => prev + content.charAt(i));
          i++;
        } else {
          clearInterval(intervalId);
        }
      }, 10);
      return () => clearInterval(intervalId);
    } else {
        setDisplayedText(content);
    }
  }, [content, useTypewriter]);
  
  const formatLine = (line: string) => {
    const parts = line.split(/:(.*)/s);
    if (role === 'fux' && parts.length > 1) {
      const key = parts[0];
      const value = parts[1];
      return (
        <p>
          <span className="text-cyan-400">{key}:</span>
          <span className="text-slate-200">{value}</span>
        </p>
      );
    }
    return <p>{line}</p>;
  };
  
  if (role === 'system_core') {
    return (
      <div className="flex justify-center my-2">
        <div className="w-full max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg bg-slate-900 border border-amber-500/30">
          <p className="text-xs font-bold text-amber-400 mb-1 tracking-wider">[SYSTEM CORE LOG]</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300">
            {displayedText}
          </pre>
        </div>
      </div>
    );
  }


  const isFux = role === 'fux';
  const messageAlignment = isFux ? 'justify-start' : 'justify-end';
  const bubbleStyles = isFux
    ? 'bg-slate-800/70'
    : 'bg-cyan-900/50';

  return (
    <div className={`flex ${messageAlignment}`}>
      <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg ${bubbleStyles}`}>
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {displayedText.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {formatLine(line)}
            </React.Fragment>
          ))}
        </pre>
      </div>
    </div>
  );
};