import React, { useState, useEffect } from 'react';
import { Company, User, SoftwareLead } from '../types';
import { UserPlus, LogOut, TrendingUp, Building, Copy, Check, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

interface Props {
  companies: Company[];
  users: User[];
  currentUser: User;
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
  onDeleteSoftwareLead?: (id: string) => void;
}

const SaaSRepDashboard: React.FC<Props> = ({ 
  companies, users, currentUser, onAddCompany, softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead, onDeleteSoftwareLead 
}) => {
  const { logout } = useStore();
  const [activeView, setActiveView] = useState<'pipeline' | 'clients'>('pipeline');
  
  // --- REFERRAL & PAYOUT STATE ---
  const [copied, setCopied] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const referralLink = `${window.location.origin}/register?ref=${currentUser.id}`;
  const stripeConnected = !!currentUser.stripe_connect_id; // In production, verify this field exists on User type

  useEffect(() => {
     const fetchEarnings = async () => {
        const { data } = await supabase
           .from('commissions')
           .select('amount_cents')
           .eq('rep_user_id', currentUser.id);
        
        if (data) {
            const total = data.reduce((acc, curr) => acc + curr.amount_cents, 0);
            setEarnings(total / 100);
        }
     };
     fetchEarnings();
  }, [currentUser.id]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectStripe = async () => {
      // In production, call your backend to get a Stripe Connect OAuth link
      alert("In production, this redirects to Stripe Connect Onboarding.");
  };

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

        {/* PAYOUT WIDGET */}
        <div className="px-4 mb-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="text-emerald-400" size={20}/>
                    <span className="text-slate-300 font-bold text-sm">Commissions</span>
                </div>
                <p className="text-2xl font-bold text-white mb-3">${earnings.toFixed(2)}</p>
                
                {!stripeConnected ? (
                    <button 
                        onClick={handleConnectStripe}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <AlertCircle size={12}/> Setup Payouts
                    </button>
                ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle size={12}/> Payouts Active
                    </div>
                )}
            </div>
        </div>

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
            
            {/* REFERRAL LINK CARD */}
            <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-white">Your Personal Sales Link</h3>
                    <p className="text-indigo-200 text-sm">Share this URL. Companies that sign up are automatically attributed to you.</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-950/50 p-1.5 pl-4 rounded-lg border border-indigo-700/50 w-full md:w-auto max-w-md">
                    <code className="text-xs text-indigo-300 truncate font-mono flex-1 select-all">
                    {referralLink}
                    </code>
                    <button 
                    onClick={copyToClipboard}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                    {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>

            {activeView === 'pipeline' ? (
                <SuperAdminLeads 
                    leads={softwareLeads}
                    users={users}
                    currentUser={currentUser}
                    onAddLead={onAddSoftwareLead}
                    onUpdateLead={onUpdateSoftwareLead}
                    onDeleteLead={onDeleteSoftwareLead}
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