import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (files: FileList) => void;
  onUrlSubmit: (urls: string) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onUrlSubmit, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [urls, setUrls] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  }, [disabled, onFileUpload]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleUrlFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urls.trim() && !disabled) {
      onUrlSubmit(urls.trim());
      setUrls('');
    }
  };

  const borderStyle = isDragging
    ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.6)]'
    : 'border-slate-700 hover:border-cyan-500';

  const cursorStyle = disabled ? 'cursor-not-allowed' : 'cursor-pointer';

  return (
    <div className="w-full">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 ${borderStyle} border-dashed rounded-lg ${cursorStyle} bg-slate-900/50 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <UploadIcon className="w-10 h-10 mb-3 text-slate-500" />
          <p className="mb-2 text-sm text-slate-400">
            <span className="font-semibold text-cyan-400">Upload Power Modules</span> or drag & drop
          </p>
          <p className="text-xs text-slate-500">Python, JSON, JS/TS, etc. (Max 50MB total)</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} disabled={disabled} multiple />
      </label>

      <div className="my-6 flex items-center" aria-hidden="true">
        <div className="flex-grow border-t border-slate-700"></div>
        <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold tracking-wider">OR</span>
        <div className="flex-grow border-t border-slate-700"></div>
      </div>

      <form onSubmit={handleUrlFormSubmit}>
        <label htmlFor="url-input" className="block mb-2 text-sm font-semibold text-cyan-400">
          Absorb from GitHub Repositories
        </label>
        <div className="flex items-start space-x-2">
          <textarea
            id="url-input"
            rows={3}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://github.com/owner/repository&#10;https://github.com/another/repo"
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 resize-y"
            disabled={disabled}
            required
          />
          <button
            type="submit"
            disabled={disabled || !urls.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold enabled:hover:bg-cyan-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors self-center"
            aria-label="Absorb from URLs"
          >
            Absorb
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Enter one URL per line. Each repository's README.md will be analyzed.</p>
      </form>
    </div>
  );
};