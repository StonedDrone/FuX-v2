import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { StarIcon } from './icons/StarIcon';
import type { Plugin } from '../App';

interface PluginRegistryProps {
  isOpen: boolean;
  plugins: Plugin[];
  onPluginSelect: (powerName: string) => void;
  onClose: () => void;
  favoritePowers: Set<string>;
}

const categoryColorMap: { [key: string]: string } = {
  'Live Production': 'border-l-rose-400 hover:bg-rose-900/50 hover:border-rose-300',
  '3D Graphics': 'border-l-orange-400 hover:bg-orange-900/50 hover:border-orange-300',
  'Video Editing': 'border-l-indigo-400 hover:bg-indigo-900/50 hover:border-indigo-300',
  'Audio Control': 'border-l-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-300',
  'Live Streaming': 'border-l-purple-400 hover:bg-purple-900/50 hover:border-purple-300',
  'Generative AI': 'border-l-amber-400 hover:bg-amber-900/50 hover:border-amber-300',
  'Web Intelligence': 'border-l-sky-400 hover:bg-sky-900/50 hover:border-sky-300',
  'Core Function': 'border-l-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-300',
  'Utility': 'border-l-green-400 hover:bg-green-900/50 hover:border-green-300',
  'General': 'border-l-slate-500 hover:bg-slate-700/50 hover:border-slate-400',
};
const defaultColor = 'border-l-slate-700 hover:bg-slate-700/50 hover:border-slate-500';

export const PluginRegistry: React.FC<PluginRegistryProps> = ({ isOpen, plugins, onPluginSelect, onClose, favoritePowers }) => {
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
        aria-labelledby="arsenal-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="arsenal-title" className="text-lg font-bold text-cyan-400">Power Module Arsenal</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Arsenal">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          {plugins.length === 0 ? (
            <p className="text-slate-500 text-center mt-8">No Power Modules ingested. Use the <code className="bg-slate-800 px-1 rounded">/ingest</code> command.</p>
          ) : (
            <ul className="space-y-2">
              {plugins.map((plugin) => {
                const colorClass = categoryColorMap[plugin.category || ''] || defaultColor;
                const isFavorite = favoritePowers.has(plugin.power_name);
                return (
                  <li key={plugin.power_name}>
                    <button
                      onClick={() => onPluginSelect(plugin.power_name)}
                      className={`w-full text-left p-3 rounded-lg bg-slate-800/50 border-l-4 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colorClass}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {isFavorite && <StarIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" filled />}
                          <p className="font-bold text-slate-100">{plugin.power_name}</p>
                        </div>
                        {plugin.category && <p className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{plugin.category}</p>}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">Source: {plugin.source}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};