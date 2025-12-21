import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Company, Lead, CalendarEvent, Task, Invoice,
  Notification, UserRole, SubscriptionTier, LeadStatus, Tab, Toast,
  CallLog, AgentConfig, AutomationRule,
  Supplier, MaterialOrder, SoftwareLead
} from '../types';
import { supabase } from './supabase';
import { SUBSCRIPTION_PLANS } from './constants'; // Import constants

interface StoreContextType {
  currentUser: User | null;
  activeTab: Tab;
  companies: Company[];
  users: User[];
  leads: Lead[];
  softwareLeads: SoftwareLead[];
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
  register: (companyName: string, name: string, email: string, password: string, referralCode?: string | null) => Promise<boolean>;
  logout: () => void;
  setTab: (tab: Tab) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  updateLead: (lead: Lead) => void;
  addLead: (lead: Lead) => void;
  createCompany: (company: Partial<Company>) => Promise<string | null>;
  updateCompany: (company: Partial<Company>) => void;
  deleteCompany: (companyId: string) => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
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
  addUser: (user: Partial<User>) => Promise<string | null>;
  removeUser: (userId: string) => Promise<void>;
  addSoftwareLead: (lead: SoftwareLead) => void;
  updateSoftwareLead: (lead: SoftwareLead) => void;
  deleteSoftwareLead: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};

