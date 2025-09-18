
import React, { useState, useEffect } from 'react';

interface ResponseDisplayProps {
  text: string;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset on new text
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 10); // Adjust speed of typing here

    return () => clearInterval(intervalId);
  }, [text]);

  const formatLine = (line: string) => {
    const parts = line.split(/:(.*)/s);
    if (parts.length > 1) {
      const key = parts[0];
      const value = parts[1];
      return (
        <p className="mb-2">
          <span className="text-cyan-400">{key}:</span>
          <span className="text-slate-200">{value}</span>
        </p>
      );
    }
    return <p className="mb-2">{line}</p>;
  };
  
  return (
    <div className="mt-6 p-4 border border-slate-700 bg-slate-900/50 rounded-lg">
      <pre className="whitespace-pre-wrap font-mono text-sm">
        {displayedText.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {formatLine(line)}
          </React.Fragment>
        ))}
      </pre>
    </div>
  );
};
