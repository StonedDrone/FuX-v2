
import React from 'react';

interface LoaderProps {
  fileName: string | null;
}

export const Loader: React.FC<LoaderProps> = ({ fileName }) => {
  return (
    <div className="mt-6 flex flex-col items-center justify-center p-4 border border-slate-800 bg-slate-900/50 rounded-lg">
      <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
      <p className="mt-3 text-sm text-slate-400">Integrating Module...</p>
      {fileName && <p className="mt-1 text-xs text-slate-500 truncate max-w-xs">{fileName}</p>}
    </div>
  );
};
