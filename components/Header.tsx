import React from 'react';
import { TtsToggle } from './TtsToggle';

interface HeaderProps {
  isTtsEnabled: boolean;
  onToggleTts: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isTtsEnabled, onToggleTts }) => {
  return (
    <header className="text-center relative">
      <h1 className="text-4xl sm:text-5xl font-bold relative inline-block">
        <span className="glitch-text" data-text="FuX">FuX</span>
      </h1>
      <p className="mt-2 text-slate-400 text-sm sm:text-base">System-Integrated Sentinel // Power Module Interface</p>
      <div className="absolute top-0 right-0 h-full flex items-center">
        <TtsToggle isEnabled={isTtsEnabled} onToggle={onToggleTts} />
      </div>
    </header>
  );
};
