import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { LinkedInIcon } from './icons/LinkedInIcon';
import { authService } from '../services/authService';
import { graphService } from '../services/microsoftGraphService';
import { vmixService } from '../services/vmixService';
import { blenderService } from '../services/blenderService';
import { videoService } from '../services/videoService';
import { GithubIcon } from './icons/GithubIcon';
import { InstagramIcon } from './icons/InstagramIcon';
import { FacebookIcon } from './icons/FacebookIcon';
import { KickIcon } from './icons/KickIcon';
import { TwitchIcon } from './icons/TwitchIcon';
import { XIcon } from './icons/XIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { YouTubeIcon } from './icons/YouTubeIcon';
import { VMixIcon } from './icons/VMixIcon';
import { BlenderIcon } from './icons/BlenderIcon';
import { VideoIcon } from './icons/VideoIcon';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { spotifyService } from '../services/spotifyService';
import { twitchService } from '../services/twitchService';


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
  const [isMsLoading, setIsMsLoading] = useState(false);
  const [msError, setMsError] = useState<string | null>(null);
  
  // X API Key State
  const [xApiKey, setXApiKey] = useState('');
  const [isXApiKeySaved, setIsXApiKeySaved] = useState(false);
  const [isXApiKeyVisible, setIsXApiKeyVisible] = useState(false);

  // vMix State
  const [vMixHost, setVMixHost] = useState('127.0.0.1');
  const [vMixPort, setVMixPort] = useState('8088');
  const [isVMixConnected, setIsVMixConnected] = useState(false);
  const [isVMixConnecting, setIsVMixConnecting] = useState(false);
  const [vMixError, setVMixError] = useState<string | null>(null);

  // Blender State
  const [blenderHost, setBlenderHost] = useState('127.0.0.1');
  const [blenderPort, setBlenderPort] = useState('8080');
  const [isBlenderConnected, setIsBlenderConnected] = useState(false);
  const [isBlenderConnecting, setIsBlenderConnecting] = useState(false);
  const [blenderError, setBlenderError] = useState<string | null>(null);

  // Video Service State
  const [videoHost, setVideoHost] = useState('127.0.0.1');
  const [videoPort, setVideoPort] = useState('8090');
  const [isVideoConnected, setIsVideoConnected] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Spotify State
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyConnecting, setIsSpotifyConnecting] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  
  // Twitch State
  const [twitchStreamKey, setTwitchStreamKey] = useState('');
  const [isTwitchKeySaved, setIsTwitchKeySaved] = useState(false);
  const [isTwitchKeyVisible, setIsTwitchKeyVisible] = useState(false);


  // Load saved API keys and settings from localStorage on component mount
  useEffect(() => {
    const savedXKey = localStorage.getItem('x_api_key');
    if (savedXKey) {
      setXApiKey(savedXKey);
      setIsXApiKeySaved(true);
    }
    const savedVMixHost = localStorage.getItem('vmix_host');
    if (savedVMixHost) setVMixHost(savedVMixHost);
    const savedVMixPort = localStorage.getItem('vmix_port');
    if (savedVMixPort) setVMixPort(savedVMixPort);

    const savedBlenderHost = localStorage.getItem('blender_host');
    if (savedBlenderHost) setBlenderHost(savedBlenderHost);
    const savedBlenderPort = localStorage.getItem('blender_port');
    if (savedBlenderPort) setBlenderPort(savedBlenderPort);
    
    const savedVideoHost = localStorage.getItem('video_host');
    if (savedVideoHost) setVideoHost(savedVideoHost);
    const savedVideoPort = localStorage.getItem('video_port');
    if (savedVideoPort) setVideoPort(savedVideoPort);

    const spotifyAccount = spotifyService.getAccount();
    if (spotifyAccount) {
      setIsSpotifyConnected(true);
    }

    const savedTwitchKey = twitchService.getStreamKey();
    if (savedTwitchKey) {
      setTwitchStreamKey(savedTwitchKey);
      setIsTwitchKeySaved(true);
    } else {
      // Pre-fill with the key from the user's prompt as a convenience
      setTwitchStreamKey('live_484288535_zGSHcaJnrqIkoqqo8DyLjRDk4HgMLv');
    }

  }, []);

  useEffect(() => {
    const account = authService.getAccount();
    if (isOpen && account) {
      handleGetUserProfile();
    } else if (!isOpen) {
      setUser(null);
      setMsError(null);
    }
  }, [isOpen]);

  const handleLogin = async () => {
    setIsMsLoading(true);
    setMsError(null);
    try {
      await authService.login();
      await handleGetUserProfile();
    } catch (e: any) {
      setMsError(e.message || 'Login failed. Please try again.');
    } finally {
      setIsMsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleGetUserProfile = async () => {
    setIsMsLoading(true);
    setMsError(null);
    try {
      const userProfile = await graphService.getUserProfile();
      setUser(userProfile);
    } catch (e: any) {
      setMsError(e.message || 'Could not fetch user profile.');
    } finally {
      setIsMsLoading(false);
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

  const handleConnectVMix = async () => {
    setIsVMixConnecting(true);
    setVMixError(null);
    try {
      const success = await vmixService.checkConnection(vMixHost, vMixPort);
      if (success) {
        setIsVMixConnected(true);
        localStorage.setItem('vmix_host', vMixHost);
        localStorage.setItem('vmix_port', vMixPort);
        vmixService.setConnection(vMixHost, vMixPort);
      } else {
        throw new Error('vMix API did not respond as expected.');
      }
    } catch (err) {
      setVMixError('Connection failed. Check host/port and ensure vMix Web Controller is active.');
      setIsVMixConnected(false);
    } finally {
      setIsVMixConnecting(false);
    }
  };

  const handleDisconnectVMix = () => {
    setIsVMixConnected(false);
    vmixService.disconnect();
  };

  const handleConnectBlender = async () => {
    setIsBlenderConnecting(true);
    setBlenderError(null);
    try {
      const success = await blenderService.checkConnection(blenderHost, blenderPort);
      if (success) {
        setIsBlenderConnected(true);
        localStorage.setItem('blender_host', blenderHost);
        localStorage.setItem('blender_port', blenderPort);
        blenderService.setConnection(blenderHost, blenderPort);
      } else {
        throw new Error('Blender addon did not respond.');
      }
    } catch (err) {
      setBlenderError('Connection failed. Check host/port and ensure the control addon is running in Blender.');
      setIsBlenderConnected(false);
    } finally {
      setIsBlenderConnecting(false);
    }
  };

  const handleDisconnectBlender = () => {
    setIsBlenderConnected(false);
    setBlenderError(null);
    blenderService.disconnect();
  };

  const handleConnectVideo = async () => {
    setIsVideoConnecting(true);
    setVideoError(null);
    try {
      const success = await videoService.checkConnection(videoHost, videoPort);
      if (success) {
        setIsVideoConnected(true);
        localStorage.setItem('video_host', videoHost);
        localStorage.setItem('video_port', videoPort);
        videoService.setConnection(videoHost, videoPort);
      } else {
        throw new Error('Video service did not respond.');
      }
    } catch (err) {
      setVideoError('Connection failed. Check host/port and ensure the video service is running.');
      setIsVideoConnected(false);
    } finally {
      setIsVideoConnecting(false);
    }
  };

  const handleDisconnectVideo = () => {
    setIsVideoConnected(false);
    videoService.disconnect();
  };

  const handleConnectSpotify = async () => {
    setIsSpotifyConnecting(true);
    setSpotifyError(null);
    try {
      await spotifyService.login();
      setIsSpotifyConnected(true);
    } catch (e: any) {
      setSpotifyError(e.message || 'Spotify connection failed.');
    } finally {
      setIsSpotifyConnecting(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    await spotifyService.logout();
    setIsSpotifyConnected(false);
  };
  
  const handleSaveTwitchKey = () => {
    twitchService.setStreamKey(twitchStreamKey);
    setIsTwitchKeySaved(true);
  };

  const handleClearTwitchKey = () => {
    twitchService.clearStreamKey();
    setTwitchStreamKey('');
    setIsTwitchKeySaved(false);
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
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-100">Microsoft 365</p>
                  <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                </div>
                <p className="text-xs text-slate-400 mt-1 mb-4">Access your profile, files, and emails.</p>
                {msError && <p className="text-xs text-red-400 mb-3">{msError}</p>}
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
                    disabled={isMsLoading}
                    className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                  >
                    {isMsLoading ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
              {/* Spotify Card */}
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <SpotifyIcon className="w-6 h-6 text-[#1DB954]" />
                    <p className="font-bold text-slate-100">Spotify</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${isSpotifyConnected ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                </div>
                <p className="text-xs text-slate-400 mt-1 mb-4">Connect your Spotify account to control playback.</p>
                {spotifyError && <p className="text-xs text-red-400 mb-3">{spotifyError}</p>}
                {isSpotifyConnected ? (
                  <div>
                    <p className="text-sm text-slate-300">Signed in to Spotify.</p>
                    <button 
                      onClick={handleDisconnectSpotify}
                      className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectSpotify}
                    disabled={isSpotifyConnecting}
                    className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                  >
                    {isSpotifyConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Streaming Services */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Streaming Services</h3>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <TwitchIcon className="w-5 h-5 text-slate-300"/>
                    <p className="font-bold text-slate-100">Twitch</p>
                 </div>
                <div className={`w-3 h-3 rounded-full ${isTwitchKeySaved ? 'bg-green-500' : 'bg-slate-500'}`}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1 mb-4">Provide a stream key to broadcast via vMix.</p>
               <div className="relative flex items-center mb-3">
                <input
                  type={isTwitchKeyVisible ? 'text' : 'password'}
                  value={twitchStreamKey}
                  onChange={(e) => setTwitchStreamKey(e.target.value)}
                  placeholder="Enter your stream key..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-10"
                />
                <button
                  onClick={() => setIsTwitchKeyVisible(prev => !prev)}
                  className="absolute right-2 text-slate-400 hover:text-slate-200"
                  aria-label={isTwitchKeyVisible ? 'Hide stream key' : 'Show stream key'}
                >
                  {isTwitchKeyVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleSaveTwitchKey}
                  disabled={!twitchStreamKey}
                  className="flex-1 py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={handleClearTwitchKey}
                  disabled={!isTwitchKeySaved}
                  className="flex-1 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>


          {/* Local Software Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Local Software Integrations</h3>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-6">
                {/* vMix Card */}
                <div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <VMixIcon className="w-5 h-5 text-slate-300"/>
                            <p className="font-bold text-slate-100">vMix</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isVMixConnected ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Connect to the vMix Web Controller API.</p>
                    {vMixError && <p className="text-xs text-red-400 mb-3">{vMixError}</p>}
                    
                    {isVMixConnected ? (
                        <div>
                            <p className="text-sm text-slate-300">Connected to <span className="font-semibold text-cyan-400">{vMixHost}:{vMixPort}</span></p>
                            <button 
                                onClick={handleDisconnectVMix}
                                className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={vMixHost}
                                    onChange={(e) => setVMixHost(e.target.value)}
                                    placeholder="Host (e.g., 127.0.0.1)"
                                    className="w-2/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <input
                                    type="text"
                                    value={vMixPort}
                                    onChange={(e) => setVMixPort(e.target.value)}
                                    placeholder="Port"
                                    className="w-1/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <button 
                                onClick={handleConnectVMix}
                                disabled={isVMixConnecting}
                                className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                            >
                                {isVMixConnecting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Blender Card */}
                <div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <BlenderIcon className="w-5 h-5 text-slate-300"/>
                            <p className="font-bold text-slate-100">Blender</p>
                        </div>
                        {isBlenderConnecting ? (
                            <div className="flex items-center space-x-2 text-xs text-amber-400">
                                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                <span>Connecting</span>
                            </div>
                        ) : isBlenderConnected ? (
                            <div className="flex items-center space-x-2 text-xs text-green-400">
                                <div className="w-2 h-2 bg-current rounded-full"></div>
                                <span>Connected</span>
                            </div>
                        ) : blenderError ? (
                            <div className="flex items-center space-x-2 text-xs text-red-400">
                                <div className="w-2 h-2 bg-current rounded-full"></div>
                                <span>Error</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <div className="w-2 h-2 bg-current rounded-full"></div>
                                <span>Disconnected</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Connect to a Blender scripting addon.</p>
                    {blenderError && <p className="text-xs text-red-400 mb-3">{blenderError}</p>}
                    
                    {isBlenderConnected ? (
                        <div>
                            <p className="text-sm text-slate-300">Connected to <span className="font-semibold text-cyan-400">{blenderHost}:{blenderPort}</span></p>
                            <button 
                                onClick={handleDisconnectBlender}
                                className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={blenderHost}
                                    onChange={(e) => setBlenderHost(e.target.value)}
                                    placeholder="Host (e.g., 127.0.0.1)"
                                    className="w-2/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <input
                                    type="text"
                                    value={blenderPort}
                                    onChange={(e) => setBlenderPort(e.target.value)}
                                    placeholder="Port"
                                    className="w-1/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <button 
                                onClick={handleConnectBlender}
                                disabled={isBlenderConnecting}
                                className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                            >
                                {isBlenderConnecting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Video Service Card */}
                <div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <VideoIcon className="w-5 h-5 text-slate-300"/>
                            <p className="font-bold text-slate-100">OpenCut Video Service</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isVideoConnected ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Connect to a video editing backend.</p>
                    {videoError && <p className="text-xs text-red-400 mb-3">{videoError}</p>}
                    
                    {isVideoConnected ? (
                        <div>
                            <p className="text-sm text-slate-300">Connected to <span className="font-semibold text-cyan-400">{videoHost}:{videoPort}</span></p>
                            <button 
                                onClick={handleDisconnectVideo}
                                className="w-full mt-4 py-2 px-4 text-sm font-semibold rounded-md bg-rose-600/50 text-rose-200 hover:bg-rose-600/80 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={videoHost}
                                    onChange={(e) => setVideoHost(e.target.value)}
                                    placeholder="Host (e.g., 127.0.0.1)"
                                    className="w-2/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <input
                                    type="text"
                                    value={videoPort}
                                    onChange={(e) => setVideoPort(e.target.value)}
                                    placeholder="Port"
                                    className="w-1/3 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <button 
                                onClick={handleConnectVideo}
                                disabled={isVideoConnecting}
                                className="w-full py-2 px-4 text-sm font-semibold rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 disabled:bg-slate-700 disabled:cursor-wait transition-colors"
                            >
                                {isVideoConnecting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    )}
                </div>

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
