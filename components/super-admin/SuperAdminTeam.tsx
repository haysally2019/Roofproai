import React, { useState, useEffect } from 'react';
import { Company, User } from '../../types';
import { Plus, Users, Zap, Search, Mail, User as UserIcon, X } from 'lucide-react';

interface Props {
  companies: Company[];
  users: User[]; // Pass all users to filter by company
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  initialData?: Partial<Company> | null;
  onClearInitialData: () => void;
}

const SuperAdminTenants: React.FC<Props> = ({ companies, users, onAddCompany, initialData, onClearInitialData }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null); // For viewing users
  const [form, setForm] = useState({ name: '', address: '', phone: '', tier: 'Starter' });
  const [searchQuery, setSearchQuery] = useState('');

  // Handle auto-open if converting lead
  useEffect(() => {
      if (initialData) {
          setForm(prev => ({ ...prev, ...initialData, tier: 'Starter' }));
          setShowModal(true);
      }
  }, [initialData]);

  const handleCreate = async () => {
      await onAddCompany(form);
      setShowModal(false);
      setForm({ name: '', address: '', phone: '', tier: 'Starter' });
      onClearInitialData();
  };

  const handleCloseModal = () => {
      setShowModal(false);
      onClearInitialData();
  };

  const filteredCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Tenants</h1>
                <p className="text-slate-500 text-sm">Active roofing companies on the platform</p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Search companies..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    />
                </div>
                <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200">
                    <Plus size={18}/> Onboard Company
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map(company => (
                <div key={company.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">
                            {company.name.substring(0,2).toUpperCase()}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{company.status}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{company.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 truncate">{company.address || 'No address'}</p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Users size={14}/> {company.userCount}/{company.maxUsers} Users</span>
                            <span className="flex items-center gap-1"><Zap size={14}/> {company.tier}</span>
                        </div>
                        
                        <button 
                            onClick={() => setSelectedCompany(company)}
                            className="w-full py-2 bg-slate-50 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                            Manage Users
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* --- ADD/ONBOARD MODAL --- */}
        {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
                    <button onClick={handleCloseModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    <h3 className="font-bold text-lg mb-4">Onboard New Tenant</h3>
                    <div className="space-y-4">
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Company Name" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                            <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Starter">Starter</option>
                                <option value="Professional">Professional</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={handleCloseModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleCreate} disabled={!form.name} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Create</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- COMPANY USERS MODAL --- */}
        {selectedCompany && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{selectedCompany.name} - Users</h3>
                            <p className="text-xs text-slate-500">Managing access for this tenant</p>
                        </div>
                        <button onClick={() => setSelectedCompany(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-0 overflow-y-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.filter(u => u.companyId === selectedCompany.id).map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {user.avatarInitials}
                                            </div>
                                            <span className="font-medium text-slate-900">{user.name}</span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">{user.email}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-bold border border-blue-100">
                                                {user.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {users.filter(u => u.companyId === selectedCompany.id).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                                            No users found for this company.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                        To add users, log in as the Company Owner.
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTenants;