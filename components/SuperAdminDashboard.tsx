import React, { useState, useEffect } from 'react';
import { Company, SubscriptionTier, User, UserRole, SoftwareLead, SoftwareLeadStatus, Tab, AgentConfig } from '../types';
import { Building2, Users, TrendingUp, MoreVertical, Plus, Search, CheckCircle, XCircle, Briefcase, Mail, DollarSign, Mic, Save, Key, ChevronLeft, Zap, Loader2, Clock, Volume2, MessageSquare, Play, Settings } from 'lucide-react';
import { useStore } from '../lib/store';
import { createVoiceAgent, updateVoiceAgent, getAvailableVoices } from '../services/elevenLabsService';

interface SuperAdminDashboardProps {
  view: Tab;
  companies: Company[];
  onAddCompany: (company: Company) => void;
  onUpdateStatus: (id: string, status: Company['status']) => void;
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  currentUser: User;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  view,
  companies, 
  users, onAddUser, onRemoveUser, currentUser,
  softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead
}) => {
  const { updateCompany, addToast } = useStore();
  
  // --- STATE MANAGEMENT ---
  
  // Modals
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Forms
  const [newLead, setNewLead] = useState<Partial<SoftwareLead>>({ companyName: '', contactName: '', email: '', phone: '', status: 'Prospect' });
  const [newRep, setNewRep] = useState({ name: '', email: '' });
  const [newCompany, setNewCompany] = useState({ name: '', adminName: '', adminEmail: '', tier: SubscriptionTier.PROFESSIONAL });

  // AI Agent Config State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string, category: string}[]>([]);

  // Load Voices on Mount (if in Agent view)
  useEffect(() => {
      if (view === Tab.ADMIN_AGENTS) {
          getAvailableVoices().then(setAvailableVoices);
      }
  }, [view]);

  // --- STATS CALCULATION ---
  const totalRevenue = companies.reduce((acc, curr) => {
    const price = curr.tier === SubscriptionTier.ENTERPRISE ? 499 : curr.tier === SubscriptionTier.PROFESSIONAL ? 199 : 49;
    return acc + price;
  }, 0);
  const saasReps = users.filter(u => u.role === UserRole.SAAS_REP);
  const totalSoftwareLeads = softwareLeads.length;

  // --- HANDLERS ---

  // 1. SaaS Lead Management
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.companyName) return;
    onAddSoftwareLead({
      id: Date.now().toString(),
      companyName: newLead.companyName!,
      contactName: newLead.contactName || '',
      email: newLead.email || '',
      phone: newLead.phone || '',
      status: 'Prospect',
      potentialUsers: 5,
      assignedTo: currentUser.id,
      notes: '',
      createdAt: new Date().toISOString().split('T')[0]
    });
    setIsAddingLead(false);
    setNewLead({ companyName: '', contactName: '', email: '', phone: '' });
    addToast("New lead added to pipeline", "success");
  };

  // 2. Sales Rep Management
  const handleRepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newRep.email) return;
    onAddUser({
        name: newRep.name,
        email: newRep.email,
        role: UserRole.SAAS_REP,
        companyId: null
    });
    setIsAddingUser(false);
    setNewRep({ name: '', email: '' });
    addToast("Sales Rep added successfully", "success");
  };

  // 3. Tenant Onboarding (Company + Admin)
  const handleOnboardSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newCompany.name || !newCompany.adminEmail) return;

      const newCompanyId = Date.now().toString();
      
      // Create Company
      onAddCompany({
          id: newCompanyId,
          name: newCompany.name,
          tier: newCompany.tier,
          userCount: 1,
          maxUsers: newCompany.tier === 'Enterprise' ? 999 : newCompany.tier === 'Professional' ? 10 : 3,
          status: 'Active',
          renewalDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          setupComplete: false
      });

      // Create Admin User for Company
      onAddUser({
          name: newCompany.adminName,
          email: newCompany.adminEmail,
          role: UserRole.COMPANY_ADMIN,
          companyId: newCompanyId
      });

      setIsOnboarding(false);
      setNewCompany({ name: '', adminName: '', adminEmail: '', tier: SubscriptionTier.PROFESSIONAL });
      addToast(`${newCompany.name} onboarded successfully!`, "success");
  };

  // 4. AI Agent Configuration
  const selectCompanyForAgent = (company: Company) => {
      setSelectedCompanyId(company.id);
      // Initialize Agent Form (Load existing or Defaults)
      setAgentForm(company.agentConfig || {
        id: `ag-${company.id}`,
        elevenLabsAgentId: '',
        elevenLabsApiKey: '', 
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Default Voice
        name: `${company.name} Assistant`,
        systemPrompt: "You are a professional roofing receptionist. Collect Name, Address, and Damage Type. Be polite and concise.",
        firstMessage: `Thanks for calling ${company.name}. How can I help you today?`,
        isActive: false,
        businessHours: {
            enabled: false,
            start: "09:00", end: "17:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], timezone: "America/New_York"
        },
        workflows: [
            { id: 'wf-1', name: 'Missed Call Text', enabled: true, trigger: 'call_missed', action: 'sms_lead', template: "Sorry we missed you! We'll call back shortly." }
        ]
      });
  };

  const handleAgentSave = async () => {
    if (selectedCompanyId && agentForm) {
      setIsProvisioning(true);

      // A. Sync with ElevenLabs
      if (agentForm.elevenLabsAgentId) {
          // Update Existing
          const result = await updateVoiceAgent(agentForm.elevenLabsAgentId, {
              firstMessage: agentForm.firstMessage,
              systemPrompt: agentForm.systemPrompt,
              voiceId: agentForm.voiceId
          });
          if (!result.success) {
              addToast(`Cloud Sync Failed: ${result.error}`, 'error');
              setIsProvisioning(false);
              return;
          }
      } else {
          // Create New
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
          addToast("Agent Created on ElevenLabs!", "success");
      }

      // B. Save to Database
      updateCompany({ id: selectedCompanyId, agentConfig: agentForm });
      
      setIsProvisioning(false);
      addToast("Configuration saved locally.", "success");
    }
  };

  // --- RENDER HELPERS ---
  const getStatusBadge = (status: SoftwareLeadStatus) => {
      const colors = {
          'Closed Won': 'bg-emerald-100 text-emerald-700 border-emerald-200',
          'Demo Booked': 'bg-blue-100 text-blue-700 border-blue-200',
          'Lost': 'bg-red-50 text-red-600 border-red-200',
          'Prospect': 'bg-slate-100 text-slate-600 border-slate-200',
          'Contacted': 'bg-amber-50 text-amber-700 border-amber-200',
          'Trial': 'bg-purple-50 text-purple-700 border-purple-200'
      };
      return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || colors['Prospect']}`}>{status}</span>
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/60 sticky top-0 bg-slate-50 z-10 pt-2">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{view === Tab.ADMIN_OVERVIEW ? 'Super Admin Dashboard' : view}</h1>
            <p className="text-slate-500 text-sm">
                {view === Tab.ADMIN_OVERVIEW && 'System Overview & Financials'}
                {view === Tab.ADMIN_LEADS && 'Software Sales Pipeline'}
                {view === Tab.ADMIN_TEAM && 'Internal Sales Representatives'}
                {view === Tab.ADMIN_TENANTS && 'Client Management'}
                {view === Tab.ADMIN_AGENTS && 'AI Voice Agent Configuration'}
            </p>
        </div>
        {view === Tab.ADMIN_LEADS && (
             <button onClick={() => setIsAddingLead(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm font-medium shadow-sm">
                <Plus size={16} /> New Prospect
            </button>
        )}
        {view === Tab.ADMIN_TEAM && (
            <button onClick={() => setIsAddingUser(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm font-medium shadow-sm">
                <Plus size={16} /> Hire Rep
            </button>
        )}
        {view === Tab.ADMIN_TENANTS && (
            <button onClick={() => setIsOnboarding(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 text-sm font-medium shadow-sm">
                <Plus size={16} /> Onboard Company
            </button>
        )}
      </div>

      {/* --- 1. OVERVIEW TAB --- */}
      {view === Tab.ADMIN_OVERVIEW && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">MRR Revenue</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">${totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24} /></div>
               </div>
               <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><TrendingUp size={12} /> +12.5% this month</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Active Pipeline</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{totalSoftwareLeads}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={24} /></div>
               </div>
               <p className="text-xs text-slate-400 font-medium">Value: ${(totalSoftwareLeads * 199).toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Active Tenants</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{companies.filter(c => c.status === 'Active').length}</h3>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={24} /></div>
               </div>
               <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle size={12} /> System Healthy</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">AI Agents Live</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{companies.filter(c => c.agentConfig?.isActive).length}</h3>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Mic size={24} /></div>
               </div>
               <p className="text-xs text-slate-400 font-medium">Processing calls...</p>
            </div>
         </div>
      )}

      {/* --- 2. LEADS TAB --- */}
      {view === Tab.ADMIN_LEADS && (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                     <tr>
                         <th className="px-6 py-4">Company</th>
                         <th className="px-6 py-4">Contact</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Assigned To</th>
                         <th className="px-6 py-4 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {softwareLeads.map(lead => (
                         <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4">
                                 <div className="font-bold text-slate-800">{lead.companyName}</div>
                                 <div className="text-xs text-slate-500">{lead.potentialUsers} Users Potential</div>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="font-medium text-slate-700">{lead.contactName}</div>
                                 <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10}/> {lead.email}</div>
                             </td>
                             <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                             <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-300">
                                         {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                     </div>
                                     <span className="text-slate-600 font-medium text-xs">{users.find(u => u.id === lead.assignedTo)?.name || 'Unassigned'}</span>
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <button onClick={() => onUpdateSoftwareLead({...lead, status: 'Closed Won'})} className="text-xs text-indigo-600 font-bold hover:underline">Manage</button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      )}

      {/* --- 3. TEAM TAB --- */}
      {view === Tab.ADMIN_TEAM && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                 {saasReps.map(rep => (
                     <div key={rep.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                                {rep.avatarInitials}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{rep.name}</h3>
                                <p className="text-xs text-slate-500">{rep.email}</p>
                            </div>
                         </div>
                         <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <span className="text-xs text-slate-400">Role: {rep.role}</span>
                            <button onClick={() => onRemoveUser(rep.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                         </div>
                     </div>
                 ))}
          </div>
      )}

      {/* --- 4. TENANTS TAB (Onboarding) --- */}
      {view === Tab.ADMIN_TENANTS && (
         <div className="space-y-4 animate-fade-in">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Tier</th>
                    <th className="px-6 py-4">Users</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Settings</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {company.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            {company.name}
                            <div className="text-xs text-slate-400 font-normal">{company.address || 'No address'}</div>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${company.tier === 'Enterprise' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                            {company.tier}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{company.userCount}/{company.maxUsers}</td>
                        <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 ${company.status === 'Active' ? 'text-emerald-600' : 'text-red-600'} font-medium text-xs`}>
                            {company.status === 'Active' ? <CheckCircle size={14} /> : <XCircle size={14} />} {company.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors"><Settings size={18} /></button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
         </div>
      )}

      {/* --- 5. AI AGENT CONFIGURATION (The Core Feature) --- */}
      {view === Tab.ADMIN_AGENTS && (
          <div className="h-full">
            {!selectedCompanyId ? (
                // Company List
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                    {companies.map(company => (
                        <div 
                            key={company.id}
                            onClick={() => selectCompanyForAgent(company)}
                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    {company.name.substring(0,2).toUpperCase()}
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${company.agentConfig?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {company.agentConfig?.isActive ? 'Active' : 'Setup Needed'}
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{company.name}</h3>
                            <p className="text-xs text-slate-500 font-mono truncate">
                                {company.agentConfig?.elevenLabsAgentId ? `ID: ${company.agentConfig.elevenLabsAgentId}` : 'No Agent ID'}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                // Detailed Configuration Editor
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Header Row */}
                    <div className="lg:col-span-2 flex items-center gap-4 mb-2">
                         <button onClick={() => { setSelectedCompanyId(null); setAgentForm(null); }} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                            <ChevronLeft size={20}/>
                         </button>
                         <div>
                            <h2 className="text-xl font-bold text-slate-900">Configuring: {companies.find(c => c.id === selectedCompanyId)?.name}</h2>
                            <p className="text-xs text-slate-500">Full Agent Control</p>
                         </div>
                    </div>

                    {/* Column 1: Voice, Hours, Connection */}
                    <div className="space-y-6">
                        
                        {/* Voice Selection */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Volume2 size={18}/> Voice & Persona</h3>
                            {agentForm && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Agent Name</label>
                                        <input value={agentForm.name} onChange={(e) => setAgentForm({...agentForm, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Voice</label>
                                        <select 
                                            value={agentForm.voiceId}
                                            onChange={(e) => setAgentForm({...agentForm, voiceId: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        >
                                            {availableVoices.length > 0 ? (
                                                availableVoices.map(v => <option key={v.id} value={v.id}>{v.name} ({v.category})</option>)
                                            ) : <option value={agentForm.voiceId}>Loading voices...</option>}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button className="text-xs flex items-center gap-1 text-indigo-600 font-bold"><Play size={10}/> Preview Voice</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> Business Hours</h3>
                            {agentForm && agentForm.businessHours && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500">Start</label>
                                            <input type="time" value={agentForm.businessHours.start} onChange={(e) => setAgentForm({...agentForm, businessHours: {...agentForm.businessHours!, start: e.target.value}})} className="w-full p-2 border border-slate-200 rounded"/>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500">End</label>
                                            <input type="time" value={agentForm.businessHours.end} onChange={(e) => setAgentForm({...agentForm, businessHours: {...agentForm.businessHours!, end: e.target.value}})} className="w-full p-2 border border-slate-200 rounded"/>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={agentForm.businessHours.enabled} onChange={(e) => setAgentForm({...agentForm, businessHours: {...agentForm.businessHours!, enabled: e.target.checked}})} className="rounded text-indigo-600"/>
                                        <span className="text-sm font-medium text-slate-700">Only answer calls during these hours</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Prompt, Workflows, Save */}
                    <div className="space-y-6">
                        
                        {/* Prompt Editor */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={18}/> Scripting</h3>
                            {agentForm && (
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Greeting</label>
                                        <textarea value={agentForm.firstMessage} onChange={(e) => setAgentForm({...agentForm, firstMessage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm min-h-[60px]"/>
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">System Instructions</label>
                                        <textarea value={agentForm.systemPrompt} onChange={(e) => setAgentForm({...agentForm, systemPrompt: e.target.value})} className="w-full flex-1 p-3 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50 min-h-[250px]"/>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <button 
                            onClick={handleAgentSave}
                            disabled={isProvisioning}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70"
                        >
                            {isProvisioning ? <Loader2 className="animate-spin" size={20}/> : <Zap size={20} />}
                            {agentForm?.elevenLabsAgentId ? 'Sync Updates to Cloud' : 'Provision New Agent'}
                        </button>
                    </div>
                </div>
            )}
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Onboarding Modal */}
      {isOnboarding && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-fade-in">
                  <h3 className="text-lg font-bold mb-4 text-slate-800">Onboard New Roofing Company</h3>
                  <form onSubmit={handleOnboardSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                          <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Name</label>
                              <input required value={newCompany.adminName} onChange={e => setNewCompany({...newCompany, adminName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg"/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email</label>
                              <input required type="email" value={newCompany.adminEmail} onChange={e => setNewCompany({...newCompany, adminEmail: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subscription Tier</label>
                          <select value={newCompany.tier} onChange={e => setNewCompany({...newCompany, tier: e.target.value as SubscriptionTier})} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                              <option value={SubscriptionTier.STARTER}>Starter ($49/mo)</option>
                              <option value={SubscriptionTier.PROFESSIONAL}>Professional ($199/mo)</option>
                              <option value={SubscriptionTier.ENTERPRISE}>Enterprise ($499/mo)</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={() => setIsOnboarding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Create Account</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add SaaS Lead Modal (Restored) */}
      {isAddingLead && (
         <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-fade-in">
               <h3 className="text-lg font-bold mb-4 text-slate-800">New Software Prospect</h3>
               <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Company Name</label>
                     <input required autoFocus value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Roof Masters LLC" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Contact Person</label>
                     <input value={newLead.contactName} onChange={e => setNewLead({...newLead, contactName: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Owner Name" />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                     <button type="button" onClick={() => setIsAddingLead(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm shadow-indigo-200">Add Prospect</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Hire Rep Modal (Restored) */}
      {isAddingUser && (
         <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-fade-in">
               <h3 className="text-lg font-bold mb-4 text-slate-800">Hire Sales Rep</h3>
               <form onSubmit={handleRepSubmit} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                     <input required autoFocus value={newRep.name} onChange={e => setNewRep({...newRep, name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Alex Closer" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                     <input required type="email" value={newRep.email} onChange={e => setNewRep({...newRep, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="alex@roofpro.app" />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                     <button type="button" onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm shadow-indigo-200">Send Offer</button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default SuperAdminDashboard;