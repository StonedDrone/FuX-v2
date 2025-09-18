import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
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
            <span className="font-semibold text-cyan-400">Upload Power Module</span> or drag & drop
          </p>
          <p className="text-xs text-slate-500">Python, JSON, JS/TS, etc. (Max 50MB)</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};