import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { PlugIcon } from './icons/PlugIcon';
import { authService } from '../services/authService';
import { graphService } from '../services/microsoftGraphService';

// Simple inline SVG for X icon
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25zM17.5 19.5h1.5l-8.5-11.25h-1.5l8.5 11.25z" />
    </svg>
);


export const ConnectionsPanel: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  // Microsoft Graph State
  const [isMsConnected, setIsMsConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // X (Twitter) State
  const [xApiKey, setXApiKey] = useState('');
  const [isXConnected, setIsXConnected] = useState(false);

  useEffect(() => {
    // Check for saved X API key on component mount
    const savedKey = localStorage.getItem('x_api_key');
    if (savedKey) {
        setIsXConnected(true);
    }
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login();
      const profile = await graphService.getUserProfile();
      setUserName(profile.displayName);
      setIsMsConnected(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await authService.logout();
    setIsMsConnected(false);
    setUserName(null);
  }

  const handleSaveXApiKey = () => {
    if (xApiKey.trim() === '') return;
    localStorage.setItem('x_api_key', xApiKey.trim());
    setIsXConnected(true);
    setXApiKey('');
  };

  const handleClearXApiKey = () => {
    localStorage.removeItem('x_api_key');
    setIsXConnected(false);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-sm bg-slate-900 border-r border-slate-700 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connections-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="connections-title" className="text-lg font-bold text-cyan-400">External Connections</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Connections Panel">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Microsoft Graph Connection */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-between">
                <div className='flex items-center space-x-3'>
                    <PlugIcon className="w-6 h-6 text-cyan-400" />
                    <div>
                        <p className="font-bold text-slate-100">Microsoft Graph</p>
                        <p className="text-xs text-slate-400">Access calendar, email, and contacts.</p>
                    </div>
                </div>
                {isMsConnected ? (
                     <button onClick={handleDisconnect} className="text-xs bg-red-800/80 hover:bg-red-700/80 text-red-200 px-3 py-1 rounded">Disconnect</button>
                ) : (
                    <button onClick={handleConnect} disabled={isLoading} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-black px-3 py-1 rounded disabled:bg-slate-700 disabled:cursor-wait">
                        {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                Status: {isMsConnected 
                    ? <span className="text-green-400 font-bold">Connected as {userName}</span> 
                    : <span className="text-amber-400">Disconnected</span>
                }
                {error && <p className='text-red-400 mt-1'>{error}</p>}
            </div>
          </div>
          
          {/* X (Twitter) Connection */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-between">
                <div className='flex items-center space-x-3'>
                    <XIcon className="w-6 h-6 text-slate-300" />
                    <div>
                        <p className="font-bold text-slate-100">X (Twitter)</p>
                        <p className="text-xs text-slate-400">Post updates to your profile.</p>
                    </div>
                </div>
                {isXConnected && (
                     <button onClick={handleClearXApiKey} className="text-xs bg-red-800/80 hover:bg-red-700/80 text-red-200 px-3 py-1 rounded">Clear Key</button>
                )}
            </div>
            
            {!isXConnected && (
              <div className="mt-3 flex items-center space-x-2">
                <input
                    type="password"
                    value={xApiKey}
                    onChange={(e) => setXApiKey(e.target.value)}
                    placeholder="Enter API Key..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    aria-label="X (Twitter) API Key"
                />
                <button 
                    onClick={handleSaveXApiKey}
                    disabled={!xApiKey.trim()}
                    className="text-xs bg-cyan-600 hover:bg-cyan-500 text-black px-3 py-1 rounded disabled:bg-slate-700 disabled:cursor-not-allowed">
                    Save
                </button>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                Status: {isXConnected
                    ? <span className="text-green-400 font-bold">API Key Saved</span> 
                    : <span className="text-amber-400">Disconnected</span>
                }
            </div>
          </div>
        </div>
      </div>
    </>
  );
};