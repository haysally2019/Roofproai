import React, { useState, useEffect } from 'react';
import { Company, User, UserRole } from '../../types';
import { Plus, Users, Zap, Search, Mail, User as UserIcon, X, Trash2, Edit2, CheckCircle, Copy, Key } from 'lucide-react';
import { useStore } from '../../lib/store';

interface Props {
  companies: Company[];
  users: User[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  initialData?: Partial<Company> | null;
  onClearInitialData: () => void;
}

const SuperAdminTenants: React.FC<Props> = ({ companies, users, onAddCompany, initialData, onClearInitialData }) => {
  const { updateUser, removeUser, addUser } = useStore();

  // Tenant State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', tier: 'Starter' });
  const [searchQuery, setSearchQuery] = useState('');

  // User Management State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showUserModal, setShowUserModal] = useState(false); // To add/edit user
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', email: '', role: 'Staff' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  
  // Success State (New User Credentials)
  const [createdUserCreds, setCreatedUserCreds] = useState<{email: string, password: string} | null>(null);

  // Auto-open modal if converting lead
  useEffect(() => {
      if (initialData) {
          setCompanyForm(prev => ({ ...prev, ...initialData, tier: 'Starter' }));
          setShowCompanyModal(true);
      }
  }, [initialData]);

  // --- COMPANY ACTIONS ---
  const handleCreateCompany = async () => {
      await onAddCompany(companyForm);
      setShowCompanyModal(false);
      setCompanyForm({ name: '', address: '', phone: '', tier: 'Starter' });
      onClearInitialData();
  };

  const filteredCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- USER ACTIONS ---
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

      if (isEditingUser && userForm.id) {
          // Edit existing
          await updateUser(userForm);
          setShowUserModal(false);
      } else {
          // Create new
          const tempPass = await addUser({ ...userForm, companyId: selectedCompany.id });
          if (tempPass) {
              setCreatedUserCreds({ email: userForm.email!, password: tempPass });
              setShowUserModal(false);
              // Note: createdUserCreds will trigger the success view overlay
          }
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (window.confirm('Are you sure you want to remove this user from the tenant?')) {
          await removeUser(userId);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  return (
    <div>
        {/* Header */}
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
                <button onClick={() => setShowCompanyModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200">
                    <Plus size={18}/> Onboard Company
                </button>
            </div>
        </div>

        {/* Company Grid */}
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

        {/* --- ONBOARD COMPANY MODAL --- */}
        {showCompanyModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
                    <button onClick={() => { setShowCompanyModal(false); onClearInitialData(); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    <h3 className="font-bold text-lg mb-4">Onboard New Tenant</h3>
                    <div className="space-y-4">
                        <input value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Company Name" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        <input value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} placeholder="Address" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} placeholder="Phone" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                            <select value={companyForm.tier} onChange={e => setCompanyForm({...companyForm, tier: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Starter">Starter</option>
                                <option value="Professional">Professional</option>
                                <option value="Enterprise">Enterprise</option>
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

        {/* --- MANAGE COMPANY USERS MODAL --- */}
        {selectedCompany && !createdUserCreds && (
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

        {/* --- ADD/EDIT USER SUB-MODAL --- */}
        {showUserModal && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
                    <h3 className="font-bold text-lg mb-4">{isEditingUser ? 'Edit User' : 'Add New User'}</h3>
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
                                readOnly={isEditingUser} // Prevent email edits for now to avoid Auth desync
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
                        <button onClick={handleSaveUser} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                            {isEditingUser ? 'Save Changes' : 'Create Account'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- CREDENTIALS SUCCESS MODAL --- */}
        {createdUserCreds && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in relative">
                    <button onClick={() => setCreatedUserCreds(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">User Created Successfully</h3>
                        <p className="text-slate-500 text-sm mt-1">Please copy these credentials immediately.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Mail size={12}/> Email</label>
                            <div className="font-mono text-slate-800 font-medium select-all bg-white border border-slate-200 p-2 rounded">{createdUserCreds.email}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Key size={12}/> Temporary Password</label>
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-slate-800 font-bold bg-white px-3 py-2 rounded border border-slate-200 select-all flex-1 tracking-wide">
                                    {createdUserCreds.password}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(createdUserCreds.password)}
                                    className="p-2.5 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-all shadow-sm"
                                    title="Copy Password"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setCreatedUserCreds(null)}
                        className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTenants;