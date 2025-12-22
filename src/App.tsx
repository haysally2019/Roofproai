import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Menu, Bell, X, CheckCircle, AlertTriangle, Info, Zap, Loader2 } from 'lucide-react';

// Context
import { StoreProvider, useStore } from './lib/store';
// Direct import needed for password updates
import { supabase } from './lib/supabase'; 

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

// --- NEW COMPONENT: SET PASSWORD ---
const SetPassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Supabase session is already active from the invite link
        const { error } = await supabase.auth.updateUser({ password });
        
        if (error) {
            alert('Error: ' + error.message);
            setLoading(false);
        } else {
            // Redirect to dashboard on success
            window.location.href = '/dashboard'; 
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none"></div>

            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 relative z-10 animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Zap size={24} fill="currentColor"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Welcome to the Team</h2>
                    <p className="text-slate-500 text-sm mt-2">Please set a secure password to activate your account.</p>
                </div>
                
                <form onSubmit={handleSetPassword} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Password</label>
                        <input 
                            type="password" 
                            required 
                            minLength={6}
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main Layout ---
const AppLayout: React.FC = () => {
  const {
      currentUser, activeTab, companies, leads, events, tasks, invoices, users, notifications,
      updateLead, addLead, addToast, login, addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser, createCompany 
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const handleDraftEmail = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    try {
      const topic = `${lead.projectType} project at ${lead.address}`;
      const draft = await draftClientEmail(lead.name, topic, 'professional');
      addToast('Email draft generated successfully', 'success');
      return draft;
    } catch (error) {
      console.error('Email draft error:', error);
      addToast('Failed to generate email draft', 'error');
    }
  };

  // --- ROUTING LOGIC ---
  const path = window.location.pathname.toLowerCase().replace(/\/$/, ''); 
  const hash = window.location.hash.toLowerCase().replace('#', '').replace(/\/$/, ''); 
  const isOnboardingRoute = path === '/onboarding' || path === '/register' || hash === 'onboarding';

  // --- VIEW: SET PASSWORD (Invite Flow) ---
  if (path === '/set-password') {
      return <SetPassword />;
  }

  // --- VIEW: ONBOARDING FUNNEL ---
  if (isOnboardingRoute) {
      return (
         <>
             <ToastContainer />
             <TrialFunnel /> 
         </>
      )
  }

  // --- VIEW: LOGIN SCREEN ---
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
                     <h1 className="text-3xl font-bold text-white tracking-tight">RAFTER AI</h1>
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
                     <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                         <p className="text-sm text-slate-500">
                             New Roofing Company? 
                             <button onClick={() => window.location.href = '/onboarding'} className="ml-1 text-indigo-600 font-bold hover:underline">Start Free Trial</button>
                         </p>
                     </div>
                 </div>
                 
                 <div className="mt-8 text-center text-slate-500 text-xs">
                     &copy; 2025 Rafter AI Inc. • Privacy • Terms
                 </div>
             </div>
         </div>
      )
  }

  // --- VIEW: SETUP WIZARD ---
  const currentCompany = companies.find(c => c.id === currentUser.companyId);
  if (currentUser && currentCompany && !currentCompany.setupComplete) {
      return <div className="h-screen w-full bg-slate-50"><Onboarding /></div>;
  }

  // --- VIEW: DASHBOARD (Private) ---
  const companyLeads = leads || []; 

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <ToastContainer />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 -ml-2"><Menu size={24} /></button>
            <span className="font-bold text-slate-800 flex items-center gap-2"><Zap className="text-blue-600 fill-blue-600" size={20} /> Rafter AI</span>
            <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-600 relative p-2 -mr-2">
                <Bell size={24} /> {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth custom-scrollbar">
          {(() => {
            try {
              if ((currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SAAS_REP) && activeTab !== Tab.SETTINGS) {
                return (
                  <SuperAdminDashboard
                    view={activeTab}
                    companies={companies || []}
                    onAddCompany={createCompany}
                    onUpdateStatus={() => {}}
                    users={users || []}
                    onAddUser={addUser}
                    onRemoveUser={removeUser}
                    currentUser={currentUser}
                    softwareLeads={[]}
                    onAddSoftwareLead={() => {}}
                    onUpdateSoftwareLead={() => {}}
                  />
                );
              }

              if (activeTab === Tab.SETTINGS) {
                return (
                  <Settings
                    currentUser={currentUser}
                    company={currentCompany}
                    onUpdateUser={useStore().updateUser}
                    onUpdateCompany={useStore().updateCompany}
                  />
                );
              }

              return (
                <div className="max-w-7xl mx-auto h-full flex flex-col">
                  {activeTab === Tab.DASHBOARD && <Dashboard currentUser={currentUser} />}
                  {activeTab === Tab.LEADS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.NEW, LeadStatus.INSPECTION].includes(l.status))} viewMode="leads" users={users || []} currentUser={currentUser} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
                  {activeTab === Tab.CLAIMS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.CLAIM_FILED, LeadStatus.ADJUSTER_MEETING, LeadStatus.APPROVED, LeadStatus.SUPPLEMENTING].includes(l.status))} viewMode="claims" users={users || []} currentUser={currentUser} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
                  {activeTab === Tab.JOBS && <LeadBoard leads={companyLeads.filter(l => [LeadStatus.PRODUCTION, LeadStatus.CLOSED].includes(l.status))} viewMode="jobs" users={users || []} currentUser={currentUser} onDraftEmail={handleDraftEmail} onUpdateLead={updateLead} onAddLead={addLead}/>}
                  {activeTab === Tab.ESTIMATES && <Estimator leads={companyLeads} onSaveEstimate={(id, est) => { const lead = companyLeads.find(l => l.id === id); if(lead) updateLead({ ...lead, estimates: [...(lead.estimates||[]), est] }); }} />}
                  {activeTab === Tab.CALENDAR && <CalendarView events={events || []} currentUser={currentUser} onAddEvent={addEvent} />}
                  {activeTab === Tab.TASKS && <TaskBoard tasks={tasks || []} currentUser={currentUser} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />}
                  {activeTab === Tab.INVOICES && <InvoiceSystem invoices={invoices || []} leads={companyLeads} currentUser={currentUser} onCreateInvoice={createInvoice} onUpdateStatus={updateInvoiceStatus} />}
                  {activeTab === Tab.PRICE_BOOK && <PriceBook items={[]} />}
                  {activeTab === Tab.AI_RECEPTIONIST && <AIReceptionist />}
                  {activeTab === Tab.AUTOMATIONS && <Automations />}
                  {activeTab === Tab.TEAM && currentCompany && <TeamManagement company={currentCompany} users={users || []} onAddUser={addUser} onRemoveUser={removeUser} />}
                </div>
              );
            } catch (error) {
              console.error('Tab render error:', error);
              return (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-slate-200">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                    <p className="text-slate-600 mb-4">We encountered an error loading this view.</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                </div>
              );
            }
          })()}
        </main>
      </div>
      <AIChat />
    </div>
  );
};

// FIX: Wrapped App in BrowserRouter
const App: React.FC = () => (
    <BrowserRouter>
        <StoreProvider>
            <AppLayout />
        </StoreProvider>
    </BrowserRouter>
)

export default App;