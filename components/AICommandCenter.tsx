
import React, { useState } from 'react';
import { Search, MapPin, Globe, ExternalLink, Loader2, Zap, Navigation } from 'lucide-react';
import { searchMarketInfo, findLocalSuppliers } from '../services/geminiService';
import { GroundingResult } from '../types';

const AICommandCenter: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'market' | 'maps'>('market');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GroundingResult | null>(null);

  const handleExecute = async () => {
    if (!query) return;
    setLoading(true);
    setResult(null);
    
    try {
      let res: GroundingResult;
      if (activeTool === 'market') {
        res = await searchMarketInfo(query);
      } else {
        res = await findLocalSuppliers(query);
      }
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
         <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            <span className="font-bold tracking-wide">AI Command Center</span>
         </div>
         <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
            INFRASTRUCTURE
         </div>
      </div>
      
      {/* Tool Selector */}
      <div className="flex border-b border-slate-200">
         <button 
           onClick={() => { setActiveTool('market'); setResult(null); setQuery(''); }}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTool === 'market' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <Globe size={16} /> Market Watch
         </button>
         <button 
           onClick={() => { setActiveTool('maps'); setResult(null); setQuery(''); }}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTool === 'maps' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <Navigation size={16} /> Supplier Scout
         </button>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
         <p className="text-xs text-slate-500 mb-2 font-medium uppercase">
            {activeTool === 'market' ? 'Google Search Grounding' : 'Google Maps Grounding'}
         </p>
         <div className="flex gap-2">
            <div className="relative flex-1">
               <input 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                 placeholder={activeTool === 'market' ? "e.g. Current price of Owens Corning Duration..." : "e.g. Roofing suppliers in Austin, TX..."}
                 className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               {activeTool === 'market' ? (
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
               ) : (
                   <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
               )}
            </div>
            <button 
              onClick={handleExecute}
              disabled={loading || !query}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
               {loading ? <Loader2 size={16} className="animate-spin"/> : 'Run'}
            </button>
         </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
         {result ? (
            <div className="space-y-4 animate-fade-in">
               <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {result.text}
               </div>
               
               {result.sources && result.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Verified Sources</p>
                     <div className="space-y-2">
                        {result.sources.map((source, i) => (
                           <a 
                             key={i} 
                             href={source.uri} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="flex items-center gap-2 text-xs text-indigo-600 hover:underline p-2 bg-indigo-50/50 rounded hover:bg-indigo-50 transition-colors"
                           >
                              <ExternalLink size={12} />
                              <span className="truncate">{source.title}</span>
                           </a>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
               {activeTool === 'market' ? <Globe size={48} strokeWidth={1}/> : <Navigation size={48} strokeWidth={1}/>}
               <p className="text-sm font-medium">Ready to query Google Intelligence</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default AICommandCenter;
