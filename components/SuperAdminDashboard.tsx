import React, { useState, useEffect } from 'react';
import { Company, User, SoftwareLead, Tab, AgentConfig } from '../types';
import { Building2, Users, TrendingUp, Key, ChevronLeft, Zap, Loader2, Save, Mic, Volume2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { createVoiceAgent, updateVoiceAgent, getAvailableVoices } from '../services/elevenLabsService';

// ... (Keep existing interface and component definition)

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  view, companies, users, onAddUser, onRemoveUser, currentUser, softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead
}) => {
  const { updateCompany, addToast } = useStore();
  
  // ... (Keep existing lead/user state)

  // Agent Config State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  // NEW: Voice List State
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string, category: string}[]>([]);

  // NEW: Load voices when entering Agent view
  useEffect(() => {
      if (view === Tab.ADMIN_AGENTS) {
          getAvailableVoices().then(setAvailableVoices);
      }
  }, [view]);

  // ... (Keep existing stats logic)

  // --- ACTIONS ---

  const selectCompanyForAgent = (company: Company) => {
      setSelectedCompanyId(company.id);
      // Initialize with existing config or default
      setAgentForm(company.agentConfig || {
        id: `ag-${company.id}`,
        elevenLabsAgentId: '',
        elevenLabsApiKey: '', 
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Default Rachel
        name: `${company.name} Assistant`,
        systemPrompt: "You are a helpful roofing receptionist. Ask for name, address, and damage type.",
        firstMessage: `Thanks for calling ${company.name}. How can I help you?`,
        isActive: false
      });
  };

  const handleAgentSave = async () => {
    if (selectedCompanyId && agentForm) {
      setIsProvisioning(true);

      // 1. If Agent ID exists, update it on ElevenLabs
      if (agentForm.elevenLabsAgentId) {
          const result = await updateVoiceAgent(agentForm.elevenLabsAgentId, {
              firstMessage: agentForm.firstMessage,
              systemPrompt: agentForm.systemPrompt,
              voiceId: agentForm.voiceId
          });

          if (!result.success) {
              addToast(`Update Failed: ${result.error}`, 'error');
              setIsProvisioning(false);
              return;
          }
      } 
      // 2. If no Agent ID, create it on ElevenLabs
      else {
          const result = await createVoiceAgent(
              agentForm.name,
              agentForm.firstMessage,
              agentForm.systemPrompt,
              agentForm.voiceId
          );

          if (result.error) {
              addToast(`Creation Failed: ${result.error}`, 'error');
              setIsProvisioning(false);
              return;
          }
          
          // Update local form with new ID
          agentForm.elevenLabsAgentId = result.agentId;
          agentForm.isActive = true;
          addToast("New Agent Created on ElevenLabs!", "success");
      }

      // 3. Save to Local DB
      updateCompany({ id: selectedCompanyId, agentConfig: agentForm });
      setIsProvisioning(false);
      addToast("Configuration saved.", "success");
    }
  };

  // ... (Keep render logic, but update the Agent Tab section below)

  return (
    <div className="space-y-6">
      {/* ... (Keep existing Header and other Tabs) ... */}

      {/* --- AI CONFIG TAB --- */}
      {view === Tab.ADMIN_AGENTS && (
          <div className="h-full">
            {!selectedCompanyId ? (
                // Company Selection List (Keep existing)
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Select Company to Configure Agent</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companies.map(company => (
                            <div 
                                key={company.id}
                                onClick={() => selectCompanyForAgent(company)}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                                        {company.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${company.agentConfig?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {company.agentConfig?.isActive ? 'Active' : 'Not Created'}
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{company.name}</h3>
                                <p className="text-xs text-slate-500 font-mono truncate">
                                    {company.agentConfig?.elevenLabsAgentId ? `ID: ${company.agentConfig.elevenLabsAgentId}` : 'No Agent Configured'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Configuration Form
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    {/* Header */}
                    <div className="lg:col-span-2 flex items-center gap-4 mb-2">
                         <button 
                            onClick={() => { setSelectedCompanyId(null); setAgentForm(null); }}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                         >
                            <ChevronLeft size={20}/>
                         </button>
                         <div>
                            <h2 className="text-xl font-bold text-slate-900">Configuring: {companies.find(c => c.id === selectedCompanyId)?.name}</h2>
                            <p className="text-xs text-slate-500">ElevenLabs Agent Configuration</p>
                         </div>
                    </div>

                    {/* Left Column: Voice & Identity */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <Mic size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Agent Identity</h3>
                                    <p className="text-xs text-slate-500">Voice and Name settings</p>
                                </div>
                            </div>
                            {agentForm && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Agent Name</label>
                                        <input 
                                            value={agentForm.name}
                                            onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            Voice Selection <Volume2 size={12}/>
                                        </label>
                                        <select 
                                            value={agentForm.voiceId}
                                            onChange={(e) => setAgentForm({...agentForm, voiceId: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        >
                                            {availableVoices.length > 0 ? (
                                                availableVoices.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                                                ))
                                            ) : (
                                                <option value={agentForm.voiceId}>Loading Voices...</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-500 font-mono break-all">
                                        ID: {agentForm.elevenLabsAgentId || 'Will be generated on save'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Prompt & Script */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">Behavior & Script</h3>
                                    <p className="text-xs text-slate-500">How the agent acts and greets.</p>
                                </div>
                                <button 
                                    onClick={handleAgentSave}
                                    disabled={isProvisioning}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
                                >
                                    {isProvisioning ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                                    {agentForm?.elevenLabsAgentId ? 'Update Agent' : 'Create Agent'}
                                </button>
                            </div>
                            {agentForm && (
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">First Message</label>
                                        <input 
                                            value={agentForm.firstMessage}
                                            onChange={(e) => setAgentForm({...agentForm, firstMessage: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">System Prompt</label>
                                        <textarea 
                                            value={agentForm.systemPrompt}
                                            onChange={(e) => setAgentForm({...agentForm, systemPrompt: e.target.value})}
                                            className="w-full flex-1 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono leading-relaxed resize-none bg-slate-50 min-h-[200px]" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
          </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;