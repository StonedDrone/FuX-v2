import React from 'react';
import { TtsToggle } from './TtsToggle';
import { RegistryIcon } from './icons/RegistryIcon';

interface HeaderProps {
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  onToggleRegistry: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isTtsEnabled, onToggleTts, onToggleRegistry }) => {
  return (
    <header className="text-center relative">
      <h1 className="text-4xl sm:text-5xl font-bold relative inline-block">
        <span className="glitch-text" data-text="FuX">FuX</span>
      </h1>
      <p className="mt-2 text-slate-400 text-sm sm:text-base">System-Integrated Sentinel // Power Module Interface</p>
      <div className="absolute top-0 right-0 h-full flex items-center space-x-2">
        <TtsToggle isEnabled={isTtsEnabled} onToggle={onToggleTts} />
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