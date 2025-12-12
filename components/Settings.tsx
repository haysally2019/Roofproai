
import React, { useState } from 'react';
import { User, Company, UserRole } from '../types';
import { Save, User as UserIcon, Building2, CreditCard, Camera, RefreshCw, Link2, CheckCircle, ExternalLink, Activity } from 'lucide-react';
import { useStore } from '../lib/store';

interface SettingsProps {
  currentUser: User;
  company?: Company;
  onUpdateUser: (user: Partial<User>) => void;
  onUpdateCompany: (company: Partial<Company>) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, company, onUpdateUser, onUpdateCompany }) => {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'billing' | 'integrations'>('profile');
  const [profileForm, setProfileForm] = useState({ name: currentUser.name, email: currentUser.email });
  const [companyForm, setCompanyForm] = useState({ 
    name: company?.name || '', 
    address: company?.address || '123 Roofer Lane, Dallas, TX' 
  });
  
  // Fake Card State
  const [cardName, setCardName] = useState('John Doe');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');

  // Integration State
  const [isSyncingQB, setIsSyncingQB] = useState(false);

  const handleProfileSave = () => {
    onUpdateUser(profileForm);
    addToast("Profile updated", "success");
  };

  const handleCompanySave = () => {
    onUpdateCompany(companyForm);
    addToast("Company details updated", "success");
  };

  const toggleQuickBooks = () => {
      if(!company) return;
      const isConnected = company.integrations?.quickbooks.isConnected;
      if (isConnected) {
          // Disconnect
          onUpdateCompany({ 
              ...company, 
              integrations: { 
                  ...company.integrations, 
                  quickbooks: { isConnected: false, autoSync: false } 
              } 
          });
          addToast("Disconnected from QuickBooks", "info");
      } else {
          // Connect Simulation
          const win = window.open('', 'Connect to QuickBooks', 'width=600,height=600');
          if(win) {
             win.document.write('<html><body style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;background:#f4f5f8"><h2>Connecting to Intuit...</h2></body></html>');
             setTimeout(() => {
                 win.close();
                 onUpdateCompany({ 
                    ...company, 
                    integrations: { 
                        quickbooks: { isConnected: true, autoSync: true, lastSync: new Date().toLocaleString() } 
                    } 
                 });
                 addToast("Successfully connected to QuickBooks Online", "success");
             }, 1500);
          }
      }
  };

  const syncQuickBooks = () => {
      if(!company?.integrations?.quickbooks.isConnected) return;
      setIsSyncingQB(true);
      setTimeout(() => {
          setIsSyncingQB(false);
          onUpdateCompany({
              ...company,
              integrations: {
                  ...company.integrations,
                  quickbooks: {
                      ...company.integrations!.quickbooks,
                      lastSync: new Date().toLocaleString()
                  }
              }
          });
          addToast("Sync Complete: 12 Invoices, 4 Customers updated", "success");
      }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-2 md:p-4 md:space-y-2 flex flex-row md:flex-col overflow-x-auto no-scrollbar shrink-0">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 md:flex-none whitespace-nowrap flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                <UserIcon size={18} /> My Profile
            </button>
            {company && (currentUser.role === UserRole.COMPANY_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
                 <>
                    <button 
                        onClick={() => setActiveTab('company')}
                        className={`flex-1 md:flex-none whitespace-nowrap flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'company' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Building2 size={18} /> Company Profile
                    </button>
                    <button 
                        onClick={() => setActiveTab('integrations')}
                        className={`flex-1 md:flex-none whitespace-nowrap flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Link2 size={18} /> Integrations
                    </button>
                    <button 
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 md:flex-none whitespace-nowrap flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CreditCard size={18} /> Billing & Plan
                    </button>
                 </>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8">
            {activeTab === 'profile' && (
                <div className="space-y-6 max-w-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500 relative group cursor-pointer overflow-hidden">
                            {currentUser.avatarInitials}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Profile Photo</h3>
                            <p className="text-xs text-slate-500">Click to upload new photo</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input 
                                value={profileForm.name}
                                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input 
                                type="email"
                                value={profileForm.email}
                                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    
                    <button onClick={handleProfileSave} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Save size={16}/> Save Changes
                    </button>
                </div>
            )}

            {activeTab === 'company' && company && (
                <div className="space-y-6 max-w-lg">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Company Details</h2>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                            <input 
                                value={companyForm.name}
                                onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                            <input 
                                value={companyForm.address}
                                onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    
                    <button onClick={handleCompanySave} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Save size={16}/> Save Company Info
                    </button>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && company && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Connected Apps</h2>
                        <p className="text-slate-500 text-sm mt-1">Manage external software connections.</p>
                    </div>

                    {/* QuickBooks Card */}
                    <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                 <div className="w-16 h-16 bg-[#2CA01C] rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                                     qb
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-bold text-slate-900">QuickBooks Online</h3>
                                     <p className="text-sm text-slate-500 max-w-xs">
                                         Sync invoices, customers, and payments automatically.
                                     </p>
                                 </div>
                             </div>
                             <button 
                                onClick={toggleQuickBooks}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${company.integrations?.quickbooks.isConnected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#2CA01C] text-white hover:bg-green-700 shadow-sm'}`}
                             >
                                 {company.integrations?.quickbooks.isConnected ? 'Disconnect' : 'Connect to QuickBooks'}
                             </button>
                        </div>

                        {company.integrations?.quickbooks.isConnected && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                     <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                                         <CheckCircle size={16} /> Status: Connected
                                     </div>
                                     <div className="text-xs text-slate-500">
                                         Last Sync: {company.integrations.quickbooks.lastSync || 'Never'}
                                     </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <button 
                                        onClick={syncQuickBooks}
                                        disabled={isSyncingQB}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={isSyncingQB ? "animate-spin" : ""} /> 
                                        {isSyncingQB ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-600">
                                        <Activity size={14} /> View Logs
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 text-indigo-600 text-sm font-medium hover:underline ml-auto">
                                        Configure Mapping <ExternalLink size={14}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Placeholder for other integrations */}
                    <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 opacity-60 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                 Zap
                             </div>
                             <div>
                                 <h3 className="text-lg font-bold text-slate-900">Zapier</h3>
                                 <p className="text-sm text-slate-500">Connect to 5,000+ other apps.</p>
                             </div>
                         </div>
                         <button disabled className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-400">
                             Coming Soon
                         </button>
                    </div>
                </div>
            )}

            {activeTab === 'billing' && company && (
                 <div className="space-y-6">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-indigo-900 uppercase">Current Plan</p>
                            <h3 className="text-2xl font-bold text-indigo-700">{company.tier} Plan</h3>
                            <p className="text-xs text-indigo-600">Renews on {company.renewalDate}</p>
                        </div>
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Upgrade</button>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="font-bold text-slate-800 mb-4">Payment Method</h3>
                        
                        <div className="max-w-md space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cardholder Name</label>
                                <input 
                                    value={cardName}
                                    onChange={e => setCardName(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Card Number</label>
                                    <input 
                                        value={cardNumber}
                                        onChange={e => setCardNumber(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Exp</label>
                                        <input className="w-full p-2 border border-slate-300 rounded-lg" placeholder="MM/YY" defaultValue="12/25"/>
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">CVC</label>
                                        <input className="w-full p-2 border border-slate-300 rounded-lg" placeholder="123"/>
                                     </div>
                                </div>
                            </div>
                        </div>

                        <button className="text-indigo-600 text-sm font-bold mt-4 hover:underline">Update Payment Method</button>
                    </div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
