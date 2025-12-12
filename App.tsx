
import React, { useState, useEffect } from 'react';
import { Menu, Bell, X, CheckCircle, AlertTriangle, Info, Hexagon, Hammer, ArrowRight, Loader2 } from 'lucide-react';

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
import Onboarding from './components/Onboarding';
import AIReceptionist from './components/AIReceptionist';
import Automations from './components/Automations';

// Types
import { LeadStatus, UserRole, Tab, Toast } from './types';
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
      currentUser, activeTab, companies, leads, events, tasks, invoices, users,
      updateLead, addLead, addToast, setTab, notifications, login, register, logout,
      addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  // Simulation State
  useEffect(() => {
    if (!currentUser) return;
    
    // Random "Live" events simulator
    const interval = setInterval(() => {
        const rand = Math.random();
        if (rand > 0.95) {
            addToast("New Web Lead: 124 Main St - Inspect Request", "info");
        } else if (rand > 0.98) {
            addToast("Weather Alert: Hail detected in Zip 75001", "error");
        }
    }, 45000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // --- Handlers ---
  const handleDraftEmail = async (lead: any) => {
    addToast("Generating email draft...", "info");
    await draftClientEmail(lead.name, "General Followup", "professional");
    addToast("Email drafted successfully", "success");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      try {
          if (authMode === 'login') {
              await login(authForm.email, authForm.password);
          } else {
              await register(authForm.companyName, authForm.name, authForm.email, authForm.password);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setAuthLoading(false);
      }
  };

  if (!currentUser) {
      // Login / Register Screen
      return (
         <div className="h-full w-full bg-slate-900 relative overflow-y-auto">
             <ToastContainer />
             {/* Background Decoration - Fixed so it doesn't scroll */}
             <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-600 blur-3xl opacity-20"></div>
                 <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-600 blur-3xl opacity-20"></div>
             </div>

             {/* Scrollable Content */}
             <div className="min-h-full flex items-center justify-center p-6 relative z-10">
                 <div className="w-full max-w-md">
                     <div className="text-center mb-8">
                         <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                                <Hexagon className="text-indigo-400 fill-indigo-400/20" size={40} strokeWidth={2} />
                                <Hammer className="absolute text-white" size={20} />
                            </div>
                         </div>
                         <h1 className="text-3xl font-bold text-white tracking-tight">RoofPro AI</h1>
                         <p className="text-slate-400 mt-2">The intelligent operating system for roofing.</p>
                     </div>

                     <div className="bg-white rounded-2xl p-8 shadow-2xl animate-fade-in">
                         <div className="flex justify-center mb-6 border-b border-slate-100 pb-1">
                             <button onClick={() => setAuthMode('login')} className={`px-4 py-2 font-medium text-sm transition-colors ${authMode === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Sign In</button>
                             <button onClick={() => setAuthMode('register')} className={`px-4 py-2 font-medium text-sm transition-colors ${authMode === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Create Account</button>
                         </div>

                         <form onSubmit={handleAuthSubmit} className="space-y-4">
                             {authMode === 'register' && (
                                 <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Company Name</label>
                                        <input 
                                            required 
                                            value={authForm.companyName} 
                                            onChange={e => setAuthForm({...authForm, companyName: e.target.value})}
                                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="Apex Roofing"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                                        <input 
                                            required 
                                            value={authForm.name} 
                                            onChange={e => setAuthForm({...authForm, name: e.target.value})}
                                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="John Doe"
                                        />
                                    </div>
                                 </>
                             )}
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                                <input 
                                    required type="email"
                                    value={authForm.email} 
                                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="name@company.com"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                                <input 
                                    required type="password"
                                    value={authForm.password} 
                                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="••••••••"
                                />
                             </div>

                             <button 
                                type="submit" 
                                disabled={authLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
                             >
                                {authLoading ? <Loader2 className="animate-spin"/> : (authMode === 'login' ? 'Sign In' : 'Start Free Trial')}
                             </button>
                         </form>
                         
                         <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                             <p className="text-xs text-slate-400">
                                 {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                                 <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="ml-1 text-indigo-600 font-bold hover:underline">
                                     {authMode === 'login' ? 'Sign Up' : 'Log In'}
                                 </button>
                             </p>
                         </div>
                     </div>
                     
                     <div className="mt-8 text-center pb-6">
                         <p className="text-xs text-slate-400">
                             Create a new account to get started with RoofPro AI
                         </p>
                     </div>
                 </div>
             </div>
         </div>
      )
  }

  // Check Onboarding
  const currentCompany = companies.find(c => c.id === currentUser.companyId);
  if (currentUser.role === UserRole.COMPANY_ADMIN && currentCompany && !currentCompany.setupComplete) {
      return (
          <>
              <ToastContainer />
              <Onboarding />
          </>
      );
  }

  const companyLeads = leads; // Already filtered by StoreContext for isolation

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <ToastContainer />
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10"></div>
        
        {/* Mobile Header - Sticky */}
        <div className="md:hidden sticky top-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 -ml-2">
                <Menu size={24} />
            </button>
            <span className="font-bold text-slate-800 flex items-center gap-2">
                <Hexagon className="text-indigo-600 fill-indigo-600/20" size={24} strokeWidth={2.5} />
                RoofPro
            </span>
            <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-600 relative p-2 -mr-2">
                <Bell size={24} />
                {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
        </div>

        {/* Mobile Notifications Overlay */}
        {showNotifications && (
            <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
                 <div className="absolute top-16 right-0 left-0 bg-white shadow-xl border-b border-slate-200 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-3 border-b border-slate-100 font-semibold text-slate-700 flex justify-between items-center bg-slate-50">
                        <span>Notifications</span>
                        <button onClick={() => setShowNotifications(false)}><X size={18} className="text-slate-400"/></button>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No new notifications</div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50">
                                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                                <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">{n.time}</p>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        )}

        {/* Desktop Notification Bell (Absolute) */}
        <div className="hidden md:block absolute top-4 right-8 z-30">
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-white rounded-full text-slate-600 shadow-sm border border-slate-200 hover:text-indigo-600 transition-colors"
            >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>
            
            {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in z-50">
                    <div className="p-3 border-b border-slate-100 font-semibold text-slate-700 flex justify-between items-center">
                        <span>Notifications</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.map(n => (
                            <div key={n.id} className="p-3 border-b border-slate-50 hover:bg-slate-50">
                                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                                <p className="text-xs text-slate-500">{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth custom-scrollbar">
          
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SAAS_REP) && activeTab !== Tab.SETTINGS ? (
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
                currentUser={currentUser}
                company={currentCompany}
                onUpdateUser={useStore().updateUser}
                onUpdateCompany={useStore().updateCompany}
             />
          ) : (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {activeTab === Tab.DASHBOARD && <Dashboard currentUser={currentUser} />}
              
              {activeTab === Tab.LEADS && (
                <LeadBoard 
                  leads={companyLeads.filter(l => [LeadStatus.NEW, LeadStatus.INSPECTION].includes(l.status))} 
                  viewMode="leads"
                  users={users.filter(u => u.companyId === currentUser.companyId)}
                  currentUser={currentUser}
                  onDraftEmail={handleDraftEmail} 
                  onUpdateLead={updateLead}
                  onAddLead={addLead}
                />
              )}

              {activeTab === Tab.CLAIMS && (
                 <LeadBoard 
                  leads={companyLeads.filter(l => [LeadStatus.CLAIM_FILED, LeadStatus.ADJUSTER_MEETING, LeadStatus.APPROVED, LeadStatus.SUPPLEMENTING].includes(l.status))} 
                  viewMode="claims"
                  users={users.filter(u => u.companyId === currentUser.companyId)}
                  currentUser={currentUser}
                  onDraftEmail={handleDraftEmail} 
                  onUpdateLead={updateLead}
                  onAddLead={addLead}
                />
              )}

              {activeTab === Tab.JOBS && (
                 <LeadBoard 
                  leads={companyLeads.filter(l => [LeadStatus.PRODUCTION, LeadStatus.CLOSED].includes(l.status))} 
                  viewMode="jobs"
                  users={users.filter(u => u.companyId === currentUser.companyId)}
                  currentUser={currentUser}
                  onDraftEmail={handleDraftEmail} 
                  onUpdateLead={updateLead}
                  onAddLead={addLead}
                />
              )}

              {activeTab === Tab.ESTIMATES && (
                 <Estimator 
                    leads={companyLeads} 
                    onSaveEstimate={(id, est) => {
                       const lead = companyLeads.find(l => l.id === id);
                       if(lead) {
                           updateLead({ ...lead, estimates: [...(lead.estimates||[]), est] });
                       }
                    }}
                 />
              )}
              
              {activeTab === Tab.CALENDAR && (
                 <CalendarView 
                    events={events} 
                    currentUser={currentUser}
                    onAddEvent={addEvent}
                 />
              )}
              
              {activeTab === Tab.TASKS && (
                 <TaskBoard 
                    tasks={tasks} 
                    currentUser={currentUser}
                    onAddTask={addTask}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                 />
              )}

              {activeTab === Tab.INVOICES && (
                  <InvoiceSystem 
                      invoices={invoices} 
                      leads={companyLeads}
                      currentUser={currentUser}
                      onCreateInvoice={createInvoice}
                      onUpdateStatus={updateInvoiceStatus}
                  />
              )}

              {activeTab === Tab.PRICE_BOOK && (
                  <PriceBook items={[]} />
              )}
              
              {activeTab === Tab.AI_RECEPTIONIST && (
                  <AIReceptionist />
              )}

              {activeTab === Tab.AUTOMATIONS && (
                  <Automations />
              )}

              {activeTab === Tab.TEAM && currentCompany && (
                <TeamManagement
                  company={currentCompany}
                  users={users.filter(u => u.companyId === currentUser.companyId)}
                  onAddUser={addUser}
                  onRemoveUser={removeUser}
                />
              )}
            </div>
          )}
        </main>
      </div>

      <AIChat />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <StoreProvider>
            <AppLayout />
        </StoreProvider>
    )
}

export default App;
