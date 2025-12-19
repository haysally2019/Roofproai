import React from 'react';
import { Company, User, SoftwareLead, SubscriptionTier } from '../../types';
import { TrendingUp, Users, Building2, DollarSign, Activity } from 'lucide-react';

interface Props {
  companies: Company[];
  users: User[];
  leads: SoftwareLead[];
}

const SuperAdminOverview: React.FC<Props> = ({ companies, users, leads }) => {
  const totalARR = companies.reduce((acc, c) => {
      const price = c.tier === SubscriptionTier.ENTERPRISE ? 499 : c.tier === SubscriptionTier.PROFESSIONAL ? 199 : 99;
      return acc + (price * 12);
  }, 0);

  const activeCompanies = companies.filter(c => c.status === 'Active').length;
  const conversionRate = leads.length > 0 
      ? Math.round((leads.filter(l => l.status === 'Closed Won').length / leads.length) * 100) 
      : 0;

  const cards = [
    { label: 'Total ARR', value: `$${totalARR.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Companies', value: activeCompanies, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Lead Conversion', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Platform Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-slate-400"/> Recent Onboarding
            </h3>
            <div className="space-y-4">
                {companies.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded text-indigo-700 flex items-center justify-center font-bold">
                                {c.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{c.name}</div>
                                <div className="text-xs text-slate-500">{c.tier} Plan</div>
                            </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.status}
                        </span>
                    </div>
                ))}
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-400"/> Recent SaaS Leads
            </h3>
             <div className="space-y-4">
                {leads.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                        <div>
                            <div className="font-bold text-slate-900">{l.companyName}</div>
                            <div className="text-xs text-slate-500">{l.contactName} • {l.phone}</div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{l.status}</span>
                    </div>
                ))}
                {leads.length === 0 && <p className="text-slate-400 italic text-sm">No leads generated yet.</p>}
            </div>
         </div>
      </div>
    </div>
  );
};
export default SuperAdminOverview;