import React from 'react';
import { SpeakerOnIcon } from './icons/SpeakerOnIcon';
import { SpeakerOffIcon } from './icons/SpeakerOffIcon';

interface TtsToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export const TtsToggle: React.FC<TtsToggleProps> = ({ isEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
      aria-label={isEnabled ? 'Disable Text-to-Speech' : 'Enable Text-to-Speech'}
      title={isEnabled ? 'Disable Text-to-Speech' : 'Enable Text-to-Speech'}
    >
      {isEnabled ? (
        <SpeakerOnIcon className="w-6 h-6" />
      ) : (
        <SpeakerOffIcon className="w-6 h-6" />
      )}
    </button>
  );
};
