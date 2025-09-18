
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold relative inline-block">
        <span className="glitch-text" data-text="FuX">FuX</span>
      </h1>
      <p className="mt-2 text-slate-400 text-sm sm:text-base">System-Integrated Sentinel // Power Module Interface</p>
    </header>
  );
};
