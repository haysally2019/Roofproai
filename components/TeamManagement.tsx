import React, { useState } from 'react';
import { User, UserRole, Company } from '../types';
import { Mail, Shield, UserPlus, Trash2, Loader2 } from 'lucide-react';

interface TeamManagementProps {
  company: Company;
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<boolean>;
  onRemoveUser: (userId: string) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ company, users, onAddUser, onRemoveUser }) => {
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
          <p className="text-slate-500">Manage access and roles for {company.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700 mb-1">
            License Usage: {users.length} / {company.maxUsers === 999 ? 'Unlimited' : company.maxUsers}
          </p>
          <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} 
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-lg mb-4">Invite New Member</h3>
          <p className="text-sm text-slate-500 mb-4">An email will be sent to the user to set up their account.</p>
          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                required
                className="w-full p-2 border border-slate-300 rounded-lg" 
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                placeholder="Jane Doe"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                required
                type="email"
                className="w-full p-2 border border-slate-300 rounded-lg" 
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                placeholder="jane@company.com"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
              >
                <option value={UserRole.SALES_REP}>Sales Rep</option>
                <option value={UserRole.COMPANY_ADMIN}>Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                {isSubmitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Active Users</h3>
          <button 
            onClick={() => setIsAdding(true)}
            disabled={users.length >= company.maxUsers}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                  {user.avatarInitials}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{user.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={12} />
                    {user.email}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  user.role === UserRole.COMPANY_ADMIN 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {user.role === UserRole.COMPANY_ADMIN && <Shield size={12} />}
                  {user.role}
                </span>
                
                <button 
                  onClick={() => onRemoveUser(user.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove User"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;