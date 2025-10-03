import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { FileUpload } from './FileUpload';

interface IngestRepositoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestFile: (file: File) => void;
}

export const IngestRepositoryPanel: React.FC<IngestRepositoryPanelProps> = ({ isOpen, onClose, onIngestFile }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (file) {
      onIngestFile(file);
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingest-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="ingest-title" className="text-lg font-bold text-cyan-400">Ingest Matrix</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Ingest Matrix">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 h-[calc(100%-65px)] flex flex-col">
          <p className="text-sm text-slate-400 mb-4">
            Upload a code repository (e.g., a <code className="bg-slate-800 px-1 rounded">.py</code> or <code className="bg-slate-800 px-1 rounded">.js</code> file) to integrate its functions as new Power Modules. FuX will analyze the code and make its capabilities available to the agent.
          </p>
          
          <FileUpload onFileSelect={setFile} />

          {file && (
            <div className="mt-4 text-center p-2 bg-slate-800 rounded-md">
              <p className="text-sm text-slate-300 font-mono truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}

          <div className="mt-auto pt-4">
            <button
              onClick={handleSubmit}
              disabled={!file}
              className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              Analyze & Ingest
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
