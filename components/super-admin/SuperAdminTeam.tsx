import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { UserPlus, Trash2 } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
}

const SuperAdminTeam: React.FC<Props> = ({ users, onAddUser, onRemoveUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });

  const handleAdd = () => {
      onAddUser({ ...form, role: UserRole.SAAS_REP, companyId: null });
      setShowModal(false);
      setForm({ name: '', email: '' });
  };

  const saasTeam = users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN);

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900">SaaS Team</h1>
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700"><UserPlus size={18}/> Add Rep</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {saasTeam.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50">
                              <td className="p-4 font-bold text-slate-900">{user.name} <div className="text-xs text-slate-400 font-normal">{user.email}</div></td>
                              <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-bold">{user.role}</span></td>
                              <td className="p-4 text-right">
                                  {user.role !== UserRole.SUPER_ADMIN && (
                                    <button onClick={() => onRemoveUser(user.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
             </table>
        </div>

        {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
                    <h3 className="font-bold text-lg mb-4">Add Sales Rep</h3>
                    <div className="space-y-4">
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full Name" className="w-full p-2.5 border rounded-lg"/>
                        <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="w-full p-2.5 border rounded-lg"/>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                        <button onClick={handleAdd} disabled={!form.email} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Invite</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default SuperAdminTeam;