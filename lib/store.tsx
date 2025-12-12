
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  User, Company, Lead, CalendarEvent, Task, Invoice, 
  Notification, UserRole, SubscriptionTier, LeadStatus, Tab, Toast,
  CallLog, AgentConfig, AutomationRule,
  Supplier, MaterialOrder
} from '../types';

// --- MOCK CONSTANTS ---
const DEFAULT_AGENT_CONFIG: AgentConfig = {
    id: 'ag-1',
    elevenLabsAgentId: 'E1_abcdef123456',
    elevenLabsApiKey: 'sk_1234567890abcdef',
    voiceId: 'Sarah_Professional',
    name: 'Sarah (Receptionist)',
    firstMessage: "Thank you for calling. How can I help you today?",
    systemPrompt: "You are a helpful roofing receptionist.",
    isActive: true
};

const MOCK_COMPANIES: Company[] = [
  { 
      id: 'c1', name: 'Apex Restoration (Demo)', tier: SubscriptionTier.PROFESSIONAL, userCount: 4, maxUsers: 10, status: 'Active', 
      renewalDate: '2024-12-01', address: '123 Apex Way, Austin TX', setupComplete: true, phone: '(555) 123-4567',
      agentConfig: { ...DEFAULT_AGENT_CONFIG },
      integrations: { quickbooks: { isConnected: false, autoSync: false } }
  }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Demo User', email: 'demo@roofpro.app', password: 'password', role: UserRole.COMPANY_ADMIN, companyId: 'c1', avatarInitials: 'DU' },
];

const MOCK_LEADS: Lead[] = [
  { 
      id: '1', name: 'Robert Martinez', address: '123 Oak St', phone: '555-0199', status: LeadStatus.INSPECTION, 
      projectType: 'Insurance', estimatedValue: 15000, notes: 'Wind damage.', lastContact: 'Today', assignedTo: 'u1', companyId: 'c1',
      source: 'Door Knocking', createdAt: '2024-10-25', estimates: [], history: []
  }
];

interface StoreContextType {
  currentUser: User | null;
  activeTab: Tab;
  companies: Company[];
  users: User[];
  leads: Lead[];
  events: CalendarEvent[];
  tasks: Task[];
  invoices: Invoice[];
  toasts: Toast[];
  notifications: Notification[];
  callLogs: CallLog[];
  automations: AutomationRule[];
  suppliers: Supplier[];
  orders: MaterialOrder[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (companyName: string, name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTab: (tab: Tab) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  updateLead: (lead: Lead) => void;
  addLead: (lead: Lead) => void;
  updateCompany: (company: Partial<Company>) => void;
  updateUser: (user: Partial<User>) => void;
  addAutomation: (rule: AutomationRule) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  addOrder: (order: MaterialOrder) => void;
  addTask: (task: Partial<Task>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addEvent: (event: Partial<CalendarEvent>) => void;
  createInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Local-only state
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 'sup-1', name: 'ABC Supply Co.', email: 'orders@abcsupply.com', color: '#0054a4', logo: 'ABC' },
    { id: 'sup-2', name: 'Beacon Building Products', email: 'orders@becn.com', color: '#c8102e', logo: 'BECN' },
  ]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- ACTIONS ---

  const login = async (email: string, pass: string): Promise<boolean> => {
    // Local simulation
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) { 
        setCurrentUser(user); 
        return true; 
    }
    // Super Admin Backdoor
    if (email === 'admin@roofpro.app' && pass === 'password') {
        const admin: User = { id: 'admin', name: 'Super Admin', email, role: UserRole.SUPER_ADMIN, companyId: null, avatarInitials: 'SA' };
        setCurrentUser(admin);
        return true;
    }
    addToast("Invalid credentials", "error");
    return false;
  };

  const register = async (companyName: string, name: string, email: string, password: string): Promise<boolean> => {
    // Local simulation
    const newUser: User = { id: `u-${Date.now()}`, name, email, password, role: UserRole.COMPANY_ADMIN, companyId: 'c1', avatarInitials: name.slice(0,2).toUpperCase() };
    // In a real app we would create a new company ID here too
    setCurrentUser(newUser);
    return true;
  };

  const logout = async () => {
    setCurrentUser(null);
    setLeads(MOCK_LEADS);
    window.location.reload();
  };

  // --- ENTITY CRUD HANDLERS ---
  
  const updateCompany = (c: Partial<Company>) => {
      setCompanies(prev => prev.map(x => x.id === c.id ? {...x, ...c} : x));
  };

  const updateUser = (u: Partial<User>) => {
      setCurrentUser(prev => prev ? {...prev, ...u} : null);
  };

  const addLead = (lead: Lead) => {
      const newLead = { ...lead, id: Date.now().toString() };
      setLeads(prev => [newLead, ...prev]);
      addToast('Lead saved (Local)', 'success');
  };

  const updateLead = (lead: Lead) => {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
  };

  const addTask = (task: Partial<Task>) => {
      setTasks(prev => [...prev, { ...task, id: Date.now().toString() } as Task]);
  };

  const updateTask = (task: Task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const deleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addEvent = (event: Partial<CalendarEvent>) => {
      setEvents(prev => [...prev, { ...event, id: Date.now().toString() } as CalendarEvent]);
  };

  const createInvoice = (invoice: Invoice) => {
      setInvoices(prev => [invoice, ...prev]);
      addToast("Invoice created (Local)", "success");
  };

  const updateInvoiceStatus = (id: string, status: Invoice['status']) => {
      setInvoices(prev => prev.map(i => i.id === id ? {...i, status} : i));
  };

  // Helpers
  const addToast = (message: string, type: Toast['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  
  const setTab = (tab: Tab) => setActiveTab(tab);
  const addAutomation = (r: AutomationRule) => setAutomations(prev => [...prev, r]);
  const toggleAutomation = (id: string) => setAutomations(prev => prev.map(a => a.id === id ? {...a, active: !a.active} : a));
  const deleteAutomation = (id: string) => setAutomations(prev => prev.filter(a => a.id !== id));
  const addOrder = (o: MaterialOrder) => setOrders(prev => [o, ...prev]);

  return (
    <StoreContext.Provider value={{
      currentUser, activeTab, companies, users, leads, events, tasks, invoices, 
      toasts, notifications, callLogs, automations, suppliers, orders,
      login, register, logout, setTab, addToast, removeToast, updateLead, addLead, 
      updateCompany, updateUser, addAutomation, toggleAutomation, deleteAutomation, addOrder,
      addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus
    }}>
      {children}
    </StoreContext.Provider>
  );
};
