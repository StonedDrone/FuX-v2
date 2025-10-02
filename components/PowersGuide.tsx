import React, { useState, useMemo } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { DeployIcon } from './icons/DeployIcon';
import { StarIcon } from './icons/StarIcon';
import type { Plugin } from '../App';

interface PowersGuideProps {
  isOpen: boolean;
  plugins: Plugin[];
  onClose: () => void;
  onDeployPower: (powerName: string) => void;
  favoritePowers: Set<string>;
  onToggleFavorite: (powerName: string) => void;
}

const categoryColorMap: { [key: string]: { border: string, bg: string, text: string } } = {
  'Favorites': { border: 'border-yellow-400', bg: 'bg-yellow-900/50', text: 'text-yellow-300' },
  'Live Production': { border: 'border-rose-400', bg: 'bg-rose-900/50', text: 'text-rose-300' },
  '3D Graphics': { border: 'border-orange-400', bg: 'bg-orange-900/50', text: 'text-orange-300' },
  'Video Editing': { border: 'border-indigo-400', bg: 'bg-indigo-900/50', text: 'text-indigo-300' },
  'Audio Control': { border: 'border-emerald-400', bg: 'bg-emerald-900/50', text: 'text-emerald-300' },
  'Live Streaming': { border: 'border-purple-400', bg: 'bg-purple-900/50', text: 'text-purple-300' },
  'Generative AI': { border: 'border-amber-400', bg: 'bg-amber-900/50', text: 'text-amber-300' },
  'Web Intelligence': { border: 'border-sky-400', bg: 'bg-sky-900/50', text: 'text-sky-300' },
  'Core Function': { border: 'border-cyan-400', bg: 'bg-cyan-900/50', text: 'text-cyan-300' },
  'Utility': { border: 'border-green-400', bg: 'bg-green-900/50', text: 'text-green-300' },
  'General': { border: 'border-slate-500', bg: 'bg-slate-700/50', text: 'text-slate-300' },
};
const defaultColor = { border: 'border-slate-700', bg: 'bg-slate-700/50', text: 'text-slate-400' };

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

interface PowerItemProps {
  plugin: Plugin;
  isFavorite: boolean;
  onDeployPower: (powerName: string) => void;
  onToggleFavorite: (powerName: string) => void;
}

const PowerItem: React.FC<PowerItemProps> = ({ plugin, isFavorite, onDeployPower, onToggleFavorite }) => (
  <li className="p-2 bg-slate-900/70 rounded-md">
    <div className="flex justify-between items-start">
      <div className="flex items-start space-x-2">
         <button
          onClick={() => onToggleFavorite(plugin.power_name)}
          className="p-1 text-slate-500 hover:text-yellow-400 transition-colors flex-shrink-0"
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <StarIcon className="w-4 h-4" filled={isFavorite} />
        </button>
        <div>
          <p className="font-bold text-slate-200 font-mono text-sm">{plugin.power_name}</p>
          <p className="text-xs text-slate-400 mt-1">{plugin.description}</p>
        </div>
      </div>
      <button
        onClick={() => onDeployPower(plugin.power_name)}
        className="ml-2 flex-shrink-0 flex items-center space-x-1.5 px-2 py-1 text-xs rounded-md bg-cyan-600/50 text-cyan-200 hover:bg-cyan-600/80 transition-colors"
        title={`Deploy ${plugin.power_name}`}
      >
        <DeployIcon className="w-3 h-3" />
        <span>Deploy</span>
      </button>
    </div>
  </li>
);


export const PowersGuide: React.FC<PowersGuideProps> = ({ isOpen, plugins, onClose, onDeployPower, favoritePowers, onToggleFavorite }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Favorites']));

  const { favoritePlugins, categorizedPlugins } = useMemo(() => {
    const favorites: Plugin[] = [];
    const categorized: Record<string, Plugin[]> = {};

    for (const plugin of plugins) {
      if (favoritePowers.has(plugin.power_name)) {
        favorites.push(plugin);
      }
      const category = plugin.category || 'General';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(plugin);
    }
    
    // Sort favorites alphabetically
    favorites.sort((a, b) => a.power_name.localeCompare(b.power_name));
    
    // Sort categorized plugins alphabetically within each category
    for (const category in categorized) {
        categorized[category].sort((a, b) => a.power_name.localeCompare(b.power_name));
    }

    return { favoritePlugins: favorites, categorizedPlugins: categorized };
  }, [plugins, favoritePowers]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const renderCategory = (category: string, powers: Plugin[], isFavoritesSection = false) => {
    const colors = categoryColorMap[category] || defaultColor;
    const isExpanded = expandedCategories.has(category);
    if (!powers || powers.length === 0) return null;

    return (
      <div key={category} className={`rounded-lg ${colors.bg} border ${colors.border.replace('-l-4', '')}`}>
        <button
          onClick={() => toggleCategory(category)}
          className="w-full flex justify-between items-center p-3 text-left focus:outline-none"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center space-x-2">
            {isFavoritesSection && <StarIcon className={`w-5 h-5 ${colors.text}`} filled />}
            <h3 className={`font-bold ${colors.text}`}>{category}</h3>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}>
          <ul className="p-3 pt-0 space-y-2">
            {/* FIX: Removed redundant cast as `powers` is already typed in the function signature. */}
            {powers.map(plugin => (
              <PowerItem
                key={plugin.power_name}
                plugin={plugin}
                isFavorite={favoritePowers.has(plugin.power_name)}
                onDeployPower={onDeployPower}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </ul>
        </div>
      </div>
    );
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
        aria-labelledby="guide-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 id="guide-title" className="text-lg font-bold text-cyan-400">Powers Guide</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-cyan-400" aria-label="Close Guide">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          {plugins.length === 0 ? (
            <p className="text-slate-500 text-center mt-8">No Power Modules ingested. Use the <code className="bg-slate-800 px-1 rounded">/ingest</code> command.</p>
          ) : (
            <div className="space-y-3">
              {renderCategory('Favorites', favoritePlugins, true)}
              {/* FIX: Replaced Object.entries with Object.keys for better type inference from TypeScript. */}
              {Object.keys(categorizedPlugins)
                .sort((catA, catB) => catA.localeCompare(catB))
                .map((category) => renderCategory(category, categorizedPlugins[category]))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};