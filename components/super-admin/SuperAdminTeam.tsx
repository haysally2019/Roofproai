import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Plus, Search, Mail, Trash2, X, Shield, Briefcase, Loader2 } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<boolean>;
  onRemoveUser: (userId: string) => void;
}

const SuperAdminTeam: React.FC<Props> = ({ users, onAddUser, onRemoveUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'SaaS Rep' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = users.filter(u =>
    u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SAAS_REP
  );

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setIsSubmitting(true);
    await onAddUser({ ...form, role: form.role as UserRole, companyId: null });
    setIsSubmitting(false);
    setShowModal(false);
    setForm({ name: '', email: '', role: 'SaaS Rep' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Internal Team</h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800">
          <Plus size={18}/> Add Member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
            <tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="p-4 font-medium">{user.name} <span className="text-slate-400 text-sm block font-normal">{user.email}</span></td>
                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{user.role}</span></td>
                <td className="p-4 text-right"><button onClick={() => onRemoveUser(user.id)} className="text-red-500"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Invite Internal Team</h3>
            <div className="space-y-3">
                <input className="w-full p-2 border rounded" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <select className="w-full p-2 border rounded" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="SaaS Rep">SaaS Sales Rep</option>
                    <option value="Super Admin">Super Admin</option>
                </select>
                <button onClick={handleCreate} disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700">
                    {isSubmitting ? 'Sending...' : 'Send Invite'}
                </button>
                <button onClick={() => setShowModal(false)} className="w-full text-slate-500 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminTeam;