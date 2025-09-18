
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="mt-6 p-4 border border-red-500/50 bg-red-900/30 rounded-lg text-red-300">
      <p className="font-bold text-red-200">SYSTEM ANOMALY DETECTED</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
};
