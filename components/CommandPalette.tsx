
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { Search, MapPin, ArrowRight, User, Settings, Calendar, DollarSign } from 'lucide-react';
import { Tab } from '../types';

interface CommandPaletteProps {
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const { leads, setTab } = useStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Navigation Items
  const navItems = [
    { name: 'Dashboard', tab: Tab.DASHBOARD, icon: <ArrowRight size={14}/> },
    { name: 'Leads Pipeline', tab: Tab.LEADS, icon: <User size={14}/> },
    { name: 'Calendar', tab: Tab.CALENDAR, icon: <Calendar size={14}/> },
    { name: 'Invoices', tab: Tab.INVOICES, icon: <DollarSign size={14}/> },
    { name: 'Settings', tab: Tab.SETTINGS, icon: <Settings size={14}/> },
  ];

  // Filter Items
  const filteredNav = navItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const filteredLeads = leads.filter(lead => lead.name.toLowerCase().includes(query.toLowerCase()) || lead.address.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  
  const totalItems = filteredNav.length + filteredLeads.length;

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % totalItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalItems, selectedIndex]);

  const handleSelect = () => {
      if (selectedIndex < filteredNav.length) {
          setTab(filteredNav[selectedIndex].tab);
      } else {
          // In a real router, this would navigate to ID. Here we just switch to Leads tab
          setTab(Tab.LEADS);
          // Ideally trigger a "selectLead" action in store, but simple tab switch works for now
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[20vh] p-4">
        <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-fade-in ring-1 ring-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Search className="text-slate-400" size={20} />
                <input 
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                    className="flex-1 text-lg outline-none placeholder:text-slate-400 text-slate-800 bg-transparent"
                    placeholder="Search leads, pages, or actions..."
                />
                <div className="flex gap-1">
                    <kbd className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-500 font-sans">ESC</kbd>
                </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
                {filteredNav.length > 0 && (
                    <div className="p-2">
                        <p className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
                        {filteredNav.map((item, idx) => (
                            <button
                                key={item.name}
                                onClick={() => { setTab(item.tab); onClose(); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${idx === selectedIndex ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                                <span className={idx === selectedIndex ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                                {item.name}
                            </button>
                        ))}
                    </div>
                )}
                
                {filteredLeads.length > 0 && (
                    <div className="p-2 border-t border-slate-50">
                        <p className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Leads</p>
                        {filteredLeads.map((lead, idx) => {
                            const globalIndex = filteredNav.length + idx;
                            return (
                                <button
                                    key={lead.id}
                                    onClick={() => { setTab(Tab.LEADS); onClose(); }} // Simple nav
                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors ${globalIndex === selectedIndex ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold">{lead.name}</span>
                                        <span className={`text-xs flex items-center gap-1 ${globalIndex === selectedIndex ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            <MapPin size={10} /> {lead.address}
                                        </span>
                                    </div>
                                    <div className={globalIndex === selectedIndex ? 'text-white' : 'text-slate-400'}><ArrowRight size={14}/></div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default CommandPalette;
