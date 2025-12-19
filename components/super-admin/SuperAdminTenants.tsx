import React, { useState } from 'react';
import { Company } from '../../types';
import { Plus, Users, Zap } from 'lucide-react';

interface Props {
  companies: Company[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
}

const SuperAdminTenants: React.FC<Props> = ({ companies, onAddCompany }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', tier: 'Starter' });

  const handleCreate = async () => {
      await onAddCompany(form);
      setShowModal(false);
      setForm({ name: '', address: '', phone: '', tier: 'Starter' });
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900">Tenants</h1>
            <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800"><Plus size={18}/> Onboard Company</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map(company => (
                <div key={company.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">
                            {company.name.substring(0,2).toUpperCase()}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{company.status}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{company.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{company.address || 'No address'}</p>
                    <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Users size={14}/> {company.userCount}/{company.maxUsers}</span>
                            <span className="flex items-center gap-1"><Zap size={14}/> {company.tier}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                    <h3 className="font-bold text-lg mb-4">Onboard New Tenant</h3>
                    <div className="space-y-4">
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Company Name" className="w-full p-2.5 border rounded-lg"/>
                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" className="w-full p-2.5 border rounded-lg"/>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" className="w-full p-2.5 border rounded-lg"/>
                            <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white">
                                <option value="Starter">Starter</option>
                                <option value="Professional">Professional</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                        <button onClick={handleCreate} disabled={!form.name} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Create</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTenants;