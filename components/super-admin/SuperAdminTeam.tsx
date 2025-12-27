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

  // Only show Internal Team members (SaaS Reps & Super Admins)
  const filteredUsers = users.filter(u =>
    (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SAAS_REP)
  );

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setIsSubmitting(true);
    
    // STRICT: Always pass null for companyId when Super Admin invites team
    await onAddUser({
      name: form.name,
      email: form.email,
      role: form.role as UserRole,
      companyId: null 
    });

    setIsSubmitting(false);
    setShowModal(false);
    setForm({ name: '', email: '', role: 'SaaS Rep' }); // Reset to SaaS Rep default
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Internal Team</h1>
          <p className="text-slate-500 text-sm">Manage SaaS Reps and Super Admins</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg"
        >
          <Plus size={18}/> Add Team Member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Invited By</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => {
              const invitedBy = user.invitedByUserId
                ? users.find(u => u.id === user.invitedByUserId)
                : null;

              return (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {user.avatarInitials}
                    </div>
                    <span className="font-medium text-slate-900">{user.name}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1 ${
                      user.role === UserRole.SUPER_ADMIN
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {user.role === UserRole.SUPER_ADMIN ? <Shield size={12}/> : <Briefcase size={12}/>}
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {invitedBy ? invitedBy.name : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => confirm('Remove user?') && onRemoveUser(user.id)} className="text-slate-400 hover:text-red-600 p-2">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h3 className="font-bold text-lg mb-4">Invite Team Member</h3>
            <p className="text-sm text-slate-500 mb-4">This user will have access to the <strong>Internal SaaS Dashboard</strong>.</p>
            <div className="space-y-4">
              <input
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email Address"
                type="email"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="SaaS Rep">SaaS Sales Rep</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.email || isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={16}/>}
                {isSubmitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTeam;