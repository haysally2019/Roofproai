import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Company, Lead, CalendarEvent, Task, Invoice,
  Notification, UserRole, SubscriptionTier, LeadStatus, Tab, Toast,
  CallLog, AutomationRule,
  Supplier, MaterialOrder, SoftwareLead, PriceBookItem, Proposal, RoofMeasurement
} from '../types';
import { supabase } from './supabase';

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
  priceBook: PriceBookItem[];
  proposals: Proposal[];
  measurements: RoofMeasurement[];

  login: (email: string, password: string) => Promise<boolean>;
  register: (companyName: string, name: string, email: string, password: string, referralCode?: string | null) => Promise<boolean>;
  logout: () => void;
  setTab: (tab: Tab) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Data Actions
  updateLead: (lead: Lead) => void;
  addLead: (lead: Lead) => void;
  addLeadActivity: (leadId: string, type: string, description: string) => Promise<void>;
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
  addUser: (user: Partial<User>) => Promise<boolean>;
  removeUser: (userId: string) => Promise<void>;
  addSoftwareLead: (lead: SoftwareLead) => void;
  updateSoftwareLead: (lead: SoftwareLead) => void;
  deleteSoftwareLead: (id: string) => void;
  addProposal: (proposal: Proposal) => Promise<void>;
  updateProposal: (proposal: Proposal) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  addMeasurement: (measurement: RoofMeasurement) => Promise<void>;
  updateMeasurement: (measurement: RoofMeasurement) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
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
  const [softwareLeads, setSoftwareLeads] = useState<SoftwareLead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [measurements, setMeasurements] = useState<RoofMeasurement[]>([]);
  
  // UI State
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

        // --- SUPER ADMIN & SAAS REP LOGIC ---
        if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.SAAS_REP) {
            setActiveTab(Tab.ADMIN_OVERVIEW);
            const [companiesRes, usersRes, softwareLeadsRes] = await Promise.all([
                supabase.from('companies').select('*').order('created_at', { ascending: false }),
                supabase.from('users').select('*').order('created_at', { ascending: false }),
                supabase.from('software_leads').select('*').order('created_at', { ascending: false })
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
                const { data: authData } = await supabase.rpc('get_users_with_auth_status');
                const authStatusMap = new Map((authData || []).map((a: any) => [a.user_id, a]));

                setUsers(usersRes.data.map((u: any) => {
                    const authStatus = authStatusMap.get(u.id);
                    const isPending = authStatus && !authStatus.confirmed_at;
                    return {
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: u.role as UserRole,
                        companyId: u.company_id,
                        avatarInitials: u.avatar_initials || u.name.slice(0, 2).toUpperCase(),
                        status: isPending ? 'Pending' : 'Active',
                        invitedAt: authStatus?.invited_at,
                        invitedByUserId: u.invited_by_user_id
                    };
                }));
            }

            if (softwareLeadsRes.data) {
                setSoftwareLeads(softwareLeadsRes.data.map((l: any) => ({
                    id: l.id,
                    companyName: l.company_name,
                    contactName: l.contact_name,
                    email: l.email || '',
                    phone: l.phone || '',
                    website: l.website || '',
                    companySize: l.company_size || '',
                    status: l.status,
                    priority: l.priority || 'Warm',
                    source: l.source || 'Inbound',
                    potentialUsers: l.potential_users || 1,
                    estimatedValue: l.estimated_value || 0,
                    assignedTo: l.assigned_to,
                    notes: l.notes || '',
                    createdAt: l.created_at,
                    updatedAt: l.updated_at,
                    lastContactDate: l.last_contact_date,
                    nextFollowUpDate: l.next_follow_up_date,
                    demoScheduledDate: l.demo_scheduled_date,
                    trialStartDate: l.trial_start_date,
                    trialEndDate: l.trial_end_date,
                    activities: l.activities || [],
                    tags: l.tags || [],
                    lostReason: l.lost_reason
                })));
            }
        } else {
            // --- STANDARD USER LOGIC ---
            setActiveTab(Tab.DASHBOARD);
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

  const loadCompanyData = async (companyId: string) => {
    try {
      const [
        usersRes, leadsRes, activitiesRes, tasksRes, eventsRes, invoicesRes, callLogsRes,
        automationsRes, ordersRes, priceBookRes, proposalsRes, measurementsRes
      ] = await Promise.all([
        supabase.from('users').select('*').eq('company_id', companyId),
        supabase.from('leads').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('events').select('*').eq('company_id', companyId).order('start_time', { ascending: true }),
        supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('automations').select('*').eq('company_id', companyId),
        supabase.from('material_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('price_book_items').select('*').eq('company_id', companyId).order('name', { ascending: true }),
        supabase.from('proposals').select('*, proposal_options(*)').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('roof_measurements').select('*, measurement_segments(*)').eq('company_id', companyId).order('created_at', { ascending: false })
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          companyId: user.company_id,
          avatarInitials: user.avatar_initials || user.name.slice(0, 2).toUpperCase(),
          invitedByUserId: user.invited_by_user_id
        })));
      }

      if (leadsRes.data) {
        const activitiesByLead = (activitiesRes.data || []).reduce((acc: any, activity: any) => {
          if (!acc[activity.lead_id]) acc[activity.lead_id] = [];
          acc[activity.lead_id].push({
            id: activity.id,
            type: activity.type,
            description: activity.description,
            timestamp: activity.created_at,
            user: activity.user_name || 'System'
          });
          return acc;
        }, {});

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
          history: activitiesByLead[lead.id] || [],
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

      if (priceBookRes.data) {
          setPriceBook(priceBookRes.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              unit: item.unit,
              price: item.price,
              cost: item.cost,
              description: item.description
          })));
      }

      if (proposalsRes.data) {
        const proposalsWithLeadData = await Promise.all(
          proposalsRes.data.map(async (prop: any) => {
            const { data: leadData } = await supabase
              .from('leads')
              .select('name, email, phone, address')
              .eq('id', prop.lead_id)
              .maybeSingle();

            return {
              id: prop.id,
              leadId: prop.lead_id,
              leadName: leadData?.name || '',
              leadEmail: leadData?.email || '',
              leadPhone: leadData?.phone || '',
              leadAddress: leadData?.address || '',
              number: prop.number,
              title: prop.title,
              status: prop.status,
              createdDate: prop.created_date,
              sentDate: prop.sent_date,
              viewedDate: prop.viewed_date,
              respondedDate: prop.responded_date,
              validUntil: prop.valid_until,
              projectType: prop.project_type,
              projectDescription: prop.project_description,
              scopeOfWork: prop.scope_of_work || [],
              options: (prop.proposal_options || []).map((opt: any) => ({
                id: opt.id,
                tier: opt.tier,
                name: opt.name,
                description: opt.description,
                materials: opt.materials || [],
                features: opt.features || [],
                warranty: opt.warranty,
                timeline: opt.timeline,
                price: opt.price,
                savings: opt.savings,
                isRecommended: opt.is_recommended
              })),
              selectedOptionId: prop.selected_option_id,
              terms: prop.terms || [],
              timeline: prop.timeline,
              warranty: prop.warranty,
              companyId: prop.company_id,
              contractId: prop.contract_id,
              viewCount: prop.view_count,
              lastViewed: prop.last_viewed,
              clientNotes: prop.client_notes
            };
          })
        );
        setProposals(proposalsWithLeadData);
      }

      if (measurementsRes.data) {
        setMeasurements(measurementsRes.data.map((m: any) => ({
          id: m.id,
          companyId: m.company_id,
          leadId: m.lead_id,
          address: m.address,
          latitude: m.latitude,
          longitude: m.longitude,
          imagerySource: m.imagery_source,
          imageryDate: m.imagery_date,
          totalAreaSqft: m.total_area_sqft,
          pitch: m.pitch,
          pitchDegrees: m.pitch_degrees,
          segments: (m.measurement_segments || []).map((seg: any) => ({
            id: seg.id,
            measurementId: seg.measurement_id,
            name: seg.name,
            areaSqft: seg.area_sqft,
            pitch: seg.pitch,
            pitchDegrees: seg.pitch_degrees,
            geometry: seg.geometry,
            materialType: seg.material_type,
            condition: seg.condition,
            notes: seg.notes,
            displayOrder: seg.display_order
          })),
          ridgeLength: m.ridge_length,
          hipLength: m.hip_length,
          valleyLength: m.valley_length,
          rakeLength: m.rake_length,
          eaveLength: m.eave_length,
          perimeter: m.perimeter,
          wasteFactor: m.waste_factor,
          measurementDate: m.measurement_date,
          measuredBy: m.measured_by,
          status: m.status,
          notes: m.notes,
          reportUrl: m.report_url,
          createdAt: m.created_at,
          updatedAt: m.updated_at
        })));
      }

    } catch (error) {
      console.error('Error loading company data:', error);
      addToast('Error loading data', 'error');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) await loadUserProfile(session.user.id);
        else { setCurrentUser(null); setLoading(false); }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Auth & Action Methods ---

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
        if (!resolveError && resolvedId) referrerId = resolvedId;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { addToast(`Registration failed: ${authError.message}`, "error"); return false; }
      if (!authData.user) return false;

      const { data: companyData, error: companyError } = await supabase.from('companies').insert({
          name: companyName, tier: 'Starter', status: 'Active', setup_complete: false, referred_by_user_id: referrerId
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
    setLeads([]); setTasks([]); setEvents([]); setInvoices([]); setCallLogs([]); setAutomations([]); setOrders([]); setPriceBook([]); setProposals([]); setMeasurements([]);
    setCompanies([]); setUsers([]); setSoftwareLeads([]);
  };

  const setTab = (tab: Tab) => setActiveTab(tab);

  // --- CRUD Methods ---
  const createCompany = async (c: Partial<Company>) => { if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) return null; const { data, error } = await supabase.from('companies').insert({ name: c.name, tier: c.tier || 'Starter', address: c.address, phone: c.phone, status: 'Active', setup_complete: false }).select().single(); if (error) { addToast(`Failed: ${error.message}`, 'error'); return null; } const newCompany: Company = { id: data.id, name: data.name, tier: data.tier, userCount: 0, maxUsers: data.max_users, status: data.status, renewalDate: data.renewal_date, address: data.address, logoUrl: data.logo_url, setupComplete: data.setup_complete, phone: data.phone, agentConfig: data.agent_config, integrations: data.integrations }; setCompanies(prev => [newCompany, ...prev]); addToast('Company onboarded', 'success'); return data.id; };
  const updateCompany = async (c: Partial<Company>) => { if (!c.id) return; const { error } = await supabase.from('companies').update({ name: c.name, address: c.address, phone: c.phone, logo_url: c.logoUrl, setup_complete: c.setupComplete, agent_config: c.agentConfig, integrations: c.integrations, status: c.status, tier: c.tier }).eq('id', c.id); if (error) { addToast(`Failed: ${error.message}`, 'error'); return; } setCompanies(prev => prev.map(x => x.id === c.id ? {...x, ...c} : x)); };
  const deleteCompany = async (id: string) => { if (currentUser?.role !== UserRole.SUPER_ADMIN) return; const { error } = await supabase.from('companies').delete().eq('id', id); if (error) { addToast(`Failed: ${error.message}`, 'error'); return; } setCompanies(prev => prev.filter(c => c.id !== id)); setUsers(prev => prev.filter(u => u.companyId !== id)); addToast('Deleted', 'success'); };
  const updateUser = async (u: Partial<User>) => { const targetId = u.id || currentUser?.id; if (!targetId) return; const { error } = await supabase.from('users').update({ name: u.name, role: u.role, email: u.email }).eq('id', targetId); if (error) { addToast(`Failed: ${error.message}`, 'error'); return; } setUsers(prev => prev.map(user => user.id === targetId ? { ...user, ...u } : user)); if (currentUser && targetId === currentUser.id) setCurrentUser(prev => prev ? { ...prev, ...u } : null); addToast('Updated', 'success'); };
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
    if (!error) {
      setLeads(prev => [...prev, lead]);
      await addLeadActivity(lead.id, 'System', `Lead created by ${currentUser.name}`);
    }
  };

  const addLeadActivity = async (leadId: string, type: string, description: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      type,
      description,
      user_name: currentUser.name
    });
    if (!error) {
      const newActivity = {
        id: Date.now().toString(),
        type,
        description,
        timestamp: new Date().toISOString(),
        user: currentUser.name
      };
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, history: [newActivity, ...(l.history || [])] } : l
      ));
    }
  };

  const updateLead = async (lead: Lead) => {
    const oldLead = leads.find(l => l.id === lead.id);
    const { error } = await supabase.from('leads').update({
      name: lead.name, address: lead.address, phone: lead.phone, email: lead.email, status: lead.status,
      project_type: lead.projectType, source: lead.source, notes: lead.notes, estimated_value: lead.estimatedValue,
      last_contact: lead.lastContact, assigned_to: lead.assignedTo, insurance_carrier: lead.insuranceCarrier,
      policy_number: lead.policyNumber, claim_number: lead.claimNumber, adjuster_name: lead.adjusterName,
      adjuster_phone: lead.adjusterPhone, damage_date: lead.damageDate, project_manager_id: lead.projectManagerId,
      production_date: lead.productionDate, payment_status: lead.paymentStatus
    }).eq('id', lead.id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
      if (oldLead && oldLead.status !== lead.status) {
        await addLeadActivity(lead.id, 'Status Change', `Status changed from "${oldLead.status}" to "${lead.status}"`);
      }
      if (oldLead && oldLead.notes !== lead.notes) {
        await addLeadActivity(lead.id, 'Note Added', 'Notes updated');
      }
    }
  };
  const addTask = async (task: Partial<Task>) => { if (!currentUser?.companyId) return; const newTask = { ...task, id: Date.now().toString(), companyId: currentUser.companyId }; const { error } = await supabase.from('tasks').insert({ id: newTask.id, title: newTask.title, description: newTask.description, due_date: newTask.dueDate, priority: newTask.priority, status: newTask.status || 'To Do', assigned_to: newTask.assignedTo, related_lead_id: newTask.relatedLeadId, company_id: currentUser.companyId }); if (!error) setTasks(prev => [...prev, newTask as Task]); };
  const updateTask = async (task: Task) => { const { error } = await supabase.from('tasks').update({ title: task.title, description: task.description, due_date: task.dueDate, priority: task.priority, status: task.status, assigned_to: task.assignedTo, related_lead_id: task.relatedLeadId }).eq('id', task.id); if (!error) setTasks(prev => prev.map(t => t.id === task.id ? task : t)); };
  const deleteTask = async (id: string) => { const { error } = await supabase.from('tasks').delete().eq('id', id); if (!error) setTasks(prev => prev.filter(t => t.id !== id)); };
  const addEvent = async (event: Partial<CalendarEvent>) => { if (!currentUser?.companyId) return; const newEvent = { ...event, id: Date.now().toString(), companyId: currentUser.companyId, color: '#3b82f6' }; const { error } = await supabase.from('events').insert({ id: newEvent.id, title: newEvent.title, start_time: newEvent.start, end_time: newEvent.end, type: newEvent.type, lead_id: newEvent.leadId, assigned_to: newEvent.assignedTo, company_id: currentUser.companyId }); if (!error) setEvents(prev => [...prev, newEvent as CalendarEvent]); };
  const createInvoice = async (invoice: Invoice) => { if (!currentUser?.companyId) return; const { error } = await supabase.from('invoices').insert({ id: invoice.id, number: invoice.number, lead_id: invoice.leadName, status: invoice.status, date_issued: invoice.dateIssued, date_due: invoice.dateDue, items: invoice.items, subtotal: invoice.subtotal, tax: invoice.tax, total: invoice.total, company_id: currentUser.companyId }); if (!error) setInvoices(prev => [...prev, invoice]); };
  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => { const { error } = await supabase.from('invoices').update({ status }).eq('id', id); if (!error) setInvoices(prev => prev.map(i => i.id === id ? {...i, status} : i)); };
  const addAutomation = async (r: AutomationRule) => { if (!currentUser?.companyId) return; const { error } = await supabase.from('automations').insert({ id: r.id, name: r.name, active: r.active, trigger_type: r.trigger.type, trigger_value: r.trigger.value, action_type: r.action.type, action_config: r.action.config, company_id: currentUser.companyId }); if (!error) setAutomations(prev => [...prev, r]); };
  const toggleAutomation = async (id: string) => { const auto = automations.find(a => a.id === id); if (!auto) return; const { error } = await supabase.from('automations').update({ active: !auto.active }).eq('id', id); if (!error) setAutomations(prev => prev.map(a => a.id === id ? {...a, active: !a.active} : a)); };
  const deleteAutomation = async (id: string) => { const { error } = await supabase.from('automations').delete().eq('id', id); if (!error) setAutomations(prev => prev.filter(a => a.id !== id)); };
  const addOrder = async (o: MaterialOrder) => { if (!currentUser?.companyId) return; const { error } = await supabase.from('material_orders').insert({ id: o.id, po_number: o.poNumber, supplier_id: o.supplierId, lead_id: o.leadId, status: o.status, delivery_date: o.deliveryDate, items: o.items, instructions: o.instructions, company_id: currentUser.companyId }); if (!error) setOrders(prev => [...prev, o]); };
  
  const addUser = async (u: Partial<User>): Promise<boolean> => { const targetCompanyId = u.companyId !== undefined ? u.companyId : currentUser?.companyId; if (!targetCompanyId && currentUser?.role !== UserRole.SUPER_ADMIN) { addToast("Cannot create user without an organization.", "error"); return false; } if (targetCompanyId && currentUser?.role !== UserRole.SUPER_ADMIN) { const company = companies.find(c => c.id === targetCompanyId); if (company && users.filter(user => user.companyId === targetCompanyId).length >= company.maxUsers) { addToast(`User limit reached for ${company.tier} plan.`, "error"); return false; } } try { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error("Not logged in"); const { data, error } = await supabase.functions.invoke('create-user', { body: { email: u.email, name: u.name, role: u.role, companyId: targetCompanyId || null, avatarInitials: u.name?.slice(0, 2).toUpperCase(), invitedByUserId: currentUser?.id }, headers: { Authorization: `Bearer ${session.access_token}` } }); if (error || data?.error) throw new Error(error?.message || data?.error); const newUser: User = { id: data.user.id, name: u.name!, email: u.email!, role: u.role!, companyId: targetCompanyId || null, avatarInitials: u.name?.slice(0, 2).toUpperCase() || 'NA' }; setUsers(prev => [newUser, ...prev]); if (data.emailSent) addToast(`Invite sent to ${u.email}`, 'success'); else addToast('User created! Email failed, check console for link.', 'success'); return true; } catch (error: any) { addToast(`Failed: ${error.message}`, 'error'); return false; } };
  const removeUser = async (uid: string) => { const { error } = await supabase.from('users').delete().eq('id', uid); if (!error) setUsers(prev => prev.filter(u => u.id !== uid)); };

  const addSoftwareLead = async (lead: SoftwareLead) => {
    const { error } = await supabase.from('software_leads').insert({
      id: lead.id,
      company_name: lead.companyName,
      contact_name: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      company_size: lead.companySize,
      status: lead.status,
      priority: lead.priority,
      source: lead.source,
      potential_users: lead.potentialUsers,
      estimated_value: lead.estimatedValue,
      assigned_to: lead.assignedTo,
      notes: lead.notes,
      next_follow_up_date: lead.nextFollowUpDate,
      demo_scheduled_date: lead.demoScheduledDate,
      trial_start_date: lead.trialStartDate,
      trial_end_date: lead.trialEndDate,
      last_contact_date: lead.lastContactDate,
      activities: lead.activities,
      tags: lead.tags,
      lost_reason: lead.lostReason,
      created_at: lead.createdAt,
      updated_at: lead.updatedAt
    });
    if (!error) {
      setSoftwareLeads(prev => [...prev, lead]);
      addToast('Lead added successfully', 'success');
    } else {
      addToast('Failed to add lead', 'error');
    }
  };

  const updateSoftwareLead = async (lead: SoftwareLead) => {
    const { error } = await supabase.from('software_leads').update({
      company_name: lead.companyName,
      contact_name: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      company_size: lead.companySize,
      status: lead.status,
      priority: lead.priority,
      source: lead.source,
      potential_users: lead.potentialUsers,
      estimated_value: lead.estimatedValue,
      assigned_to: lead.assignedTo,
      notes: lead.notes,
      next_follow_up_date: lead.nextFollowUpDate,
      demo_scheduled_date: lead.demoScheduledDate,
      trial_start_date: lead.trialStartDate,
      trial_end_date: lead.trialEndDate,
      last_contact_date: lead.lastContactDate,
      activities: lead.activities,
      tags: lead.tags,
      lost_reason: lead.lostReason
    }).eq('id', lead.id);
    if (!error) {
      setSoftwareLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
      addToast('Lead updated successfully', 'success');
    } else {
      addToast('Failed to update lead', 'error');
    }
  };

  const deleteSoftwareLead = async (id: string) => {
    const { error } = await supabase.from('software_leads').delete().eq('id', id);
    if (!error) {
      setSoftwareLeads(prev => prev.filter(l => l.id !== id));
      addToast('Lead deleted successfully', 'success');
    } else {
      addToast('Failed to delete lead', 'error');
    }
  };

  const addProposal = async (proposal: Proposal) => {
    if (!currentUser?.companyId) return;

    try {
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          id: proposal.id,
          company_id: currentUser.companyId,
          lead_id: proposal.leadId,
          number: proposal.number,
          title: proposal.title,
          status: proposal.status,
          created_date: proposal.createdDate,
          sent_date: proposal.sentDate,
          viewed_date: proposal.viewedDate,
          responded_date: proposal.respondedDate,
          valid_until: proposal.validUntil,
          project_type: proposal.projectType,
          project_description: proposal.projectDescription,
          scope_of_work: proposal.scopeOfWork,
          terms: proposal.terms,
          timeline: proposal.timeline,
          warranty: proposal.warranty,
          selected_option_id: proposal.selectedOptionId,
          view_count: proposal.viewCount || 0,
          last_viewed: proposal.lastViewed,
          client_notes: proposal.clientNotes,
          contract_id: proposal.contractId
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      const optionsPromises = proposal.options.map((option, index) =>
        supabase.from('proposal_options').insert({
          id: option.id,
          proposal_id: proposal.id,
          tier: option.tier,
          name: option.name,
          description: option.description,
          materials: option.materials,
          features: option.features,
          warranty: option.warranty,
          timeline: option.timeline,
          price: option.price,
          savings: option.savings,
          is_recommended: option.isRecommended || false,
          display_order: index
        })
      );

      await Promise.all(optionsPromises);

      setProposals(prev => [proposal, ...prev]);
      addToast('Proposal created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      addToast(`Failed to create proposal: ${error.message}`, 'error');
    }
  };

  const updateProposal = async (proposal: Proposal) => {
    try {
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          title: proposal.title,
          status: proposal.status,
          sent_date: proposal.sentDate,
          viewed_date: proposal.viewedDate,
          responded_date: proposal.respondedDate,
          valid_until: proposal.validUntil,
          project_type: proposal.projectType,
          project_description: proposal.projectDescription,
          scope_of_work: proposal.scopeOfWork,
          terms: proposal.terms,
          timeline: proposal.timeline,
          warranty: proposal.warranty,
          selected_option_id: proposal.selectedOptionId,
          view_count: proposal.viewCount,
          last_viewed: proposal.lastViewed,
          client_notes: proposal.clientNotes,
          contract_id: proposal.contractId
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      await supabase.from('proposal_options').delete().eq('proposal_id', proposal.id);

      const optionsPromises = proposal.options.map((option, index) =>
        supabase.from('proposal_options').insert({
          id: option.id,
          proposal_id: proposal.id,
          tier: option.tier,
          name: option.name,
          description: option.description,
          materials: option.materials,
          features: option.features,
          warranty: option.warranty,
          timeline: option.timeline,
          price: option.price,
          savings: option.savings,
          is_recommended: option.isRecommended || false,
          display_order: index
        })
      );

      await Promise.all(optionsPromises);

      setProposals(prev => prev.map(p => p.id === proposal.id ? proposal : p));
      addToast('Proposal updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating proposal:', error);
      addToast(`Failed to update proposal: ${error.message}`, 'error');
    }
  };

  const deleteProposal = async (id: string) => {
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;

      setProposals(prev => prev.filter(p => p.id !== id));
      addToast('Proposal deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting proposal:', error);
      addToast(`Failed to delete proposal: ${error.message}`, 'error');
    }
  };

  const addMeasurement = async (measurement: RoofMeasurement) => {
    if (!currentUser?.companyId) return;

    try {
      const { data: measurementData, error: measurementError } = await supabase
        .from('roof_measurements')
        .insert({
          id: measurement.id,
          company_id: currentUser.companyId,
          lead_id: measurement.leadId,
          address: measurement.address,
          latitude: measurement.latitude,
          longitude: measurement.longitude,
          imagery_source: measurement.imagerySource,
          imagery_date: measurement.imageryDate,
          total_area_sqft: measurement.totalAreaSqft,
          pitch: measurement.pitch,
          pitch_degrees: measurement.pitchDegrees,
          ridge_length: measurement.ridgeLength,
          hip_length: measurement.hipLength,
          valley_length: measurement.valleyLength,
          rake_length: measurement.rakeLength,
          eave_length: measurement.eaveLength,
          perimeter: measurement.perimeter,
          waste_factor: measurement.wasteFactor,
          measurement_date: measurement.measurementDate,
          measured_by: currentUser.id,
          status: measurement.status,
          notes: measurement.notes,
          report_url: measurement.reportUrl
        })
        .select()
        .single();

      if (measurementError) throw measurementError;

      const segmentsPromises = measurement.segments.map((segment) =>
        supabase.from('measurement_segments').insert({
          id: segment.id,
          measurement_id: measurement.id,
          name: segment.name,
          area_sqft: segment.areaSqft,
          pitch: segment.pitch,
          pitch_degrees: segment.pitchDegrees,
          geometry: segment.geometry,
          material_type: segment.materialType,
          condition: segment.condition,
          notes: segment.notes,
          display_order: segment.displayOrder
        })
      );

      await Promise.all(segmentsPromises);

      setMeasurements(prev => [measurement, ...prev]);
      addToast('Measurement saved successfully', 'success');
    } catch (error: any) {
      console.error('Error saving measurement:', error);
      addToast(`Failed to save measurement: ${error.message}`, 'error');
    }
  };

  const updateMeasurement = async (measurement: RoofMeasurement) => {
    try {
      const { error: measurementError } = await supabase
        .from('roof_measurements')
        .update({
          lead_id: measurement.leadId,
          address: measurement.address,
          latitude: measurement.latitude,
          longitude: measurement.longitude,
          imagery_source: measurement.imagerySource,
          imagery_date: measurement.imageryDate,
          total_area_sqft: measurement.totalAreaSqft,
          pitch: measurement.pitch,
          pitch_degrees: measurement.pitchDegrees,
          ridge_length: measurement.ridgeLength,
          hip_length: measurement.hipLength,
          valley_length: measurement.valleyLength,
          rake_length: measurement.rakeLength,
          eave_length: measurement.eaveLength,
          perimeter: measurement.perimeter,
          waste_factor: measurement.wasteFactor,
          status: measurement.status,
          notes: measurement.notes,
          report_url: measurement.reportUrl
        })
        .eq('id', measurement.id);

      if (measurementError) throw measurementError;

      await supabase.from('measurement_segments').delete().eq('measurement_id', measurement.id);

      const segmentsPromises = measurement.segments.map((segment) =>
        supabase.from('measurement_segments').insert({
          id: segment.id,
          measurement_id: measurement.id,
          name: segment.name,
          area_sqft: segment.areaSqft,
          pitch: segment.pitch,
          pitch_degrees: segment.pitchDegrees,
          geometry: segment.geometry,
          material_type: segment.materialType,
          condition: segment.condition,
          notes: segment.notes,
          display_order: segment.displayOrder
        })
      );

      await Promise.all(segmentsPromises);

      setMeasurements(prev => prev.map(m => m.id === measurement.id ? measurement : m));
      addToast('Measurement updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating measurement:', error);
      addToast(`Failed to update measurement: ${error.message}`, 'error');
    }
  };

  const deleteMeasurement = async (id: string) => {
    try {
      const { error } = await supabase.from('roof_measurements').delete().eq('id', id);
      if (error) throw error;

      setMeasurements(prev => prev.filter(m => m.id !== id));
      addToast('Measurement deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting measurement:', error);
      addToast(`Failed to delete measurement: ${error.message}`, 'error');
    }
  };

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
      priceBook,
      proposals: proposals || [],
      measurements: measurements || [],
      login, register, logout, setTab, addToast, removeToast,
      updateLead, addLead, addLeadActivity, createCompany, updateCompany, deleteCompany, updateUser, 
      addAutomation, toggleAutomation, deleteAutomation, addOrder,
      addTask, updateTask, deleteTask, addEvent, createInvoice, updateInvoiceStatus,
      addUser, removeUser,
      addSoftwareLead, updateSoftwareLead, deleteSoftwareLead,
      addProposal, updateProposal, deleteProposal,
      addMeasurement, updateMeasurement, deleteMeasurement
  };

  return <StoreContext.Provider value={safeValue}>{children}</StoreContext.Provider>;
};