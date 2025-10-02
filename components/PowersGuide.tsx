import React, { useState, useMemo } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import type { Plugin } from '../App';

interface PowersGuideProps {
  isOpen: boolean;
  plugins: Plugin[];
  onClose: () => void;
}

const categoryColorMap: { [key: string]: { border: string, bg: string, text: string } } = {
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


export const PowersGuide: React.FC<PowersGuideProps> = ({ isOpen, plugins, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const groupedPlugins = useMemo(() => {
    return plugins.reduce((acc, plugin) => {
      const category = plugin.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(plugin);
      return acc;
    }, {} as Record<string, Plugin[]>);
  }, [plugins]);

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => (prev === category ? null : category));
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
              {Object.entries(groupedPlugins).map(([category, powers]) => {
                const colors = categoryColorMap[category] || defaultColor;
                const isExpanded = expandedCategory === category;
                return (
                  <div key={category} className={`rounded-lg ${colors.bg} border ${colors.border.replace('-l-4', '')}`}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex justify-between items-center p-3 text-left focus:outline-none"
                      aria-expanded={isExpanded}
                    >
                      <h3 className={`font-bold ${colors.text}`}>{category}</h3>
                      <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                      <ul className="p-3 pt-0 space-y-2">
                        {powers.map(plugin => (
                          <li key={plugin.power_name} className="p-2 bg-slate-900/70 rounded-md">
                            <p className="font-bold text-slate-200 font-mono text-sm">{plugin.power_name}</p>
                            <p className="text-xs text-slate-400 mt-1">{plugin.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};