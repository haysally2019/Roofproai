import React, { useState, useEffect } from 'react';
import { Menu, Bell, X, CheckCircle, AlertTriangle, Info, Zap, Loader2 } from 'lucide-react';

// Context
import { StoreProvider, useStore } from './lib/store';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeadBoard from './components/LeadBoard';
import Estimator from './components/Estimator';
import AIChat from './components/AIChat';
import SuperAdminDashboard from './components/SuperAdminDashboard';
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

// Types
import { LeadStatus, UserRole, Tab } from './types';
import { draftClientEmail } from './services/geminiService';

// --- Toast Component ---
const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useStore();
    return (
        <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-[90vw] md:w-80 md:max-w-md pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto animate-slide-in-right bg-white rounded-lg shadow-lg border border-slate-100 p-4 flex items-start gap-3">
                    {toast.type === 'success' && <CheckCircle className="text-emerald-500 shrink-0" size={20} />}
                    {toast.type === 'error' && <AlertTriangle className="text-red-500 shrink-0" size={20} />}
                    {toast.type === 'info' && <Info className="text-blue-500 shrink-0" size={20} />}
                    <div className="flex-1">
                         <p className="text-sm font-medium text-slate-800">{toast.message}</p>
                    </div>
                    <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                </div>
            ))}
        </div>
    )
}

