import React, { useState } from 'react';
import { User, UserRole, Company } from '../types';
import { Mail, Shield, UserPlus, Trash2, Loader2 } from 'lucide-react';

interface TeamManagementProps {
  company: Company;
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<boolean>;
  onRemoveUser: (userId: string) => void;
  onViewAnalytics?: (user: User) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ company, users, onAddUser, onRemoveUser, onViewAnalytics }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.SALES_REP });

const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    // Disable button while processing
    const success = await onAddUser(newUser);
    
    if (success) {
        setIsAdding(false);
        setNewUser({ name: '', email: '', role: UserRole.SALES_REP });
    }
  };

  const usagePercent = Math.round((users.length / company.maxUsers) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Team Management</h2>
          <p className="text-slate-500 mt-2">Manage access and roles for {company.name}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">
              License Usage
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {users.length} <span className="text-slate-400 text-lg font-normal">/ {company.maxUsers === 999 ? 'Unlimited' : company.maxUsers}</span>
            </p>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
          {usagePercent > 75 && (
            <p className="text-xs text-slate-500 mt-2">
              {usagePercent >= 100 ? 'User limit reached. ' : 'Approaching user limit. '}
              {company.tier !== 'Enterprise' && 'Consider upgrading your plan for more seats.'}
            </p>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <h3 className="font-bold text-xl mb-2">Invite New Team Member</h3>
          <p className="text-sm text-slate-500 mb-6">An email invitation will be sent to the user to set up their account.</p>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                <input
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="jane@company.com"
                />
              </div>
            </div>
            <div className="md:w-1/2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
              >
                <option value={UserRole.SALES_REP}>Sales Rep</option>
                <option value={UserRole.COMPANY_ADMIN}>Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Team Members</h3>
            <p className="text-sm text-slate-500 mt-0.5">{users.length} active {users.length === 1 ? 'user' : 'users'}</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={users.length >= company.maxUsers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            Add User
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div
                className="flex items-center gap-5 flex-1 cursor-pointer"
                onClick={() => onViewAnalytics?.(user)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-base shadow-sm">
                  {user.avatarInitials}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-base mb-1">{user.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={14} />
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  user.role === UserRole.COMPANY_ADMIN
                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                  {user.role === UserRole.COMPANY_ADMIN && <Shield size={14} />}
                  {user.role}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Remove ${user.name} from the team?`)) {
                      onRemoveUser(user.id);
                    }
                  }}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove User"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus size={32} className="text-slate-400" />
              </div>
              <h4 className="text-slate-900 font-semibold mb-2">No team members yet</h4>
              <p className="text-slate-500 text-sm">Add your first team member to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;