import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { LinkedInIcon } from './icons/LinkedInIcon';
import { authService } from '../services/authService';
import { graphService } from '../services/microsoftGraphService';
import { GithubIcon } from './icons/GithubIcon';
import { InstagramIcon } from './icons/InstagramIcon';
import { FacebookIcon } from './icons/FacebookIcon';
import { KickIcon } from './icons/KickIcon';
import { TwitchIcon } from './icons/TwitchIcon';
import { XIcon } from './icons/XIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { YouTubeIcon } from './icons/YouTubeIcon';


interface ConnectionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  displayName: string;
  mail: string;
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ isOpen, onClose }) => {
  // Microsoft Graph State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // X API Key State
  const [xApiKey, setXApiKey] = useState('');
  const [isXApiKeySaved, setIsXApiKeySaved] = useState(false);
  const [isXApiKeyVisible, setIsXApiKeyVisible] = useState(false);

  // Load saved API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('x_api_key');
    if (savedKey) {
      setXApiKey(savedKey);
      setIsXApiKeySaved(true);
    }
  }, []);

  useEffect(() => {
    const account = authService.getAccount();
    if (isOpen && account) {
      handleGetUserProfile();
    } else if (!isOpen) {
      setUser(null);
      setError(null);
    }
  }, [isOpen]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login();
      await handleGetUserProfile();
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleGetUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userProfile = await graphService.getUserProfile();
      setUser(userProfile);
    } catch (e: any) {
      setError(e.message || 'Could not fetch user profile.');
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleSaveXApiKey = () => {
    localStorage.setItem('x_api_key', xApiKey);
    setIsXApiKeySaved(true);
  };

  const handleClearXApiKey = () => {
    localStorage.removeItem('x_api_key');
    setXApiKey('');
    setIsXApiKeySaved(false);
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
        aria-labelledby="connections-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="connections-title" className="text-lg font-bold text-cyan-400">Connections</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Connections">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-65px)] space-y-8">
          
          {/* Cloud Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Cloud Integrations</h3>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-100">Microsoft 365</p>
                <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-slate-500'}`}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1 mb-4">Access your profile, files, and emails.</p>
              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
              {user ? (
                <div>
                  <p className="text-sm text-slate-300">Signed in as <span className="font-semibold text-cyan-400">{user.displayName}</span></p>
                  <p className="text-xs text-slate-500">{user.mail}</p>
                  <button 
                    onClick={handleLogout}
                    className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
          
          {/* API Keys */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">API Keys</h3>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <XIcon className="w-5 h-5 text-slate-300"/>
                    <p className="font-bold text-slate-100">X (Twitter)</p>
                 </div>
                <div className={`w-3 h-3 rounded-full ${isXApiKeySaved ? 'bg-green-500' : 'bg-slate-500'}`}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1 mb-4">Provide an API key for X integration.</p>
               <div className="relative flex items-center mb-3">
                <input
                  type={isXApiKeyVisible ? 'text' : 'password'}
                  value={xApiKey}
                  onChange={(e) => setXApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-10"
                />
                <button
                  onClick={() => setIsXApiKeyVisible(prev => !prev)}
                  className="absolute right-2 text-slate-400 hover:text-slate-200"
                  aria-label={isXApiKeyVisible ? 'Hide API key' : 'Show API key'}
                >
                  {isXApiKeyVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleSaveXApiKey}
                  disabled={!xApiKey}
                  className="flex-1 py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={handleClearXApiKey}
                  disabled={!isXApiKeySaved}
                  className="flex-1 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Creator Network */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Creator Network</h3>
            <div className="grid grid-cols-2 gap-4">
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <LinkedInIcon className="w-6 h-6 text-slate-400 group-hover:text-[#0A66C2] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">LinkedIn</p>
                </div>
              </a>
              <a href="https://www.github.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <GithubIcon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">GitHub</p>
                </div>
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <InstagramIcon className="w-6 h-6 text-slate-400 group-hover:text-[#E1306C] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">Instagram</p>
                </div>
              </a>
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <FacebookIcon className="w-6 h-6 text-slate-400 group-hover:text-[#1877F2] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">Facebook</p>
                </div>
              </a>
              <a href="https://www.twitch.tv/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <TwitchIcon className="w-6 h-6 text-slate-400 group-hover:text-[#9146FF] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">Twitch</p>
                </div>
              </a>
              <a href="https://kick.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <KickIcon className="w-6 h-6 text-slate-400 group-hover:text-[#53FC18] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">Kick</p>
                </div>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 transition-all">
                <YouTubeIcon className="w-6 h-6 text-slate-400 group-hover:text-[#FF0000] transition-colors" />
                <div>
                  <p className="font-bold text-sm text-slate-100">YouTube</p>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};