import React, { useState, useEffect } from 'react';
import { Company, User, UserRole, SubscriptionTier } from '../../types';
import { Plus, Users, Zap, Search, Mail, User as UserIcon, X, Trash2, Edit2, CheckCircle, Copy, Key, Settings, CreditCard, ShieldAlert, Activity, FileText } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SUBSCRIPTION_PLANS } from '../../lib/constants';

interface Props {
  companies: Company[];
  users: User[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  initialData?: Partial<Company> | null;
  onClearInitialData: () => void;
}

const SuperAdminTenants: React.FC<Props> = ({ companies, users, onAddCompany, initialData, onClearInitialData }) => {
  const { updateUser, removeUser, addUser, deleteCompany, updateCompany } = useStore();

  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive'>('Active');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', tier: 'Starter' });
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', email: '', role: 'Staff' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  
  const [settingsCompany, setSettingsCompany] = useState<Company | null>(null);
  const [settingsTab, setSettingsTab] = useState<'Subscription' | 'Billing' | 'Danger'>('Subscription');

  useEffect(() => {
      if (initialData) {
          setCompanyForm(prev => ({ ...prev, ...initialData, tier: 'Starter' }));
          setShowCompanyModal(true);
      }
  }, [initialData]);

  const handleCreateCompany = async () => {
      await onAddCompany(companyForm);
      setShowCompanyModal(false);
      setCompanyForm({ name: '', address: '', phone: '', tier: 'Starter' });
      onClearInitialData();
  };

  const filteredCompanies = companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'Active' ? c.status === 'Active' : c.status !== 'Active';
      return matchesSearch && matchesStatus;
  });

  const handleUpdateSubscription = (tier: SubscriptionTier) => {
      if (settingsCompany) {
          updateCompany({ id: settingsCompany.id, tier });
          setSettingsCompany({ ...settingsCompany, tier });
      }
  };

  const handleToggleStatus = () => {
      if (settingsCompany) {
          const newStatus = settingsCompany.status === 'Active' ? 'Suspended' : 'Active';
          updateCompany({ id: settingsCompany.id, status: newStatus });
          setSettingsCompany(null);
      }
  };

  const handleDeleteCompany = async () => {
      if (settingsCompany && window.confirm(`DANGER: Are you sure you want to permanently delete ${settingsCompany.name}? This cannot be undone.`)) {
          await deleteCompany(settingsCompany.id);
          setSettingsCompany(null);
      }
  };

  const handleOpenAddUser = () => {
      setUserForm({ name: '', email: '', role: 'Staff' });
      setIsEditingUser(false);
      setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
      setUserForm({ id: user.id, name: user.name, email: user.email, role: user.role });
      setIsEditingUser(true);
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
      if (!selectedCompany) return;
      setIsSubmittingUser(true);

      if (isEditingUser && userForm.id) {
          await updateUser(userForm);
      } else {
          await addUser({ ...userForm, companyId: selectedCompany.id });
      }
      setIsSubmittingUser(false);
      setShowUserModal(false);
  };

  const handleDeleteUser = async (userId: string) => {
      if (window.confirm('Remove this user?')) {
          await removeUser(userId);
      }
  };

  // Mock Billing
  const mockInvoices = [
      { id: 'inv-001', date: '2024-12-01', amount: '$199.00', status: 'Paid' },
      { id: 'inv-002', date: '2024-11-01', amount: '$199.00', status: 'Paid' },
      { id: 'inv-003', date: '2024-10-01', amount: '$199.00', status: 'Paid' },
  ];

  return (
    <div>
        <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Tenants</h1>
                    <p className="text-slate-500 text-sm">Manage roofing companies, subscriptions, and access.</p>
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
                    <button onClick={() => setShowCompanyModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200">
                        <Plus size={18}/> Onboard Company
                    </button>
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setStatusFilter('Active')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${statusFilter === 'Active' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Active Tenants
                </button>
                <button 
                    onClick={() => setStatusFilter('Inactive')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${statusFilter === 'Inactive' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Inactive / Suspended
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map(company => (
                <div key={company.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">
                            {company.name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex gap-2">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${company.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{company.status}</span>
                             <button onClick={() => setSettingsCompany(company)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                                 <Settings size={16} />
                             </button>
                        </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{company.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 truncate">{company.address || 'No address'}</p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Users size={14}/> {company.userCount}/{company.maxUsers} Users</span>
                            <span className="flex items-center gap-1"><Zap size={14}/> {company.tier}</span>
                        </div>
                        
                        <button onClick={() => setSelectedCompany(company)} className="w-full py-2 bg-slate-50 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors">
                            Manage Users
                        </button>
                    </div>
                </div>
            ))}
            {filteredCompanies.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                    No {statusFilter.toLowerCase()} companies found.
                </div>
            )}
        </div>

        {showCompanyModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
                    <button onClick={() => { setShowCompanyModal(false); onClearInitialData(); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    <h3 className="font-bold text-lg mb-4">Onboard New Tenant</h3>
                    <div className="space-y-4">
                        <input value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Company Name" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <input value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} placeholder="Address" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} placeholder="Phone" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"/>
                            <select value={companyForm.tier} onChange={e => setCompanyForm({...companyForm, tier: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                                {Object.values(SUBSCRIPTION_PLANS).map(plan => (
                                    <option key={plan.id} value={plan.name}>{plan.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => { setShowCompanyModal(false); onClearInitialData(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleCreateCompany} disabled={!companyForm.name} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Create</button>
                    </div>
                </div>
            </div>
        )}

        {settingsCompany && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Manage {settingsCompany.name}</h3>
                        <button onClick={() => setSettingsCompany(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="flex border-b border-slate-100 bg-slate-50">
                        <button onClick={() => setSettingsTab('Subscription')} className={`flex-1 py-3 text-sm font-bold ${settingsTab === 'Subscription' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Subscription</button>
                        <button onClick={() => setSettingsTab('Billing')} className={`flex-1 py-3 text-sm font-bold ${settingsTab === 'Billing' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Billing</button>
                        <button onClick={() => setSettingsTab('Danger')} className={`flex-1 py-3 text-sm font-bold ${settingsTab === 'Danger' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-red-600'}`}>Danger Zone</button>
                    </div>

                    <div className="p-6 min-h-[250px]">
                        {settingsTab === 'Subscription' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                    <div className="p-2 bg-white rounded text-indigo-600 shadow-sm"><Activity size={20}/></div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-800 uppercase">Current Plan</p>
                                        <p className="text-lg font-bold text-indigo-900">{settingsCompany.tier}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Change Plan Tier</label>
                                    <select 
                                        value={settingsCompany.tier} 
                                        onChange={(e) => handleUpdateSubscription(e.target.value as SubscriptionTier)}
                                        className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {Object.values(SUBSCRIPTION_PLANS).map(plan => (
                                            <option key={plan.id} value={plan.name}>{plan.name} - ${plan.price}/mo</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">Plan changes apply immediately. Prorated charges will appear on next invoice.</p>
                                </div>
                            </div>
                        )}

                        {settingsTab === 'Billing' && (
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={18}/> Payment History</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 font-bold text-slate-500">
                                            <tr><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Invoice</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {mockInvoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="p-3">{inv.date}</td>
                                                    <td className="p-3">{inv.amount}</td>
                                                    <td className="p-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{inv.status}</span></td>
                                                    <td className="p-3 text-right text-indigo-600 hover:underline cursor-pointer"><FileText size={16} className="inline"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {settingsTab === 'Danger' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg">
                                    <div>
                                        <h4 className="font-bold text-amber-800">Suspend Access</h4>
                                        <p className="text-xs text-amber-600">Temporarily disable all user logins for this company.</p>
                                    </div>
                                    <button 
                                        onClick={handleToggleStatus}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm ${settingsCompany.status === 'Active' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                                    >
                                        {settingsCompany.status === 'Active' ? 'Suspend' : 'Activate'}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                                    <div>
                                        <h4 className="font-bold text-red-800">Delete Company</h4>
                                        <p className="text-xs text-red-600">Permanently remove this tenant and all data.</p>
                                    </div>
                                    <button 
                                        onClick={handleDeleteCompany}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 flex items-center gap-2"
                                    >
                                        <Trash2 size={16}/> Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {selectedCompany && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{selectedCompany.name} <span className="text-slate-400 font-normal">| Team</span></h3>
                            <p className="text-xs text-slate-500">Manage access and roles for this tenant.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleOpenAddUser} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-indigo-700">
                                <Plus size={16}/> Add User
                            </button>
                            <button onClick={() => setSelectedCompany(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                    </div>
                    
                    <div className="p-0 overflow-y-auto flex-1 bg-slate-50/50">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.filter(u => u.companyId === selectedCompany.id).map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {user.avatarInitials}
                                                </div>
                                                <span className="font-bold text-slate-900">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 font-mono">{user.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${user.role === 'Company Owner' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenEditUser(user)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.filter(u => u.companyId === selectedCompany.id).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                                            <Users size={48} className="mx-auto mb-3 opacity-20"/>
                                            No users found. Add a user to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {showUserModal && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
                    <h3 className="font-bold text-lg mb-4">{isEditingUser ? 'Edit User' : 'Invite New User'}</h3>
                    <p className="text-sm text-slate-500 mb-4">The user will receive an invite email to join the company.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                            <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                            <input 
                                value={userForm.email} 
                                onChange={e => setUserForm({...userForm, email: e.target.value})} 
                                className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isEditingUser ? 'bg-slate-50 text-slate-500' : ''}`}
                                readOnly={isEditingUser} 
                                title={isEditingUser ? "Email cannot be changed directly" : ""}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Company Owner">Company Owner</option>
                                <option value="Admin">Admin</option>
                                <option value="Staff">Staff</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleSaveUser} disabled={isSubmittingUser} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {isSubmittingUser ? 'Sending...' : (isEditingUser ? 'Save Changes' : 'Send Invite')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTenants;