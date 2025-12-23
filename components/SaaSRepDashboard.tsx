import React, { useState } from 'react';
import { Company, User, SoftwareLead, UserRole } from '../types';
import { Users, UserPlus, LogOut, TrendingUp, DollarSign, Building } from 'lucide-react';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import { useStore } from '../lib/store';

interface Props {
  companies: Company[];
  users: User[];
  currentUser: User;
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SaaSRepDashboard: React.FC<Props> = ({ 
  companies, users, currentUser, onAddCompany, softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead 
}) => {
  const { logout } = useStore();
  const [activeView, setActiveView] = useState<'pipeline' | 'clients'>('pipeline');

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0 shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-emerald-400 mb-1">
            <TrendingUp className="w-7 h-7" />
            <span className="font-extrabold text-xl tracking-tight">SALES</span>
          </div>
          <p className="text-slate-500 text-xs font-bold ml-10 uppercase tracking-widest">Portal</p>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2">
          <button 
            onClick={() => setActiveView('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeView === 'pipeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <UserPlus size={20} /> Pipeline
          </button>
          <button 
            onClick={() => setActiveView('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeView === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Building size={20} /> Active Accounts
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shadow-lg border-2 border-slate-800">
                    {currentUser.avatarInitials}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">SaaS Rep</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 rounded-lg transition-all text-sm font-bold border border-slate-700">
                <LogOut size={16} /> Sign Out
            </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden p-6 relative">
            {activeView === 'pipeline' ? (
                <SuperAdminLeads 
                    leads={softwareLeads}
                    users={users}
                    currentUser={currentUser}
                    onAddLead={onAddSoftwareLead}
                    onUpdateLead={onUpdateSoftwareLead}
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Active Tenant Accounts</h2>
                        <p className="text-slate-500">Manage companies you have onboarded.</p>
                    </div>
                    <div className="flex-1 overflow-auto p-6">
                        <SuperAdminTenants 
                            companies={companies} 
                            users={users}
                            onAddCompany={onAddCompany}
                            onClearInitialData={() => {}}
                        />
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default SaaSRepDashboard;