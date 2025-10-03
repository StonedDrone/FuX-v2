
import React from 'react';
import type { ChatSession } from '../App';
import { CloseIcon } from './icons/CloseIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSwitchChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
}

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchChat,
  onDeleteChat
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-xs bg-slate-900 border-r border-slate-700 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <h2 id="history-title" className="text-lg font-bold text-cyan-400">Chat History</h2>
            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close History">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-2 border-b border-slate-700">
            <button 
              onClick={onNewChat}
              className="w-full flex items-center justify-center space-x-2 p-2 rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>
          <div className="flex-grow p-2 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-center mt-8">No chat sessions.</p>
            ) : (
              <ul className="space-y-1">
                {sessions.map((session) => (
                  <li key={session.id} className="group">
                    <button
                      onClick={() => onSwitchChat(session.id)}
                      className={`w-full text-left p-2 rounded-md flex items-center justify-between transition-colors ${
                        session.id === activeSessionId
                          ? 'bg-slate-700'
                          : 'bg-slate-800/50 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-sm text-slate-200 truncate pr-2">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(session.id);
                        }}
                        className="p-1 rounded-md text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 hover:text-red-400 transition-opacity"
                        aria-label={`Delete chat: ${session.title}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
