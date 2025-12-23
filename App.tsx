import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Menu, Bell, X, CheckCircle, AlertTriangle, Info, Zap, Loader2 } from 'lucide-react';

// Context
import { StoreProvider, useStore } from './lib/store';
import { supabase } from './lib/supabase'; 

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeadBoard from './components/LeadBoard';
import Estimator from './components/Estimator';
import AIChat from './components/AIChat';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SaaSRepDashboard from './components/SaaSRepDashboard'; // Ensure this is imported
import TeamManagement from './components/TeamManagement';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import InvoiceSystem from './components/InvoiceSystem';
import PriceBook from './components/PriceBook';
import Settings from './components/Settings';
import AIReceptionist from './components/AIReceptionist';
import Automations from './components/Automations';
import Onboarding from './components/Onboarding'; 
import TrialFunnel from './components/TrialFunnel'; 

import { LeadStatus, UserRole, Tab } from './types';

// --- TOAST NOTIFICATIONS ---
const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useStore();
    return (
        <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-[90vw] md:w-80 md:max-w-md pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto animate-slide-in-right bg-white rounded-lg shadow-lg border border-slate-100 p-4 flex items-start gap-3">
                    {toast.type === 'success' && <CheckCircle className="text-emerald-500 shrink-0" size={20} />}
                    {toast.type === 'error' && <AlertTriangle className="text-red-500 shrink-0" size={20} />}
                    {toast.type === 'info' && <Info className="text-blue-500 shrink-0" size={20} />}
                    <div className="flex-1"><p className="text-sm font-medium text-slate-800">{toast.message}</p></div>
                    <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                </div>
            ))}
        </div>
    )
}

// --- SET PASSWORD SCREEN ---
const SetPassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // User is authenticated via the invite link hash
        const { error } = await supabase.auth.updateUser({ password });
        
        if (error) {
            alert('Error: ' + error.message);
            setLoading(false);
        } else {
            window.location.href = '/'; 
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 relative z-10 animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4"><Zap size={24} /></div>
                    <h2 className="text-2xl font-bold text-slate-900">Welcome to the Team</h2>
                    <p className="text-slate-500 text-sm mt-2">Set your password to activate your account.</p>
                </div>
                <form onSubmit={handleSetPassword} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Password</label>
                        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                    </div>
                    <button disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- APP LAYOUT ---
const AppLayout: React.FC = () => {
  const {
      currentUser, activeTab, companies, leads, events, tasks, invoices, users, notifications, softwareLeads,
      updateLead, addLead, addToast, login, addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser, createCompany, addSoftwareLead, updateSoftwareLead
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  // --- ROUTING ---
  const path = window.location.pathname.toLowerCase().replace(/\/$/, ''); 
  const hash = window.location.hash.toLowerCase();

  // 1. Set Password Route
  if (path === '/set-password') return <SetPassword />;

  // 2. Invite/Auth Redirect Handling
  if (hash.includes('access_token') && !currentUser) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
      );
  }

  // 3. Onboarding Funnel
  if (path === '/onboarding' || path === '/register') return <><ToastContainer /><TrialFunnel /></>;

  // 4. Login Screen
  if (!currentUser) {
      return (
         <div className="h-full w-full bg-[#0F172A] relative overflow-y-auto flex flex-col">
             <ToastContainer />
             <div className="fixed inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
                 <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px]"></div>
             </div>
             <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-[600px]">
                 <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl animate-fade-in border border-slate-100">
                     <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Welcome Back</h2>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        setAuthLoading(true);
                        login(authForm.email, authForm.password).finally(() => setAuthLoading(false));
                     }} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                            <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                            <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                         </div>
                         <button type="submit" disabled={authLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all flex justify-center items-center gap-2">
                            {authLoading ? <Loader2 className="animate-spin"/> : 'Sign In'}
                         </button>
                     </form>
                 </div>
             </div>
         </div>
      )
  }

  // 5. VIEW ROUTING
  
  // SaaS Rep View (Dedicated)
  if (currentUser.role === 'SaaS Rep' || currentUser.role === UserRole.SAAS_REP) {
      return (
          <>
            <ToastContainer />
            <SaaSRepDashboard 
                companies={companies}
                users={users}
                currentUser={currentUser}
                onAddCompany={createCompany}
                softwareLeads={softwareLeads}
                onAddSoftwareLead={addSoftwareLead}
                onUpdateSoftwareLead={updateSoftwareLead}
            />
          </>
      );
  }

  // Super Admin View
  if (currentUser.role === UserRole.SUPER_ADMIN && activeTab !== Tab.SETTINGS) {
    return (
        <SuperAdminDashboard
            view={activeTab}
            companies={companies || []}
            onAddCompany={createCompany}
            users={users || []}
            onAddUser={addUser}
            onRemoveUser={removeUser}
            currentUser={currentUser}
            softwareLeads={softwareLeads}
            onAddSoftwareLead={addSoftwareLead}
            onUpdateSoftwareLead={updateSoftwareLead}
        />
    );
  }

  // Settings
  const currentCompany = companies.find(c => c.id === currentUser.companyId);
  if (activeTab === Tab.SETTINGS) {
    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="flex-1 overflow-auto p-4">
              <Settings currentUser={currentUser} company={currentCompany} onUpdateUser={useStore().updateUser} onUpdateCompany={useStore().updateCompany} />
            </main>
        </div>
    );
  }

  // Standard Company Dashboard
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="md:hidden sticky top-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 -ml-2"><Menu size={24} /></button>
            <span className="font-bold text-slate-800 flex items-center gap-2"><Zap className="text-blue-600 fill-blue-600" size={20} /> Rafter AI</span>
            <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-600 relative p-2 -mr-2">
                <Bell size={24} /> {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth custom-scrollbar">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {activeTab === Tab.DASHBOARD && <Dashboard currentUser={currentUser} />}
              {/* ... other tabs ... */}
              {activeTab === Tab.LEADS && <LeadBoard leads={leads.filter(l => [LeadStatus.NEW, LeadStatus.INSPECTION].includes(l.status))} viewMode="leads" users={users} currentUser={currentUser} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
              {/* ... keep your existing tab rendering logic ... */}
            </div>
        </main>
      </div>
      <AIChat />
    </div>
  );
};

const App: React.FC = () => (
    <BrowserRouter>
        <StoreProvider>
            <AppLayout />
        </StoreProvider>
    </BrowserRouter>
)

export default App;