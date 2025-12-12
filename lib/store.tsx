
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Company, Lead, CalendarEvent, Task, Invoice,
  Notification, UserRole, SubscriptionTier, LeadStatus, Tab, Toast,
  CallLog, AgentConfig, AutomationRule,
  Supplier, MaterialOrder
} from '../types';
import { supabase } from './supabase';

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
  addUser: (user: Partial<User>) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
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

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, companies(*)')
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
    } catch (error) {
      console.error('Error loading user profile:', error);
      addToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        const mappedUsers: User[] = usersRes.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          companyId: user.company_id,
          avatarInitials: user.avatar_initials || user.name.slice(0, 2).toUpperCase()
        }));
        setUsers(mappedUsers);
      }

      if (leadsRes.data) {
        const mappedLeads: Lead[] = leadsRes.data.map((lead: any) => ({
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
        }));
        setLeads(mappedLeads);
      }

      if (tasksRes.data) {
        const mappedTasks: Task[] = tasksRes.data.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assigned_to,
          relatedLeadId: task.related_lead_id,
          companyId: task.company_id
        }));
        setTasks(mappedTasks);
      }

      if (eventsRes.data) {
        const mappedEvents: CalendarEvent[] = eventsRes.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          type: event.type,
          leadId: event.lead_id,
          assignedTo: event.assigned_to,
          companyId: event.company_id,
          color: event.type === 'Meeting' ? '#3b82f6' : event.type === 'Inspection' ? '#10b981' : event.type === 'Install' ? '#f59e0b' : '#ef4444'
        }));
        setEvents(mappedEvents);
      }

      if (invoicesRes.data) {
        const mappedInvoices: Invoice[] = invoicesRes.data.map((invoice: any) => ({
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
        }));
        setInvoices(mappedInvoices);
      }

      if (callLogsRes.data) {
        const mappedCallLogs: CallLog[] = callLogsRes.data.map((log: any) => ({
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
        }));
        setCallLogs(mappedCallLogs);
      }

      if (automationsRes.data) {
        const mappedAutomations: AutomationRule[] = automationsRes.data.map((auto: any) => ({
          id: auto.id,
          name: auto.name,
          active: auto.active,
          trigger: {
            type: auto.trigger_type,
            value: auto.trigger_value
          },
          action: {
            type: auto.action_type,
            config: auto.action_config || {}
          }
        }));
        setAutomations(mappedAutomations);
      }

      if (ordersRes.data) {
        const mappedOrders: MaterialOrder[] = ordersRes.data.map((order: any) => ({
          id: order.id,
          poNumber: order.po_number,
          supplierId: order.supplier_id || '',
          leadId: order.lead_id,
          status: order.status,
          dateOrdered: order.created_at,
          deliveryDate: order.delivery_date,
          items: order.items || [],
          instructions: order.instructions || ''
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      addToast('Error loading data', 'error');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- ACTIONS ---

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        addToast(error.message, "error");
        return false;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      addToast(error.message || "Login failed", "error");
      return false;
    }
  };

  const register = async (companyName: string, name: string, email: string, password: string): Promise<boolean> => {
    try {
      if (password.length < 6) {
        addToast('Password must be at least 6 characters long', "error");
        return false;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('already registered') || authError.message.includes('user_already_exists')) {
          addToast('This email is already registered. Please log in instead.', "error");
        } else {
          addToast(`Registration failed: ${authError.message}`, "error");
        }
        return false;
      }

      if (!authData.user) {
        addToast("Registration failed - no user returned", "error");
        return false;
      }

      console.log('User created in auth, creating company...');

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          tier: 'Starter',
          status: 'Active',
          setup_complete: false
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company error:', companyError);
        addToast(`Company error: ${companyError.message}`, "error");
        return false;
      }

      console.log('Company created, creating user profile...');

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name,
          email,
          role: 'Company Owner',
          company_id: companyData.id,
          avatar_initials: name.slice(0, 2).toUpperCase()
        });

      if (userError) {
        console.error('User profile error:', userError);
        addToast(`User profile error: ${userError.message}`, "error");
        return false;
      }

      await loadUserProfile(authData.user.id);
      addToast("Account created successfully", "success");
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
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
  };

  // --- ENTITY CRUD HANDLERS ---

  const updateCompany = async (c: Partial<Company>) => {
    try {
      if (!c.id) {
        addToast('Company ID is required', 'error');
        return;
      }

      const updateData: any = {};
      if (c.name !== undefined) updateData.name = c.name;
      if (c.tier !== undefined) updateData.tier = c.tier;
      if (c.status !== undefined) updateData.status = c.status;
      if (c.address !== undefined) updateData.address = c.address;
      if (c.phone !== undefined) updateData.phone = c.phone;
      if (c.logoUrl !== undefined) updateData.logo_url = c.logoUrl;
      if (c.setupComplete !== undefined) updateData.setup_complete = c.setupComplete;
      if (c.agentConfig !== undefined) updateData.agent_config = c.agentConfig;
      if (c.integrations !== undefined) updateData.integrations = c.integrations;

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', c.id);

      if (error) throw error;

      setCompanies(prev => prev.map(x => x.id === c.id ? {...x, ...c} : x));
      addToast('Company updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating company:', error);
      addToast(error.message || 'Failed to update company', 'error');
    }
  };

  const updateUser = async (u: Partial<User>) => {
    try {
      if (!currentUser?.id) {
        addToast('User ID is required', 'error');
        return;
      }

      const updateData: any = {};
      if (u.name !== undefined) updateData.name = u.name;
      if (u.email !== undefined) updateData.email = u.email;
      if (u.avatarInitials !== undefined) updateData.avatar_initials = u.avatarInitials;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser(prev => prev ? {...prev, ...u} : null);
      addToast('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating user:', error);
      addToast(error.message || 'Failed to update profile', 'error');
    }
  };

  const addLead = async (lead: Lead) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: lead.name,
          address: lead.address,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          project_type: lead.projectType,
          source: lead.source,
          notes: lead.notes,
          estimated_value: lead.estimatedValue,
          assigned_to: lead.assignedTo,
          company_id: currentUser.companyId,
          insurance_carrier: lead.insuranceCarrier,
          policy_number: lead.policyNumber,
          claim_number: lead.claimNumber,
          adjuster_name: lead.adjusterName,
          adjuster_phone: lead.adjusterPhone,
          damage_date: lead.damageDate,
          documents: lead.documents || [],
          history: lead.history || []
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newLead: Lead = {
          id: data.id,
          name: data.name,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          status: data.status as LeadStatus,
          projectType: data.project_type || 'Unknown',
          source: data.source,
          notes: data.notes || '',
          estimatedValue: data.estimated_value || 0,
          lastContact: data.last_contact || '',
          assignedTo: data.assigned_to,
          companyId: data.company_id,
          createdAt: data.created_at,
          insuranceCarrier: data.insurance_carrier,
          policyNumber: data.policy_number,
          claimNumber: data.claim_number,
          adjusterName: data.adjuster_name,
          adjusterPhone: data.adjuster_phone,
          damageDate: data.damage_date,
          documents: data.documents || [],
          history: data.history || [],
          estimates: []
        };
        setLeads(prev => [newLead, ...prev]);
        addToast('Lead saved successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error adding lead:', error);
      addToast(error.message || 'Failed to save lead', 'error');
    }
  };

  const updateLead = async (lead: Lead) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          name: lead.name,
          address: lead.address,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          project_type: lead.projectType,
          source: lead.source,
          notes: lead.notes,
          estimated_value: lead.estimatedValue,
          assigned_to: lead.assignedTo,
          insurance_carrier: lead.insuranceCarrier,
          policy_number: lead.policyNumber,
          claim_number: lead.claimNumber,
          adjuster_name: lead.adjusterName,
          adjuster_phone: lead.adjusterPhone,
          damage_date: lead.damageDate,
          project_manager_id: lead.projectManagerId,
          production_date: lead.productionDate,
          payment_status: lead.paymentStatus,
          documents: lead.documents || [],
          production_steps: lead.productionSteps || [],
          history: lead.history || []
        })
        .eq('id', lead.id);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
      addToast('Lead updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating lead:', error);
      addToast(error.message || 'Failed to update lead', 'error');
    }
  };

  const addTask = async (task: Partial<Task>) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          due_date: task.dueDate,
          priority: task.priority || 'Medium',
          status: task.status || 'Todo',
          assigned_to: task.assignedTo,
          related_lead_id: task.relatedLeadId,
          company_id: currentUser.companyId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          dueDate: data.due_date,
          priority: data.priority,
          status: data.status,
          assignedTo: data.assigned_to,
          relatedLeadId: data.related_lead_id,
          companyId: data.company_id
        };
        setTasks(prev => [newTask, ...prev]);
        addToast('Task created successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error adding task:', error);
      addToast(error.message || 'Failed to create task', 'error');
    }
  };

  const updateTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: task.title,
          description: task.description,
          due_date: task.dueDate,
          priority: task.priority,
          status: task.status,
          assigned_to: task.assignedTo,
          related_lead_id: task.relatedLeadId
        })
        .eq('id', task.id);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      addToast('Task updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating task:', error);
      addToast(error.message || 'Failed to update task', 'error');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast('Task deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      addToast(error.message || 'Failed to delete task', 'error');
    }
  };

  const addEvent = async (event: Partial<CalendarEvent>) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          start_time: event.start,
          end_time: event.end,
          type: event.type,
          lead_id: event.leadId,
          assigned_to: event.assignedTo,
          company_id: currentUser.companyId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newEvent: CalendarEvent = {
          id: data.id,
          title: data.title,
          start: data.start_time,
          end: data.end_time,
          type: data.type,
          leadId: data.lead_id,
          assignedTo: data.assigned_to,
          companyId: data.company_id,
          color: data.type === 'Meeting' ? '#3b82f6' : data.type === 'Inspection' ? '#10b981' : data.type === 'Install' ? '#f59e0b' : '#ef4444'
        };
        setEvents(prev => [...prev, newEvent]);
        addToast('Event created successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error adding event:', error);
      addToast(error.message || 'Failed to create event', 'error');
    }
  };

  const createInvoice = async (invoice: Invoice) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          number: invoice.number,
          lead_id: invoice.leadName,
          status: invoice.status,
          date_issued: invoice.dateIssued,
          date_due: invoice.dateDue,
          items: invoice.items || [],
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          company_id: currentUser.companyId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newInvoice: Invoice = {
          id: data.id,
          number: data.number,
          leadName: data.lead_id,
          status: data.status,
          dateIssued: data.date_issued,
          dateDue: data.date_due,
          items: data.items || [],
          subtotal: data.subtotal || 0,
          tax: data.tax || 0,
          total: data.total || 0
        };
        setInvoices(prev => [newInvoice, ...prev]);
        addToast('Invoice created successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      addToast(error.message || 'Failed to create invoice', 'error');
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInvoices(prev => prev.map(i => i.id === id ? {...i, status} : i));
      addToast('Invoice status updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      addToast(error.message || 'Failed to update invoice', 'error');
    }
  };

  const setTab = (tab: Tab) => setActiveTab(tab);

  const addAutomation = async (r: AutomationRule) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('automations')
        .insert({
          name: r.name,
          active: r.active,
          trigger_type: r.trigger.type,
          trigger_value: r.trigger.value,
          action_type: r.action.type,
          action_config: r.action.config,
          company_id: currentUser.companyId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newAutomation: AutomationRule = {
          id: data.id,
          name: data.name,
          active: data.active,
          trigger: {
            type: data.trigger_type,
            value: data.trigger_value
          },
          action: {
            type: data.action_type,
            config: data.action_config || {}
          }
        };
        setAutomations(prev => [...prev, newAutomation]);
        addToast('Automation created successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error adding automation:', error);
      addToast(error.message || 'Failed to create automation', 'error');
    }
  };

  const toggleAutomation = async (id: string) => {
    try {
      const automation = automations.find(a => a.id === id);
      if (!automation) return;

      const { error } = await supabase
        .from('automations')
        .update({ active: !automation.active })
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.map(a => a.id === id ? {...a, active: !a.active} : a));
      addToast('Automation updated successfully', 'success');
    } catch (error: any) {
      console.error('Error toggling automation:', error);
      addToast(error.message || 'Failed to update automation', 'error');
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.filter(a => a.id !== id));
      addToast('Automation deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting automation:', error);
      addToast(error.message || 'Failed to delete automation', 'error');
    }
  };

  const addOrder = async (o: MaterialOrder) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('material_orders')
        .insert({
          po_number: o.poNumber,
          supplier_id: o.supplierId,
          lead_id: o.leadId,
          status: o.status,
          delivery_date: o.deliveryDate,
          items: o.items || [],
          instructions: o.instructions,
          company_id: currentUser.companyId
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newOrder: MaterialOrder = {
          id: data.id,
          poNumber: data.po_number,
          supplierId: data.supplier_id || '',
          leadId: data.lead_id,
          status: data.status,
          dateOrdered: data.created_at,
          deliveryDate: data.delivery_date,
          items: data.items || [],
          instructions: data.instructions || ''
        };
        setOrders(prev => [newOrder, ...prev]);
        addToast('Material order created successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error adding order:', error);
      addToast(error.message || 'Failed to create order', 'error');
    }
  };

  const addUser = async (user: Partial<User>) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      if (!user.name || !user.email || !user.role) {
        addToast('Name, email, and role are required', 'error');
        return;
      }

      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: tempPassword
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('user_already_exists')) {
          addToast('This email is already registered', 'error');
        } else {
          addToast(`Failed to create user: ${authError.message}`, 'error');
        }
        return;
      }

      if (!authData.user) {
        addToast('Failed to create user', 'error');
        return;
      }

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_id: currentUser.companyId,
          avatar_initials: user.name.slice(0, 2).toUpperCase()
        });

      if (userError) {
        addToast(`Failed to create user profile: ${userError.message}`, 'error');
        return;
      }

      await loadCompanyData(currentUser.companyId);
      addToast(`User added successfully! Temporary password: ${tempPassword}`, 'success');
    } catch (error: any) {
      console.error('Error adding user:', error);
      addToast(error.message || 'Failed to add user', 'error');
    }
  };

  const removeUser = async (userId: string) => {
    try {
      if (!currentUser?.companyId) {
        addToast('No company ID found', 'error');
        return;
      }

      if (userId === currentUser.id) {
        addToast('You cannot remove yourself', 'error');
        return;
      }

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        addToast(`Failed to remove user: ${userError.message}`, 'error');
        return;
      }

      await loadCompanyData(currentUser.companyId);
      addToast('User removed successfully', 'success');
    } catch (error: any) {
      console.error('Error removing user:', error);
      addToast(error.message || 'Failed to remove user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{
      currentUser, activeTab, companies, users, leads, events, tasks, invoices,
      toasts, notifications, callLogs, automations, suppliers, orders,
      login, register, logout, setTab, addToast, removeToast, updateLead, addLead,
      updateCompany, updateUser, addAutomation, toggleAutomation, deleteAutomation, addOrder,
      addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser
    }}>
      {children}
    </StoreContext.Provider>
  );
};
