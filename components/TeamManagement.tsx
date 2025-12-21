import React, { useState } from 'react';
import { User, UserRole, Company } from '../types';
import { Mail, Shield, UserPlus, Trash2, AlertCircle, TrendingUp } from 'lucide-react';

interface TeamManagementProps {
  company: Company;
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ company, users, onAddUser, onRemoveUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.SALES_REP });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    onAddUser(newUser);
    setIsAdding(false);
    setNewUser({ name: '', email: '', role: UserRole.SALES_REP });
  };

  const usagePercent = Math.round((users.length / company.maxUsers) * 100);
  const isLimitReached = users.length >= company.maxUsers;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
          <p className="text-slate-500">Manage access and roles for {company.name}</p>
        </div>
        <div className="text-right w-full md:w-auto">
          <p className="text-sm font-medium text-slate-700 mb-1 flex justify-between md:justify-end gap-4">
            <span>License Usage</span>
            <span>{users.length} / {company.maxUsers === 999 ? 'Unlimited' : company.maxUsers}</span>
          </p>
          <div className="w-full md:w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${usagePercent >= 100 ? 'bg-red-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {isLimitReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <div>
                  <h4 className="font-bold text-amber-900 text-sm">User Limit Reached</h4>
                  <p className="text-xs text-amber-700 mt-1">
                      You have reached the maximum number of users for your <strong>{company.tier}</strong> plan. 
                      Please upgrade your subscription to add more team members.
                  </p>
              </div>
              <button className="ml-auto text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded hover:bg-amber-200 transition-colors">
                  Upgrade Plan
              </button>
          </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-lg mb-4">Invite New Member</h3>
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                required
                className="w-full p-2 border border-slate-300 rounded-lg" 
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                placeholder="Jane Doe"
              />
            </div>
            <div className="flex-1 w-full">
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
            <div className="w-full md:w-48">
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
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="flex-1 md:flex-none px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Invite
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
            disabled={isLimitReached}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-400"
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