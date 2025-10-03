import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileUpload } from './FileUpload';

export interface CodexFile {
  name: string;
  content: string;
}

interface CodexPanelProps {
  isOpen: boolean;
  onClose: () => void;
  codexFiles: CodexFile[];
  onAddFile: (file: File) => void;
  onDeleteFile: (fileName: string) => void;
}

export const CodexPanel: React.FC<CodexPanelProps> = ({ isOpen, onClose, codexFiles, onAddFile, onDeleteFile }) => {
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
        aria-labelledby="codex-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="codex-title" className="text-lg font-bold text-cyan-400">FuX's Codex</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Codex">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 h-[calc(100%-65px)] flex flex-col">
          <p className="text-sm text-slate-400 mb-4">
            Upload files containing core beliefs, directives, and laws for FuX. The content of these files will be treated as LAW and will preface every decision and response.
          </p>
          
          <FileUpload onFileSelect={onAddFile} />

          <div className="mt-4 flex-grow overflow-y-auto pr-2">
            {codexFiles.length > 0 ? (
                <ul className="space-y-2">
                    {codexFiles.map((file) => (
                        <li key={file.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md group">
                            <p className="text-sm text-slate-300 font-mono truncate">{file.name}</p>
                            <button
                                onClick={() => onDeleteFile(file.name)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-900/50 rounded-md opacity-50 group-hover:opacity-100 transition-opacity"
                                aria-label={`Delete ${file.name}`}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-sm text-slate-500 mt-8">The Codex is empty.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
