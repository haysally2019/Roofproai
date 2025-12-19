import React, { useState, useEffect } from 'react';
import { Company, User, SoftwareLead, Tab, AgentConfig, SubscriptionTier } from '../types';
import { Building2, Users, TrendingUp, Key, ChevronLeft, Zap, Loader2, Save, Mic, Volume2, Plus, Clock, Globe } from 'lucide-react';
import { useStore } from '../lib/store';
import { createVoiceAgent, updateVoiceAgent, getAvailableVoices } from '../services/elevenLabsService';

interface SuperAdminDashboardProps {
  view: Tab;
  companies: Company[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  onUpdateStatus: (id: string, status: 'Active' | 'Suspended') => void;
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  currentUser: User;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  view, companies, onAddCompany, users, onAddUser, onRemoveUser
}) => {
  const { updateCompany, addToast } = useStore();
  
  // Agent Config State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string, category: string}[]>([]);

  // Company Onboarding State
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ name: '', address: '', phone: '', tier: 'Starter' });

  useEffect(() => {
      // Load voices whenever we enter Agent Config
      if (view === Tab.ADMIN_AGENTS || selectedCompanyId) {
          getAvailableVoices().then(setAvailableVoices);
      }
  }, [view, selectedCompanyId]);

  // --- ACTIONS ---

  const handleCreateCompany = async () => {
    if (!newCompanyForm.name) return;
    const newId = await onAddCompany(newCompanyForm);
    if (newId) {
      setShowAddCompany(false);
      setNewCompanyForm({ name: '', address: '', phone: '', tier: 'Starter' });
      // Automatically switch to Agent setup for this company
      const newCompany = companies.find(c => c.id === newId) || { id: newId, name: newCompanyForm.name } as Company;
      selectCompanyForAgent(newCompany);
    }
  };

  const selectCompanyForAgent = (company: Company) => {
      setSelectedCompanyId(company.id);
      // Initialize with existing config or default
      setAgentForm(company.agentConfig || {
        id: `ag-${company.id}`,
        elevenLabsAgentId: '',
        elevenLabsApiKey: '', 
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Default Rachel
        name: `${company.name} Assistant`,
        systemPrompt: `You are the AI Receptionist for ${company.name}, a roofing company.\nYour goal is to collect the caller's Name, Address, and basic details about their roof damage.\nBe polite, professional, and concise.`,
        firstMessage: `Thanks for calling ${company.name}. How can I help you today?`,
        isActive: false,
        businessHours: {
          enabled: true,
          start: "09:00",
          end: "17:00",
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          timezone: "America/New_York"
        }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Super Admin Console</h1>
              <p className="text-slate-500 font-medium">Platform Management & Onboarding Hub</p>
          </div>
          {view === Tab.ADMIN_TENANTS && (
             <button 
                onClick={() => setShowAddCompany(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800"
             >
                <Plus size={18} /> Onboard Company
             </button>
          )}
      </div>

      {/* --- TENANTS / ONBOARDING TAB --- */}
      {view === Tab.ADMIN_TENANTS && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map(company => (
                  <div key={company.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">
                              {company.name.substring(0,2).toUpperCase()}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {company.status}
                          </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{company.name}</h3>
                      <p className="text-sm text-slate-500 mb-4">{company.address || 'No address configured'}</p>
                      
                      <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><Users size={14}/> {company.userCount}/{company.maxUsers} Users</span>
                              <span className="flex items-center gap-1"><Zap size={14}/> {company.tier}</span>
                          </div>
                          <button 
                             onClick={() => selectCompanyForAgent(company)}
                             className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 flex items-center justify-center gap-2"
                          >
                             <Zap size={16}/> Configure AI
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- ADD COMPANY MODAL --- */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-lg">Onboard New Tenant</h3>
                   <button onClick={() => setShowAddCompany(false)} className="text-slate-400 hover:text-slate-600"><Key size={20}/></button>
               </div>
               <div className="p-6 space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Company Name</label>
                       <input 
                          value={newCompanyForm.name} 
                          onChange={e => setNewCompanyForm({...newCompanyForm, name: e.target.value})}
                          className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                          placeholder="e.g. Summit Roofing"
                          autoFocus
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                       <input 
                          value={newCompanyForm.address} 
                          onChange={e => setNewCompanyForm({...newCompanyForm, address: e.target.value})}
                          className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                          placeholder="e.g. 123 Main St, Denver, CO"
                       />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                           <input 
                              value={newCompanyForm.phone} 
                              onChange={e => setNewCompanyForm({...newCompanyForm, phone: e.target.value})}
                              className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                              placeholder="(555) 123-4567"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Plan Tier</label>
                           <select 
                              value={newCompanyForm.tier} 
                              onChange={e => setNewCompanyForm({...newCompanyForm, tier: e.target.value})}
                              className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
                           >
                              <option value="Starter">Starter</option>
                              <option value="Professional">Professional</option>
                              <option value="Enterprise">Enterprise</option>
                           </select>
                        </div>
                   </div>
               </div>
               <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                   <button onClick={() => setShowAddCompany(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                   <button 
                      onClick={handleCreateCompany}
                      disabled={!newCompanyForm.name}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                   >
                      Create & Setup AI
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* --- AI CONFIGURATION TAB (Always visible if company selected) --- */}
      {(view === Tab.ADMIN_AGENTS || selectedCompanyId) && (
          <div className="h-full">
            {!selectedCompanyId ? (
                // Company Selection List
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Select Company to Configure</h2>
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
                                <p className="text-xs text-slate-500">ID: {company.id}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- FULL CONFIGURATION FORM ---
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
                    {/* Header */}
                    <div className="xl:col-span-3 flex items-center justify-between mb-2">
                         <div className="flex items-center gap-4">
                            <button 
                                onClick={() => { setSelectedCompanyId(null); setAgentForm(null); }}
                                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Configuring: {companies.find(c => c.id === selectedCompanyId)?.name}</h2>
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    {agentForm?.elevenLabsAgentId ? <span className="text-emerald-600 flex items-center gap-1"><Zap size={12}/> Live on ElevenLabs</span> : <span className="text-amber-600 flex items-center gap-1"><Clock size={12}/> Local Draft</span>}
                                </p>
                            </div>
                         </div>
                         <button 
                             onClick={handleAgentSave}
                             disabled={isProvisioning}
                             className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
                         >
                             {isProvisioning ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                             {agentForm?.elevenLabsAgentId ? 'Update Live Agent' : 'Provision Agent'}
                         </button>
                    </div>

                    {/* Left Column: Identity & Voice */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                    <Mic size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Voice Identity</h3>
                                    <p className="text-xs text-slate-500">Public facing persona</p>
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
                                            Voice Model <Volume2 size={12}/>
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
                                                <option value={agentForm.voiceId}>Default (Rachel)</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Availability</h3>
                                    <p className="text-xs text-slate-500">When the AI answers</p>
                                </div>
                            </div>
                            {agentForm?.businessHours && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox"
                                            checked={agentForm.businessHours.enabled}
                                            onChange={(e) => setAgentForm({
                                                ...agentForm, 
                                                businessHours: {...agentForm.businessHours!, enabled: e.target.checked}
                                            })}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Enable Business Hours</span>
                                    </div>
                                    <div className={`grid grid-cols-2 gap-2 ${!agentForm.businessHours.enabled && 'opacity-50 pointer-events-none'}`}>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Open</label>
                                            <input 
                                                type="time" 
                                                value={agentForm.businessHours.start}
                                                onChange={(e) => setAgentForm({
                                                    ...agentForm, 
                                                    businessHours: {...agentForm.businessHours!, start: e.target.value}
                                                })}
                                                className="w-full p-2 border border-slate-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Close</label>
                                            <input 
                                                type="time" 
                                                value={agentForm.businessHours.end}
                                                onChange={(e) => setAgentForm({
                                                    ...agentForm, 
                                                    businessHours: {...agentForm.businessHours!, end: e.target.value}
                                                })}
                                                className="w-full p-2 border border-slate-300 rounded"
                                            />
                                        </div>
                                    </div>
                                    <div className={!agentForm.businessHours.enabled ? 'opacity-50' : ''}>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">Timezone</label>
                                        <div className="flex items-center gap-2 border border-slate-300 rounded p-2 bg-slate-50">
                                            <Globe size={14} className="text-slate-400"/>
                                            <span className="text-sm text-slate-700">{agentForm.businessHours.timezone}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle & Right: Prompt Engineering */}
                    <div className="xl:col-span-2 flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">Behavior & Script</h3>
                                    <p className="text-xs text-slate-500">Core personality and instructions.</p>
                                </div>
                            </div>
                            {agentForm && (
                                <div className="space-y-4 flex-1 flex flex-col">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">First Message (Greeting)</label>
                                        <input 
                                            value={agentForm.firstMessage}
                                            onChange={(e) => setAgentForm({...agentForm, firstMessage: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">System Prompt</label>
                                        <textarea 
                                            value={agentForm.systemPrompt}
                                            onChange={(e) => setAgentForm({...agentForm, systemPrompt: e.target.value})}
                                            className="w-full flex-1 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono leading-relaxed resize-none bg-slate-50 min-h-[300px]" 
                                        />
                                        <p className="text-xs text-slate-400 mt-2 text-right">
                                            Tip: Include instructions to ask for Name, Address, and Damage Type.
                                        </p>
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