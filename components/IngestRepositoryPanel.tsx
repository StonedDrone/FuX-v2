import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { FileUpload } from './FileUpload';

interface IngestRepositoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestFile: (file: File) => void;
  onIngestUrls: (urls: string[]) => void;
}

export const IngestRepositoryPanel: React.FC<IngestRepositoryPanelProps> = ({ isOpen, onClose, onIngestFile, onIngestUrls }) => {
  const [file, setFile] = useState<File | null>(null);
  const [urls, setUrls] = useState('');

  const handleFileSubmit = () => {
    if (file) {
      onIngestFile(file);
      setFile(null);
    }
  };

  const handleUrlSubmit = () => {
    if (urls.trim()) {
      const urlArray = urls.split('\n').map(u => u.trim()).filter(Boolean);
      onIngestUrls(urlArray);
      setUrls('');
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
          <div className="flex-grow overflow-y-auto pr-2">
            {/* Section 1: Single File Upload */}
            <h3 className="text-base font-semibold text-slate-300 mb-2">Ingest Single File</h3>
            <p className="text-sm text-slate-400 mb-4">
              Upload a single code file to integrate its functions as a new Power Module.
            </p>
            <FileUpload onFileSelect={setFile} />
            {file && (
              <div className="mt-4 text-center p-2 bg-slate-800 rounded-md">
                <p className="text-sm text-slate-300 font-mono truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            )}
            <button
              onClick={handleFileSubmit}
              disabled={!file}
              className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              Analyze & Ingest File
            </button>

            <div className="my-8 border-t border-slate-700"></div>

            {/* Section 2: Batch URL Upload */}
            <h3 className="text-base font-semibold text-slate-300 mb-2">Batch Ingest from GitHub</h3>
            <p className="text-sm text-slate-400 mb-4">
              Enter public GitHub repository URLs (one per line). FuX will fetch all supported source files and analyze them as a single module per repository.
            </p>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://github.com/owner/repo1&#10;https://github.com/another-owner/repo2"
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono text-xs"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urls.trim()}
              className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              Analyze & Ingest URLs
            </button>
          </div>
        </div>
      </div>
    </>
  );
};