// --- Main Layout ---
const AppLayout: React.FC = () => {
  const {
      currentUser, activeTab, companies, leads, events, tasks, invoices, users, notifications,
      updateLead, addLead, addToast, login, addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Auth Form State (For Login Page)
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  // --- ROUTING LOGIC ---
  const path = window.location.pathname.toLowerCase().replace(/\/$/, ''); 
  const hash = window.location.hash.toLowerCase().replace('#', '').replace(/\/$/, ''); 

  // Check for ANY match (covers /onboarding, /onboarding/, /#/onboarding)
  const isOnboardingRoute = 
      path === '/onboarding' || 
      hash === '/onboarding' || 
      hash === 'onboarding';

  // --- PRIORITY VIEW: ONBOARDING FUNNEL ---
  // This must come BEFORE the currentUser check, otherwise logged-in users 
  // (like you testing the app) will just see their dashboard.
  if (isOnboardingRoute) {
      return (
         <div className="h-full w-full bg-[#0F172A] relative overflow-y-auto flex flex-col">
             <ToastContainer />
             {/* Background */}
             <div className="fixed inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
                 <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px]"></div>
             </div>

             {/* Funnel Content */}
             <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-[600px]">
                 <div className="text-center mb-8 animate-fade-in">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
                            <Zap className="text-white fill-white" size={28} strokeWidth={2.5} />
                        </div>
                     </div>
                     <h1 className="text-3xl font-bold text-white tracking-tight">ALTUS AI</h1>
                     <p className="text-indigo-300 mt-2 font-medium tracking-wide">7-Day Free Trial Configuration</p>
                 </div>

                 {/* Render the Funnel, and redirect to root on "Login" click */}
                 <TrialFunnel onSwitchToLogin={() => window.location.href = '/'} />
                 
                 <div className="mt-8 text-center text-slate-500 text-xs">
                     &copy; 2025 Altus AI Inc. • Privacy • Terms
                 </div>
             </div>
         </div>
      )
  }

  // --- VIEW 2: AUTHENTICATION (Standard Login) ---
  if (!currentUser) {
      return (
         <div className="h-full w-full bg-[#0F172A] relative overflow-y-auto flex flex-col">
             <ToastContainer />
             <div className="fixed inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
                 <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px]"></div>
             </div>

             <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-[600px]">
                 <div className="text-center mb-8 animate-fade-in">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
                            <Zap className="text-white fill-white" size={28} strokeWidth={2.5} />
                        </div>
                     </div>
                     <h1 className="text-3xl font-bold text-white tracking-tight">ALTUS AI</h1>
                     <p className="text-slate-400 mt-2 font-medium">Enterprise Roofing CRM & AI Assistant</p>
                 </div>

                 <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl animate-fade-in border border-slate-100">
                     <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Welcome Back</h2>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        setAuthLoading(true);
                        login(authForm.email, authForm.password).finally(() => setAuthLoading(false));
                     }} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                            <input 
                                required type="email"
                                value={authForm.email} 
                                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                            <input 
                                required type="password"
                                value={authForm.password} 
                                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                            />
                         </div>
                         <button 
                            type="submit" 
                            disabled={authLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all flex justify-center items-center gap-2"
                         >
                            {authLoading ? <Loader2 className="animate-spin"/> : 'Sign In'}
                         </button>
                     </form>
                     <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                         <p className="text-sm text-slate-500">
                             New Roofing Company? 
                             <button onClick={() => window.location.href = '/onboarding'} className="ml-1 text-indigo-600 font-bold hover:underline">
                                 Start Free Trial
                             </button>
                         </p>
                     </div>
                 </div>
                 
                 <div className="mt-8 text-center text-slate-500 text-xs">
                     &copy; 2025 Altus AI Inc. • Privacy • Terms
                 </div>
             </div>
         </div>
      )
  }

  // --- SIMULATION & EFFECTS ---
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
        const rand = Math.random();
        if (rand > 0.95) addToast("New Web Lead: 124 Main St - Inspect Request", "info");
        else if (rand > 0.98) addToast("Weather Alert: Hail detected in Zip 75001", "error");
    }, 45000);
    return () => clearInterval(interval);
  }, [currentUser, addToast]);

  // --- Handlers ---
  const handleDraftEmail = async (lead: any) => {
    addToast("Generating email draft...", "info");
    await draftClientEmail(lead.name, "General Followup", "professional");
    addToast("Email drafted successfully", "success");
  };

  // --- VIEW 3: POST-SIGNUP SETUP (If logged in but incomplete) ---
  const currentCompany = companies.find(c => c.id === currentUser?.companyId);
  
  if (currentUser && currentCompany && !currentCompany.setupComplete) {
      return (
          <div className="h-screen w-full bg-slate-50">
              <Onboarding /> 
          </div>
      );
  }

  // --- VIEW 4: MAIN APP (Dashboard) ---
  const companyLeads = leads; 

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"></div>
        
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 -ml-2"><Menu size={24} /></button>
            <span className="font-bold text-slate-800 flex items-center gap-2"><Zap className="text-blue-600 fill-blue-600" size={20} /> Altus AI</span>
            <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-600 relative p-2 -mr-2">
                <Bell size={24} /> {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth custom-scrollbar">
          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.SAAS_REP) && activeTab !== Tab.SETTINGS ? (
            <SuperAdminDashboard 
              view={activeTab}
              companies={companies} 
              onAddCompany={() => {}} 
              onUpdateStatus={() => {}} 
              users={[]} 
              onAddUser={() => {}}
              onRemoveUser={() => {}}
              currentUser={currentUser}
              softwareLeads={[]}
              onAddSoftwareLead={() => {}}
              onUpdateSoftwareLead={() => {}}
            />
          ) : activeTab === Tab.SETTINGS ? (
             <Settings 
                currentUser={currentUser!}
                company={currentCompany}
                onUpdateUser={useStore().updateUser}
                onUpdateCompany={useStore().updateCompany}
             />
          ) : (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {activeTab === Tab.DASHBOARD && <Dashboard currentUser={currentUser!} />}
              {activeTab === Tab.LEADS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.NEW, LeadStatus.INSPECTION].includes(l.status))} viewMode="leads" users={users} currentUser={currentUser!} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
              {activeTab === Tab.CLAIMS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.CLAIM_FILED, LeadStatus.ADJUSTER_MEETING, LeadStatus.APPROVED, LeadStatus.SUPPLEMENTING].includes(l.status))} viewMode="claims" users={users} currentUser={currentUser!} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
              {activeTab === Tab.JOBS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.PRODUCTION, LeadStatus.CLOSED].includes(l.status))} viewMode="jobs" users={users} currentUser={currentUser!} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
              {activeTab === Tab.ESTIMATES && <Estimator leads={companyLeads} onSaveEstimate={(id, est) => { const lead = companyLeads.find(l => l.id === id); if(lead) updateLead({ ...lead, estimates: [...(lead.estimates||[]), est] }); }} />}
              {activeTab === Tab.CALENDAR && <CalendarView events={events} currentUser={currentUser!} onAddEvent={addEvent} />}
              {activeTab === Tab.TASKS && <TaskBoard tasks={tasks} currentUser={currentUser!} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />}
              {activeTab === Tab.INVOICES && <InvoiceSystem invoices={invoices} leads={companyLeads} currentUser={currentUser!} onCreateInvoice={createInvoice} onUpdateStatus={updateInvoiceStatus} />}
              {activeTab === Tab.PRICE_BOOK && <PriceBook items={[]} />}
              {activeTab === Tab.AI_RECEPTIONIST && <AIReceptionist />}
              {activeTab === Tab.AUTOMATIONS && <Automations />}
              {activeTab === Tab.TEAM && currentCompany && <TeamManagement company={currentCompany} users={users} onAddUser={addUser} onRemoveUser={removeUser} />}
            </div>
          )}
        </main>
      </div>
      <AIChat />
    </div>
  );
};

const App: React.FC = () => (
    <StoreProvider>
        <AppLayout />
    </StoreProvider>
)

export default App;