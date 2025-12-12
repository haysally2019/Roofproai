
import React, { useState } from 'react';
import { Company, SubscriptionTier, User, UserRole, SoftwareLead, SoftwareLeadStatus, Tab, AgentConfig } from '../types';
import { Building2, Users, TrendingUp, MoreVertical, Plus, ShieldCheck, Search, CheckCircle, XCircle, Briefcase, Mail, Phone, Calendar, ArrowRight, DollarSign, Mic, Save, Key, ChevronLeft, Zap, Loader2, Play } from 'lucide-react';
import { useStore } from '../lib/store';

interface SuperAdminDashboardProps {
  view: Tab;
  companies: Company[];
  onAddCompany: (company: Company) => void;
  onUpdateStatus: (id: string, status: Company['status']) => void;
  users: User[];
  onAddUser: (user: Partial<User>) => void; // Used for adding internal SaaS reps
  onRemoveUser: (userId: string) => void;
  currentUser: User;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  view,
  companies, onAddCompany, onUpdateStatus, 
  users, onAddUser, onRemoveUser, currentUser,
  softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead
}) => {
  const { updateCompany, addToast } = useStore();
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // New Software Lead Form
  const [newLead, setNewLead] = useState<Partial<SoftwareLead>>({
    companyName: '', contactName: '', email: '', phone: '', status: 'Prospect'
  });

  // New SaaS Rep Form
  const [newRep, setNewRep] = useState({ name: '', email: '' });

  // Agent Config State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // --- STATS ---
  const totalRevenue = companies.reduce((acc, curr) => {
    const price = curr.tier === SubscriptionTier.ENTERPRISE ? 499 : curr.tier === SubscriptionTier.PROFESSIONAL ? 199 : 49;
    return acc + price;
  }, 0);

  const saasReps = users.filter(u => u.role === UserRole.SAAS_REP);
  const totalSoftwareLeads = softwareLeads.length;
  const closedDeals = softwareLeads.filter(l => l.status === 'Closed Won').length;

  // --- HANDLERS ---

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
  };

  const handleRepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newRep.email) return;
    onAddUser({
        name: newRep.name,
        email: newRep.email,
        role: UserRole.SAAS_REP,
        companyId: null // Super Admin context
    });
    setIsAddingUser(false);
    setNewRep({ name: '', email: '' });
  };

  const handleAgentSave = () => {
    if (selectedCompanyId && agentForm) {
      updateCompany({ id: selectedCompanyId, agentConfig: agentForm });
    }
  };

  const selectCompanyForAgent = (company: Company) => {
      setSelectedCompanyId(company.id);
      // Initialize form with existing config or default structure
      setAgentForm(company.agentConfig || {
        id: `ag-${company.id}`,
        elevenLabsAgentId: '',
        elevenLabsApiKey: '',
        voiceId: 'Sarah_Professional',
        name: `${company.name} Assistant`,
        systemPrompt: "You are a helpful roofing receptionist. Ask for name, address, and damage type.",
        firstMessage: `Thanks for calling ${company.name}. This is the automated assistant. How can I help you?`,
        isActive: false
      });
  };

  const handleAutoProvision = () => {
      if (!agentForm) return;
      setIsProvisioning(true);
      // Simulate API call to ElevenLabs
      setTimeout(() => {
          const mockAgentId = `E1_prov_${Math.random().toString(36).substring(7)}`;
          const mockKey = `sk_${Math.random().toString(36).substring(7)}`;
          
          setAgentForm(prev => prev ? ({
              ...prev,
              elevenLabsAgentId: mockAgentId,
              elevenLabsApiKey: prev.elevenLabsApiKey || mockKey,
              isActive: true
          }) : null);
          
          setIsProvisioning(false);
          addToast("Agent successfully created on ElevenLabs Platform", "success");
      }, 2000);
  };

  const getStatusBadge = (status: SoftwareLeadStatus) => {
      let color = 'bg-slate-100 text-slate-700 border-slate-200';
      if(status === 'Closed Won') color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
      if(status === 'Demo Booked') color = 'bg-blue-100 text-blue-700 border-blue-200';
      if(status === 'Lost') color = 'bg-red-50 text-red-600 border-red-200';
      if(status === 'Prospect') color = 'bg-slate-100 text-slate-600 border-slate-200';
      return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>{status}</span>
  };

  return (
    <div className="space-y-6">
      
      {/* Header for View */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{view === Tab.ADMIN_OVERVIEW ? 'Admin Dashboard' : view}</h1>
            <p className="text-slate-500 text-sm">
                {view === Tab.ADMIN_OVERVIEW && 'Welcome back, Super Admin. Here is your system performance.'}
                {view === Tab.ADMIN_LEADS && 'Manage your software sales pipeline.'}
                {view === Tab.ADMIN_TEAM && 'Manage your internal sales representatives.'}
                {view === Tab.ADMIN_TENANTS && 'Monitor active roofing company subscriptions.'}
                {view === Tab.ADMIN_AGENTS && 'Configure ElevenLabs Agents per company.'}
            </p>
        </div>
        {view === Tab.ADMIN_LEADS && (
             <button onClick={() => setIsAddingLead(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm font-medium shadow-sm shadow-indigo-200">
                <Plus size={16} /> New Lead
            </button>
        )}
        {view === Tab.ADMIN_TEAM && (
            <button onClick={() => setIsAddingUser(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm font-medium shadow-sm shadow-indigo-200">
                <Plus size={16} /> Hire Sales Rep
            </button>
        )}
      </div>

      {/* --- OVERVIEW TAB --- */}
      {view === Tab.ADMIN_OVERVIEW && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">MRR Revenue</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">${totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <DollarSign size={24} />
                  </div>
               </div>
               <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 w-fit px-2 py-1 rounded-full">
                  <TrendingUp size={12} /> +12.5% this month
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Software Leads</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{totalSoftwareLeads}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Briefcase size={24} />
                  </div>
               </div>
               <p className="text-xs text-slate-400 font-medium">Pipeline Value: ${(totalSoftwareLeads * 199).toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sales Reps</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{saasReps.length}</h3>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Users size={24} />
                  </div>
               </div>
               <p className="text-xs text-slate-400 font-medium">Avg 4 deals per rep</p>
            </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Tenants</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{companies.filter(c => c.status === 'Active').length}</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
               </div>
               <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 w-fit px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> System Healthy
               </div>
            </div>
         </div>
      )}

      {/* --- SAAS LEADS TAB --- */}
      {view === Tab.ADMIN_LEADS && (
         <div className="space-y-4">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                         <tr>
                             <th className="px-6 py-4">Company</th>
                             <th className="px-6 py-4">Contact</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4">Assigned To</th>
                             <th className="px-6 py-4">Date Added</th>
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
                                 <td className="px-6 py-4 text-slate-500 text-xs">{lead.createdAt}</td>
                                 <td className="px-6 py-4 text-right">
                                     {lead.status !== 'Closed Won' ? (
                                         <button 
                                            onClick={() => onUpdateSoftwareLead({...lead, status: 'Closed Won'})}
                                            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                                         >
                                             Close Deal
                                         </button>
                                     ) : (
                                        <span className="flex items-center justify-end gap-1 text-xs font-bold text-emerald-600">
                                            <CheckCircle size={14}/> Won
                                        </span>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 {softwareLeads.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No leads in the pipeline yet.</div>
                 )}
             </div>
         </div>
      )}

      {/* --- SALES TEAM TAB --- */}
      {view === Tab.ADMIN_TEAM && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {saasReps.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
                        <p>No sales representatives hired yet.</p>
                        <button onClick={() => setIsAddingUser(true)} className="text-indigo-600 font-bold hover:underline mt-2">Hire First Rep</button>
                    </div>
                 )}
                 {saasReps.map(rep => {
                     const leads = softwareLeads.filter(l => l.assignedTo === rep.id);
                     const closed = leads.filter(l => l.status === 'Closed Won').length;
                     const commission = closed * 500; // Mock commission calc

                     return (
                         <div key={rep.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg ring-4 ring-slate-50">
                                        {rep.avatarInitials}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{rep.name}</h3>
                                        <p className="text-xs text-slate-500">{rep.email}</p>
                                    </div>
                                 </div>
                                 <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Rep</span>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pipeline</p>
                                     <p className="text-lg font-bold text-slate-800">{leads.length} Leads</p>
                                 </div>
                                 <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                     <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide">Commission</p>
                                     <p className="text-lg font-bold text-emerald-700">${commission.toLocaleString()}</p>
                                 </div>
                             </div>

                             <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-slate-400 font-medium">Joined: Nov 2024</span>
                                <button onClick={() => onRemoveUser(rep.id)} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
                                    Remove
                                </button>
                             </div>
                         </div>
                     )
                 })}
          </div>
      )}

      {/* --- TENANTS TAB --- */}
      {view === Tab.ADMIN_TENANTS && (
         <div className="space-y-4">
            <div className="flex gap-4 mb-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search companies..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                 </div>
             </div>
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Plan Tier</th>
                    <th className="px-6 py-4">Users / Seats</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Renewal Date</th>
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${company.tier === 'Enterprise' ? 'bg-purple-100 text-purple-700 border-purple-200' : company.tier === 'Professional' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {company.tier}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                           <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-24 overflow-hidden">
                                 <div className="h-full bg-slate-400 rounded-full" style={{width: `${(company.userCount / company.maxUsers)*100}%`}}></div>
                              </div>
                              <span className="text-xs">{company.userCount}/{company.maxUsers}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 ${company.status === 'Active' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}`}>
                            {company.status === 'Active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {company.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{company.renewalDate}</td>
                        <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreVertical size={18} />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
         </div>
      )}

      {/* --- AI CONFIG TAB (Updated for Multi-Tenant) --- */}
      {view === Tab.ADMIN_AGENTS && (
          <div className="h-full">
            {!selectedCompanyId ? (
                // Company Selection List
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
                                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {company.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${company.agentConfig?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {company.agentConfig?.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{company.name}</h3>
                                <p className="text-xs text-slate-500 mb-4">{company.address || 'No location'}</p>
                                
                                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 font-mono truncate">
                                    Agent ID: {company.agentConfig?.elevenLabsAgentId || 'Not Configured'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Configuration Form for Selected Company
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Breadcrumb / Back Button */}
                    <div className="lg:col-span-2 flex items-center gap-4 mb-2">
                         <button 
                            onClick={() => { setSelectedCompanyId(null); setAgentForm(null); }}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                         >
                            <ChevronLeft size={20}/>
                         </button>
                         <div>
                            <h2 className="text-xl font-bold text-slate-900">Configuring: {companies.find(c => c.id === selectedCompanyId)?.name}</h2>
                            <p className="text-xs text-slate-500">ElevenLabs Agent Settings</p>
                         </div>
                    </div>

                    {/* API Credentials */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">ElevenLabs Integration</h3>
                                    <p className="text-xs text-slate-500">Manage API keys and Agent IDs.</p>
                                </div>
                            </div>
                            {agentForm && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">API Key</label>
                                        <input 
                                            type="password"
                                            value={agentForm.elevenLabsApiKey || ''}
                                            onChange={(e) => setAgentForm({...agentForm, elevenLabsApiKey: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                                            placeholder="sk_..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Agent ID</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={agentForm.elevenLabsAgentId}
                                                onChange={(e) => setAgentForm({...agentForm, elevenLabsAgentId: e.target.value})}
                                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                                                placeholder="Click 'Create Agent' to generate"
                                            />
                                            <button 
                                                onClick={handleAutoProvision}
                                                disabled={isProvisioning}
                                                className="whitespace-nowrap px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                                            >
                                                {isProvisioning ? <Loader2 className="animate-spin" size={14}/> : <Zap size={14}/>}
                                                {isProvisioning ? 'Creating...' : 'Create Agent'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <input 
                                            type="checkbox"
                                            id="agentActive"
                                            checked={agentForm.isActive}
                                            onChange={(e) => setAgentForm({...agentForm, isActive: e.target.checked})}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="agentActive" className="text-sm text-slate-700 font-medium">Activate Agent for this Company</label>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Mic size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Agent Persona</h3>
                                    <p className="text-xs text-slate-500">Configure the base personality.</p>
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Greeting Message</label>
                                        <textarea 
                                            value={agentForm.firstMessage}
                                            onChange={(e) => setAgentForm({...agentForm, firstMessage: e.target.value})}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">System Prompt</h3>
                                    <p className="text-xs text-slate-500">The core instructions for the AI.</p>
                                </div>
                                <button 
                                    onClick={handleAgentSave}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Save size={16} /> Save Config
                                </button>
                            </div>
                            {agentForm && (
                                <textarea 
                                    value={agentForm.systemPrompt}
                                    onChange={(e) => setAgentForm({...agentForm, systemPrompt: e.target.value})}
                                    className="w-full flex-1 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono leading-relaxed resize-none bg-slate-50" 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Add Lead Modal */}
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

      {/* Add SaaS Rep Modal */}
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
