import React, { useState } from 'react';
import { Company, User, SoftwareLead, UserRole } from '../types';
import { LayoutDashboard, Users, UserPlus, LogOut, TrendingUp, DollarSign, Building } from 'lucide-react';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import { useStore } from '../lib/store';

// Sales Reps can see Tenants but shouldn't delete them. 
// We reuse SuperAdminTenants but we'll need to make sure it handles read-only or we can just show a simpler list here.
import SuperAdminTenants from './super-admin/SuperAdminTenants'; 

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

  // Metrics
  const myLeads = softwareLeads.filter(l => l.assignedTo === currentUser.id);
  const myDeals = myLeads.filter(l => l.status === 'Closed Won').length;
  const potentialRevenue = myLeads.reduce((acc, curr) => acc + (curr.potentialUsers * 99), 0); // $99/seat avg

  return (
    <div className="flex h-screen bg-slate-50">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-emerald-400 mb-1">
            <TrendingUp className="w-6 h-6" />
            <span className="font-extrabold text-lg tracking-tight">SALES PORTAL</span>
          </div>
          <p className="text-slate-500 text-xs font-bold ml-9">Rafter AI SaaS</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveView('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeView === 'pipeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <UserPlus size={20} /> Pipeline
          </button>
          <button 
            onClick={() => setActiveView('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeView === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Building size={20} /> My Clients
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">
                    {currentUser.avatarInitials}
                </div>
                <div>
                    <p className="text-sm font-bold text-white">{currentUser.name}</p>
                    <p className="text-xs text-emerald-400">SaaS Representative</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-red-600/20 rounded-lg transition-colors text-sm font-bold">
                <LogOut size={16} /> Sign Out
            </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP METRICS BAR */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
            <h1 className="text-xl font-bold text-slate-800">
                {activeView === 'pipeline' ? 'Sales Pipeline' : 'Active Client List'}
            </h1>
            <div className="flex gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase">My Closed Deals</span>
                    <span className="text-lg font-extrabold text-slate-900">{myDeals}</span>
                </div>
                <div className="h-10 w-px bg-slate-100"></div>
                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase">Pipeline Value</span>
                    <span className="text-lg font-extrabold text-emerald-600 flex items-center">
                        <DollarSign size={16} strokeWidth={3} />{potentialRevenue.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
            {activeView === 'pipeline' ? (
                <SuperAdminLeads 
                    leads={softwareLeads} // Filtering is handled inside the component based on currentUser
                    users={users}
                    currentUser={currentUser}
                    onAddLead={onAddSoftwareLead}
                    onUpdateLead={onUpdateSoftwareLead}
                />
            ) : (
                <SuperAdminTenants 
                    companies={companies} // In real app, filter this to companies sold by this rep
                    users={users}
                    onAddCompany={onAddCompany}
                    onClearInitialData={() => {}}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default SaaSRepDashboard;