// Helper to get max users from tier name
const getMaxUsersForTier = (tierName: string): number => {
  const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.name === tierName);
  return plan ? plan.maxUsers : 3; // Default to 3 if unknown
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Core State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [loading, setLoading] = useState(true);

  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [softwareLeads, setSoftwareLeads] = useState<SoftwareLead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addToast = (message: string, type: Toast['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const loadUserProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, companies!users_company_id_fkey(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const user: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          companyId: data.company_id,
          avatarInitials: data.avatar_initials || data.name.slice(0, 2).toUpperCase()
        };
        setCurrentUser(user);

        if (user.role === UserRole.SUPER_ADMIN) {
            const [companiesRes, usersRes] = await Promise.all([
                supabase.from('companies').select('*').order('created_at', { ascending: false }),
                supabase.from('users').select('*').order('created_at', { ascending: false })
            ]);

            if (companiesRes.data) {
                setCompanies(companiesRes.data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    tier: c.tier as SubscriptionTier,
                    userCount: c.user_count,
                    maxUsers: c.max_users,
                    status: c.status,
                    renewalDate: c.renewal_date,
                    address: c.address,
                    logoUrl: c.logo_url,
                    setupComplete: c.setup_complete,
                    phone: c.phone,
                    agentConfig: c.agent_config,
                    integrations: c.integrations
                })));
            }

            if (usersRes.data) {
                setUsers(usersRes.data.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role as UserRole,
                    companyId: u.company_id,
                    avatarInitials: u.avatar_initials || u.name.slice(0, 2).toUpperCase()
                })));
            }
            
            // ... (Mock SaaS Leads logic) ...
             if (softwareLeads.length === 0) {
                setSoftwareLeads([
                  { id: 'sl-1', companyName: 'Apex Roofing', contactName: 'John Smith', email: 'john@apex.com', phone: '555-0101', status: 'Demo Booked', potentialUsers: 5, assignedTo: user.id, notes: 'Interested in AI', createdAt: new Date().toISOString() },
                  { id: 'sl-2', companyName: 'Best Top Roofs', contactName: 'Sarah Lee', email: 'sarah@besttop.com', phone: '555-0102', status: 'Prospect', potentialUsers: 12, assignedTo: user.id, notes: 'Cold outreach', createdAt: new Date().toISOString() },
                ]);
            }

        } else {
            if (data.companies) {
              const company: Company = {
                id: data.companies.id,
                name: data.companies.name,
                tier: data.companies.tier as SubscriptionTier,
                userCount: data.companies.user_count,
                maxUsers: data.companies.max_users,
                status: data.companies.status,
                renewalDate: data.companies.renewal_date,
                address: data.companies.address,
                logoUrl: data.companies.logo_url,
                setupComplete: data.companies.setup_complete,
                phone: data.companies.phone,
                agentConfig: data.companies.agent_config,
                integrations: data.companies.integrations
              };
              setCompanies([company]);
            }

            if (data.company_id) {
              await loadCompanyData(data.company_id);
            }
        }
      } else if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadUserProfile(userId, retryCount + 1);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      addToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ... (loadCompanyData logic remains the same) ...
  const loadCompanyData = async (companyId: string) => {
    try {
      const [
        usersRes,
        leadsRes,
        tasksRes,
        eventsRes,
        invoicesRes,
        callLogsRes,
        automationsRes,
        ordersRes
      ] = await Promise.all([
        supabase.from('users').select('*').eq('company_id', companyId),
        supabase.from('leads').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('events').select('*').eq('company_id', companyId).order('start_time', { ascending: true }),
        supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('automations').select('*').eq('company_id', companyId),
        supabase.from('material_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          companyId: user.company_id,
          avatarInitials: user.avatar_initials || user.name.slice(0, 2).toUpperCase()
        })));
      }
      
      // ... (Other data loading logic remains the same) ...
      if (leadsRes.data) {
        setLeads(leadsRes.data.map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          address: lead.address || '',
          phone: lead.phone || '',
          email: lead.email || '',
          status: lead.status as LeadStatus,
          projectType: lead.project_type || 'Unknown',
          source: lead.source,
          notes: lead.notes || '',
          estimatedValue: lead.estimated_value || 0,
          lastContact: lead.last_contact || '',
          assignedTo: lead.assigned_to,
          companyId: lead.company_id,
          createdAt: lead.created_at,
          insuranceCarrier: lead.insurance_carrier,
          policyNumber: lead.policy_number,
          claimNumber: lead.claim_number,
          adjusterName: lead.adjuster_name,
          adjusterPhone: lead.adjuster_phone,
          damageDate: lead.damage_date,
          projectManagerId: lead.project_manager_id,
          productionDate: lead.production_date,
          paymentStatus: lead.payment_status,
          documents: lead.documents || [],
          productionSteps: lead.production_steps || [],
          history: lead.history || [],
          estimates: []
        })));
      }

      if (tasksRes.data) {
        setTasks(tasksRes.data.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assigned_to,
          relatedLeadId: task.related_lead_id,
          companyId: task.company_id
        })));
      }

      if (eventsRes.data) {
        setEvents(eventsRes.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          type: event.type,
          leadId: event.lead_id,
          assignedTo: event.assigned_to,
          companyId: event.company_id,
          color: event.type === 'Meeting' ? '#3b82f6' : event.type === 'Inspection' ? '#10b981' : event.type === 'Install' ? '#f59e0b' : '#ef4444'
        })));
      }

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data.map((invoice: any) => ({
          id: invoice.id,
          number: invoice.number,
          leadName: invoice.lead_id,
          status: invoice.status,
          dateIssued: invoice.date_issued,
          dateDue: invoice.date_due,
          items: invoice.items || [],
          subtotal: invoice.subtotal || 0,
          tax: invoice.tax || 0,
          total: invoice.total || 0
        })));
      }

      if (callLogsRes.data) {
        setCallLogs(callLogsRes.data.map((log: any) => ({
          id: log.id,
          callerNumber: log.caller_number,
          callerName: log.caller_name || '',
          duration: log.duration || '',
          status: log.status,
          transcript: log.transcript || '',
          summary: log.summary || '',
          recordingUrl: log.recording_url || '',
          sentiment: log.sentiment || 'Neutral',
          timestamp: log.created_at
        })));
      }

      if (automationsRes.data) {
        setAutomations(automationsRes.data.map((auto: any) => ({
          id: auto.id,
          name: auto.name,
          active: auto.active,
          trigger: { type: auto.trigger_type, value: auto.trigger_value },
          action: { type: auto.action_type, config: auto.action_config || {} }
        })));
      }

      if (ordersRes.data) {
        setOrders(ordersRes.data.map((order: any) => ({
          id: order.id,
          poNumber: order.po_number,
          supplierId: order.supplier_id || '',
          leadId: order.lead_id,
          status: order.status,
          dateOrdered: order.created_at,
          deliveryDate: order.delivery_date,
          items: order.items || [],
          instructions: order.instructions || ''
        })));
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      addToast('Error loading data', 'error');
    }
  };

  // ... (Login Logic) ...
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { addToast(error.message, "error"); return false; }
      return !!data.user;
    } catch (error: any) {
      addToast(error.message || "Login failed", "error");
      return false;
    }
  };

  const register = async (companyName: string, name: string, email: string, password: string, referralCode?: string | null): Promise<boolean> => {
    try {
      if (password.length < 6) { addToast('Password must be at least 6 characters long', "error"); return false; }
      
      let referrerId = null;
      if (referralCode) {
        const { data: resolvedId, error: resolveError } = await supabase.rpc('resolve_referral_code', { code: referralCode });
        if (!resolveError && resolvedId) {
            referrerId = resolvedId;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { addToast(`Registration failed: ${authError.message}`, "error"); return false; }
      if (!authData.user) return false;

      // Ensure max_users is set correctly based on 'Starter' tier default
      const { data: companyData, error: companyError } = await supabase.from('companies').insert({
          name: companyName, 
          tier: 'Starter', 
          status: 'Active', 
          setup_complete: false,
          max_users: getMaxUsersForTier('Starter'), // Set correct limit
          referred_by_user_id: referrerId
        }).select().single();
      
      if (companyError) { addToast(companyError.message, "error"); return false; }

      const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id, name, email, role: 'Company Owner', company_id: companyData.id,
          avatar_initials: name.slice(0, 2).toUpperCase()
        });
      if (userError) { addToast(userError.message, "error"); return false; }

      return true;
    } catch (error: any) {
      addToast(error.message || "Registration failed", "error");
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setLeads([]);
    setTasks([]);
    setEvents([]);
    setInvoices([]);
    setCallLogs([]);
    setAutomations([]);
    setOrders([]);
    setCompanies([]);
    setUsers([]);
    setSoftwareLeads([]);
  };

  const setTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createCompany = async (c: Partial<Company>): Promise<string | null> => {
      if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) return null;
      
      const tier = c.tier || 'Starter';
      const maxUsers = getMaxUsersForTier(tier as string);

      const { data, error } = await supabase.from('companies').insert({
          name: c.name,
          tier: tier,
          max_users: maxUsers, // Set correct limit
          address: c.address,
          phone: c.phone,
          status: 'Active',
          setup_complete: false
      }).select().single();

      if (error) {
          addToast(`Failed to create company: ${error.message}`, 'error');
          return null;
      }

      const newCompany: Company = {
        id: data.id,
        name: data.name,
        tier: data.tier as SubscriptionTier,
        userCount: 0,
        maxUsers: data.max_users,
        status: data.status,
        renewalDate: data.renewal_date,
        address: data.address,
        logoUrl: data.logo_url,
        setupComplete: data.setup_complete,
        phone: data.phone,
        agentConfig: data.agent_config,
        integrations: data.integrations
      };

      setCompanies(prev => [newCompany, ...prev]);
      addToast('Company onboarded successfully', 'success');
      return data.id;
  };

  const updateCompany = async (c: Partial<Company>) => {
    if (!c.id) return;
    
    // Prepare update object
    const updates: any = {
        name: c.name, address: c.address, phone: c.phone, logo_url: c.logoUrl,
        setup_complete: c.setupComplete, agent_config: c.agentConfig, integrations: c.integrations,
        status: c.status, tier: c.tier
    };

    // If tier is changing, update max_users
    if (c.tier) {
        updates.max_users = getMaxUsersForTier(c.tier);
    }

    const { error } = await supabase.from('companies').update(updates).eq('id', c.id);
    
    if (error) {
        addToast(`Failed to update company: ${error.message}`, 'error');
        return;
    }
    
    // Update local state, including new maxUsers if derived from tier
    setCompanies(prev => prev.map(x => x.id === c.id ? {...x, ...c, maxUsers: c.tier ? updates.max_users : x.maxUsers } : x));
  };

  // ... (Delete Company, Update User, Add Lead, etc. remain the same) ...
  const deleteCompany = async (companyId: string) => {
      if (currentUser?.role !== UserRole.SUPER_ADMIN) {
          addToast("Permission denied", "error");
          return;
      }
      const { error } = await supabase.from('companies').delete().eq('id', companyId);
      if (error) {
          addToast(`Failed to delete company: ${error.message}`, 'error');
          return;
      }
      setCompanies(prev => prev.filter(c => c.id !== companyId));
      setUsers(prev => prev.filter(u => u.companyId !== companyId));
      addToast('Company and all associated data deleted', 'success');
  };

  const updateUser = async (u: Partial<User>) => {
    const targetId = u.id || currentUser?.id;
    if (!targetId) return;
    const { error } = await supabase.from('users').update({ name: u.name, role: u.role, email: u.email }).eq('id', targetId);
    if (error) {
        addToast(`Failed to update user: ${error.message}`, 'error');
        return;
    }
    setUsers(prev => prev.map(user => user.id === targetId ? { ...user, ...u } : user));
    if (currentUser && targetId === currentUser.id) {
        setCurrentUser(prev => prev ? { ...prev, ...u } : null);
    }
    addToast('User updated successfully', 'success');
  };

  const addLead = async (lead: Lead) => {
    if (!currentUser?.companyId) return;
    const { error } = await supabase.from('leads').insert({
      id: lead.id, name: lead.name, address: lead.address, phone: lead.phone, email: lead.email,
      status: lead.status, project_type: lead.projectType, source: lead.source, notes: lead.notes,
      estimated_value: lead.estimatedValue, last_contact: lead.lastContact, assigned_to: lead.assignedTo,
      company_id: currentUser.companyId, insurance_carrier: lead.insuranceCarrier, policy_number: lead.policyNumber,
      claim_number: lead.claimNumber, adjuster_name: lead.adjusterName, adjuster_phone: lead.adjusterPhone,
      damage_date: lead.damageDate
    });
    if (!error) setLeads(prev => [...prev, lead]);
  };

  const updateLead = async (lead: Lead) => {
    const { error } = await supabase.from('leads').update({
      name: lead.name, address: lead.address, phone: lead.phone, email: lead.email, status: lead.status,
      project_type: lead.projectType, source: lead.source, notes: lead.notes, estimated_value: lead.estimatedValue,
      last_contact: lead.lastContact, assigned_to: lead.assignedTo, insurance_carrier: lead.insuranceCarrier,
      policy_number: lead.policyNumber, claim_number: lead.claimNumber, adjuster_name: lead.adjusterName,
      adjuster_phone: lead.adjusterPhone, damage_date: lead.damageDate, project_manager_id: lead.projectManagerId,
      production_date: lead.productionDate, payment_status: lead.paymentStatus
    }).eq('id', lead.id);
    if (!error) setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
  };

  const addTask = async (task: Partial<Task>) => {
    if (!currentUser?.companyId) return;
    const newTask = { ...task, id: Date.now().toString(), companyId: currentUser.companyId };
    const { error } = await supabase.from('tasks').insert({
      id: newTask.id, title: newTask.title, description: newTask.description, due_date: newTask.dueDate,
      priority: newTask.priority, status: newTask.status || 'To Do', assigned_to: newTask.assignedTo,
      related_lead_id: newTask.relatedLeadId, company_id: currentUser.companyId
    });
    if (!error) setTasks(prev => [...prev, newTask as Task]);
  };

  const updateTask = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({
      title: task.title, description: task.description, due_date: task.dueDate, priority: task.priority,
      status: task.status, assigned_to: task.assignedTo, related_lead_id: task.relatedLeadId
    }).eq('id', task.id);
    if (!error) setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addEvent = async (event: Partial<CalendarEvent>) => {
    if (!currentUser?.companyId) return;
    const newEvent = { ...event, id: Date.now().toString(), companyId: currentUser.companyId, color: '#3b82f6' };
    const { error } = await supabase.from('events').insert({
      id: newEvent.id, title: newEvent.title, start_time: newEvent.start, end_time: newEvent.end,
      type: newEvent.type, lead_id: newEvent.leadId, assigned_to: newEvent.assignedTo, company_id: currentUser.companyId
    });
    if (!error) setEvents(prev => [...prev, newEvent as CalendarEvent]);
  };

  const createInvoice = async (invoice: Invoice) => {
    if (!currentUser?.companyId) return;
    const { error } = await supabase.from('invoices').insert({
      id: invoice.id, number: invoice.number, lead_id: invoice.leadName, status: invoice.status,
      date_issued: invoice.dateIssued, date_due: invoice.dateDue, items: invoice.items, subtotal: invoice.subtotal,
      tax: invoice.tax, total: invoice.total, company_id: currentUser.companyId
    });
    if (!error) setInvoices(prev => [...prev, invoice]);
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (!error) setInvoices(prev => prev.map(i => i.id === id ? {...i, status} : i));
  };

  const addAutomation = async (r: AutomationRule) => {
    if (!currentUser?.companyId) return;
    const { error } = await supabase.from('automations').insert({
      id: r.id, name: r.name, active: r.active, trigger_type: r.trigger.type, trigger_value: r.trigger.value,
      action_type: r.action.type, action_config: r.action.config, company_id: currentUser.companyId
    });
    if (!error) setAutomations(prev => [...prev, r]);
  };

  const toggleAutomation = async (id: string) => {
    const auto = automations.find(a => a.id === id);
    if (!auto) return;
    const { error } = await supabase.from('automations').update({ active: !auto.active }).eq('id', id);
    if (!error) setAutomations(prev => prev.map(a => a.id === id ? {...a, active: !a.active} : a));
  };

  const deleteAutomation = async (id: string) => {
    const { error } = await supabase.from('automations').delete().eq('id', id);
    if (!error) setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const addOrder = async (o: MaterialOrder) => {
    if (!currentUser?.companyId) return;
    const { error } = await supabase.from('material_orders').insert({
      id: o.id, po_number: o.poNumber, supplier_id: o.supplierId, lead_id: o.leadId, status: o.status,
      delivery_date: o.deliveryDate, items: o.items, instructions: o.instructions, company_id: currentUser.companyId
    });
    if (!error) setOrders(prev => [...prev, o]);
  };

  // --- UPDATED ADD USER LOGIC (Uses Edge Function + Checks Limit) ---
  const addUser = async (u: Partial<User>): Promise<string | null> => {
    const targetCompanyId = u.companyId || currentUser?.companyId;

    if (!targetCompanyId && currentUser?.role !== UserRole.SUPER_ADMIN) {
        addToast("Cannot create user without an organization.", "error"); 
        return null; 
    }

    // 1. Check Limits (if not Super Admin adding a super admin)
    if (currentUser?.role !== UserRole.SUPER_ADMIN || (u.role !== UserRole.SUPER_ADMIN && u.role !== UserRole.SAAS_REP)) {
        const company = companies.find(c => c.id === targetCompanyId);
        if (company) {
            const currentCount = users.filter(user => user.companyId === company.id).length;
            if (currentCount >= company.maxUsers) {
                addToast(`Limit Reached: Your ${company.tier} plan only allows ${company.maxUsers} users. Please upgrade.`, "error");
                return null;
            }
        }
    }

    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!"; 

    try {
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email: u.email,
                password: tempPassword,
                name: u.name,
                role: u.role,
                companyId: targetCompanyId || null,
                avatarInitials: u.name?.slice(0, 2).toUpperCase()
            }
        });

        if (error) {
            console.error(error);
            throw new Error(error.message || "Unknown error calling create-user");
        }

        const newUser: User = {
            id: data.user.id,
            name: u.name!,
            email: u.email!,
            role: u.role!,
            companyId: targetCompanyId || null,
            avatarInitials: u.name?.slice(0, 2).toUpperCase() || 'NA'
        };
        
        setUsers(prev => [newUser, ...prev]);
        // Update user count in local company state to reflect new addition immediately
        if (targetCompanyId) {
            setCompanies(prev => prev.map(c => c.id === targetCompanyId ? { ...c, userCount: c.userCount + 1 } : c));
        }

        addToast('User created successfully', 'success');
        return tempPassword;

    } catch (error: any) {
        addToast(`Failed to create user: ${error.message}`, 'error');
        return null;
    }
  };

  const removeUser = async (uid: string) => {
    // Find user to get company ID before deletion
    const userToRemove = users.find(u => u.id === uid);
    const { error } = await supabase.from('users').delete().eq('id', uid);
    if (!error) {
        setUsers(prev => prev.filter(u => u.id !== uid));
        // Update local company user count
        if (userToRemove?.companyId) {
            setCompanies(prev => prev.map(c => c.id === userToRemove.companyId ? { ...c, userCount: Math.max(0, c.userCount - 1) } : c));
        }
    }
  };

  const addSoftwareLead = (lead: SoftwareLead) => {
      setSoftwareLeads(prev => [...prev, lead]);
      addToast('Lead added successfully', 'success');
  };

  const updateSoftwareLead = (lead: SoftwareLead) => {
      setSoftwareLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
  };

  const deleteSoftwareLead = (id: string) => {
      setSoftwareLeads(prev => prev.filter(l => l.id !== id));
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const safeValue: StoreContextType = {
      currentUser, activeTab,
      companies: companies || [],
      users: users || [],
      leads: leads || [],
      softwareLeads: softwareLeads || [],
      events: events || [],
      tasks: tasks || [],
      invoices: invoices || [],
      toasts: toasts || [],
      notifications: notifications || [],
      callLogs: callLogs || [],
      automations: automations || [],
      suppliers: suppliers || [],
      orders: orders || [],
      login, register, logout, setTab, addToast, removeToast,
      updateLead, addLead, createCompany, updateCompany, deleteCompany, updateUser,
      addAutomation, toggleAutomation, deleteAutomation, addOrder,
      addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser,
      addSoftwareLead, updateSoftwareLead, deleteSoftwareLead
  };

  return <StoreContext.Provider value={safeValue}>{children}</StoreContext.Provider>;
};