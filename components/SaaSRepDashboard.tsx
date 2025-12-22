import React, { useState } from 'react';
import { Company, User, UserRole, SoftwareLead } from '../types';
import { LayoutDashboard, Users, UserPlus, LogOut, Settings } from 'lucide-react';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import { useStore } from '../lib/store';

// Define Sales-Specific Tabs
enum SalesTab {
  OVERVIEW = 'overview',
  LEADS = 'leads',
  ACCOUNTS = 'accounts'
}

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
  companies, 
  users, 
  currentUser,
  onAddCompany,
  softwareLeads, 
  onAddSoftwareLead, 
  onUpdateSoftwareLead 
}) => {
  const { logout } = useStore();
  const [activeTab, setActiveTab] = useState<SalesTab>(SalesTab.LEADS);

  // Filter companies to only show those "referred" or managed by this rep?
  // For now, we show all, but we disable "Delete" buttons in the Tenants view via props if we wanted to go deeper.
  // A simple approach is just letting them see all tenants but focusing on LEADS.

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* --- SALES SIDEBAR --- */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-1">
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-extrabold text-lg tracking-tight">SALES PORTAL</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-bold ml-9">Rafter AI</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase mt-4 mb-2">My Workspace</p>
          
          <button 
            onClick={() => setActiveTab(SalesTab.LEADS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.LEADS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <UserPlus size={20} />
            <span className="font-bold">Software Leads</span>
          </button>

          <button 
            onClick={() => setActiveTab(SalesTab.ACCOUNTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.ACCOUNTS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-bold">Active Accounts</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center font-bold border border-emerald-700">
                    {currentUser.avatarInitials}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 truncate">Sales Representative</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-sm font-bold">
                <LogOut size={16} /> Sign Out
            </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-auto bg-[#F8FAFC] relative">
        <div className="max-w-7xl mx-auto p-8">
            {activeTab === SalesTab.LEADS && (
                <SuperAdminLeads 
                    leads={softwareLeads}
                    users={users} // Pass all users so they can assign leads if needed
                    currentUser={currentUser}
                    onAddLead={onAddSoftwareLead}
                    onUpdateLead={onUpdateSoftwareLead}
                />
            )}

            {activeTab === SalesTab.ACCOUNTS && (
                <SuperAdminTenants 
                    companies={companies}
                    users={users}
                    onAddCompany={onAddCompany}
                    onClearInitialData={() => {}}
                    // Note: SuperAdminTenants might allow deletion. 
                    // Ideally, we'd pass a "readOnly" prop to it, but for now this gives them view access.
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default SaaSRepDashboard;