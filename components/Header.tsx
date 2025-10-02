import React from 'react';
import { TtsToggle } from './TtsToggle';
import { RegistryIcon } from './icons/RegistryIcon';
import { PlugIcon } from './icons/PlugIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';


interface HeaderProps {
  onToggleRegistry: () => void;
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  onToggleConnections: () => void;
  onTogglePowersGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleRegistry, isTtsEnabled, onToggleTts, onToggleConnections, onTogglePowersGuide }) => {
  return (
    <header className="flex justify-between items-center p-4 border-b border-slate-800">
      <div className="text-center">
        <h1 className="text-xl font-bold text-cyan-400 tracking-wider">FuX</h1>
        <h2 className="text-xs text-slate-500 tracking-widest">FUSION EXPERIENCE AI</h2>
      </div>
      <div className="flex items-center space-x-2">
        <TtsToggle isEnabled={isTtsEnabled} onToggle={onToggleTts} />
        <button
          onClick={onTogglePowersGuide}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          aria-label="Toggle Powers Guide"
          title="Toggle Powers Guide"
        >
          <BookOpenIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onToggleConnections}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          aria-label="Toggle Connections Panel"
          title="Toggle Connections Panel"
        >
          <PlugIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onToggleRegistry}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          aria-label="Toggle Power Module Arsenal"
          title="Toggle Power Module Arsenal"
        >
          <RegistryIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};