
import React, { useState, useEffect, useRef } from 'react';
import type { Message, AgentStep } from '../App';

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  isTtsEnabled: boolean;
}

const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLastMessage, isTtsEnabled }) => {
  const { role, content } = message;
  const useTypewriter = role === 'fux' && isLastMessage;
  const [displayedText, setDisplayedText] = useState(useTypewriter ? '' : content);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Load voices once
  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Typewriter effect
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

  // TTS effect
  useEffect(() => {
    if (useTypewriter && isTtsEnabled && content) {
      // Cancel any previous utterance before speaking a new one
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(content);
      
      // Find a suitable voice
      const preferredVoices = [
        'Google US English', // Chrome
        'Microsoft David - English (United States)', // Edge/Windows
        'Alex', // macOS (premium)
        'Daniel', // UK English (often good quality)
        'Samantha', // Common on many platforms
      ];

      const voice = voicesRef.current.find(v => preferredVoices.includes(v.name)) || 
                    voicesRef.current.find(v => v.lang.startsWith('en-') && v.name.includes('Google')) ||
                    voicesRef.current.find(v => v.lang.startsWith('en-'));
      
      if (voice) {
        utterance.voice = voice;
      }
      
      // Custom "VoiceMod" style voice profile
      utterance.pitch = 0.1; // Lower pitch for a deeper, more robotic tone
      utterance.rate = 1.0;  // Normal rate for clarity
      utterance.volume = 1;  // Max volume

      window.speechSynthesis.speak(utterance);
    }

    // Cleanup: stop speaking if component unmounts or is no longer the last message
    return () => {
      if (useTypewriter) {
        window.speechSynthesis.cancel();
      }
    };
  }, [content, useTypewriter, isTtsEnabled]);
  
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
        <div className="w-11/12 max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg bg-slate-900 border border-amber-500/30">
          <p className="text-xs font-bold text-amber-400 mb-1 tracking-wider">[SYSTEM CORE LOG]</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300">
            {displayedText}
          </pre>
           {message.videoUrl && (
            <div className="mt-2 p-1 bg-slate-900/50 rounded-lg border border-slate-700">
              <video
                src={message.videoUrl}
                controls
                className="rounded-md max-w-full h-auto"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
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
      <div className={`max-w-[85%] sm:max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg ${bubbleStyles}`}>
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {displayedText.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {formatLine(line)}
            </React.Fragment>
          ))}
        </pre>
        {message.agentPlan && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <h4 className="text-xs text-indigo-400 font-bold mb-2 tracking-wider">[AGENT EXECUTION PLAN]</h4>
            <ul className="space-y-2">
              {message.agentPlan.map((step, index) => (
                <li key={index} className="p-2 rounded-md bg-slate-900/50 border border-slate-700">
                  <p className="text-xs text-slate-400 font-mono italic">
                    <span className="font-bold text-slate-300">Step {index + 1}:</span> {step.thought}
                  </p>
                  <p className="text-sm text-cyan-400 font-semibold truncate mt-1 font-mono bg-slate-950 p-1 rounded">
                    &gt; {step.tool}: {step.args}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {message.imageUrl && (
          <div className="mt-2 p-1 bg-slate-900/50 rounded-lg border border-slate-700">
            <img
              src={message.imageUrl}
              alt={message.content}
              className="rounded-md max-w-full h-auto"
            />
          </div>
        )}
        {message.videoUrl && (
          <div className="mt-2 p-1 bg-slate-900/50 rounded-lg border border-slate-700">
            <video
              src={message.videoUrl}
              controls
              className="rounded-md max-w-full h-auto"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <h4 className="text-xs text-slate-400 font-bold mb-2 flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              SOURCES
            </h4>
            <ul className="space-y-2">
              {message.sources.map((source, index) => source.web && (
                <li key={index}>
                  <a 
                    href={source.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block p-2 rounded-md bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700 hover:border-cyan-500 transition-all"
                  >
                    <p className="text-sm text-cyan-400 font-semibold truncate">{source.web.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-1">{source.web.uri}</p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
