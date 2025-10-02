import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { PlugIcon } from './icons/PlugIcon';
import { authService } from '../services/authService';
import { graphService } from '../services/microsoftGraphService';


export const ConnectionsPanel: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login();
      const profile = await graphService.getUserProfile();
      setUserName(profile.displayName);
      setIsConnected(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await authService.logout();
    setIsConnected(false);
    setUserName(null);
  }

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
        <div className="p-4">
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-between">
                <div className='flex items-center space-x-3'>
                    <PlugIcon className="w-6 h-6 text-cyan-400" />
                    <div>
                        <p className="font-bold text-slate-100">Microsoft Graph</p>
                        <p className="text-xs text-slate-400">Access calendar, email, and contacts.</p>
                    </div>
                </div>
                {isConnected ? (
                     <button onClick={handleDisconnect} className="text-xs bg-red-800/80 hover:bg-red-700/80 text-red-200 px-3 py-1 rounded">Disconnect</button>
                ) : (
                    <button onClick={handleConnect} disabled={isLoading} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-black px-3 py-1 rounded disabled:bg-slate-700 disabled:cursor-wait">
                        {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                Status: {isConnected 
                    ? <span className="text-green-400 font-bold">Connected as {userName}</span> 
                    : <span className="text-amber-400">Disconnected</span>
                }
                {error && <p className='text-red-400 mt-1'>{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
