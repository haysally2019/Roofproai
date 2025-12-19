import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { UserPlus, Trash2, Copy, CheckCircle, X } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<string | null>;
  onRemoveUser: (id: string) => void;
}

const SuperAdminTeam: React.FC<Props> = ({ users, onAddUser, onRemoveUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [createdUserCreds, setCreatedUserCreds] = useState<{email: string, password: string} | null>(null);

  const handleAdd = async () => {
      const tempPassword = await onAddUser({ ...form, role: UserRole.SAAS_REP, companyId: null });
      if (tempPassword) {
          setCreatedUserCreds({ email: form.email, password: tempPassword });
          setShowModal(false);
          setShowSuccessModal(true);
          setForm({ name: '', email: '' });
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const saasTeam = users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN);

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900">SaaS Team</h1>
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"><UserPlus size={18}/> Add Rep</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {saasTeam.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-bold text-slate-900">{user.name} <div className="text-xs text-slate-400 font-normal">{user.email}</div></td>
                              <td className="p-4"><span className={`px-2 py-1 text-xs rounded font-bold ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                              <td className="p-4 text-right">
                                  {user.role !== UserRole.SUPER_ADMIN && (
                                    <button onClick={() => onRemoveUser(user.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
             </table>
        </div>

        {/* --- ADD REP MODAL --- */}
        {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
                    <h3 className="font-bold text-lg mb-4">Add Sales Rep</h3>
                    <div className="space-y-4">
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full Name" className="w-full p-2.5 border rounded-lg"/>
                        <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="w-full p-2.5 border rounded-lg"/>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleAdd} disabled={!form.email} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Create Account</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- SUCCESS MODAL WITH PASSWORD --- */}
        {showSuccessModal && createdUserCreds && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in relative">
                    <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Account Created!</h3>
                        <p className="text-slate-500 text-sm mt-1">Share these credentials with your new rep safely.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                            <div className="font-mono text-slate-800 font-medium select-all">{createdUserCreds.email}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Temporary Password</label>
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-slate-800 font-bold bg-white px-2 py-1 rounded border border-slate-200 select-all flex-1">
                                    {createdUserCreds.password}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(createdUserCreds.password)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    title="Copy Password"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTeam;