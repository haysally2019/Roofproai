import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Plus, Search, Mail, User as UserIcon, Trash2, X } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<boolean>;
  onRemoveUser: (userId: string) => void;
}

const SuperAdminTeam: React.FC<Props> = ({ users, onAddUser, onRemoveUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'SaaS Rep' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SAAS_REP)
  );

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setIsSubmitting(true);
    
    await onAddUser({
      name: form.name,
      email: form.email,
      role: form.role as UserRole,
      companyId: null
    });

    setIsSubmitting(false);
    setShowModal(false);
    setForm({ name: '', email: '', role: 'SaaS Rep' });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sales Team</h1>
          <p className="text-slate-500 text-sm">Manage sales reps and super admins</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 whitespace-nowrap"
          >
            <Plus size={18}/> Add Team Member
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role & Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {user.avatarInitials}
                  </div>
                  <span className="font-medium text-slate-900">{user.name}</span>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  <a href={`mailto:${user.email}`} className="hover:text-indigo-600 flex items-center gap-2">
                    <Mail size={14}/> {user.email}
                  </a>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      user.role === UserRole.SUPER_ADMIN
                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {user.role}
                    </span>
                    {user.status === 'Pending' && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      if (confirm(`Remove ${user.name} from the team?`)) {
                        await onRemoveUser(user.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20}/>
            </button>
            <h3 className="font-bold text-lg mb-4">Add Team Member</h3>
            <p className="text-sm text-slate-500 mb-4">The user will receive an email invite to set their password.</p>
            <div className="space-y-4">
              <input
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full Name"
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email"
                type="email"
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <select
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}
                className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="SaaS Rep">SaaS Rep</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.email || isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTeam;