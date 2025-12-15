// --- EXISTING CORE TYPES (Preserved) ---

export enum LeadStatus {
  NEW = 'New Lead',
  INSPECTION = 'Inspection',
  CLAIM_FILED = 'Claim Filed',
  ADJUSTER_MEETING = 'Adjuster Mtg',
  APPROVED = 'Approved',
  PRODUCTION = 'Production',
  SUPPLEMENTING = 'Supplementing',
  CLOSED = 'Closed'
}

export type ProjectType = 'Insurance' | 'Retail' | 'Unknown';

export interface LeadDocument {
  id: string;
  name: string;
  type: 'Photo' | 'PDF' | 'Contract' | 'Scope';
  url?: string;
  uploadedAt: string;
}

export interface ProductionStep {
  id: string;
  name: string;
  status: 'Pending' | 'Scheduled' | 'Completed';
  date?: string;
}

export interface Estimate {
  id: string;
  leadId: string;
  name?: string;
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  signature?: string;
  status?: 'Draft' | 'Signed' | 'Sent';
}

export interface EstimateItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export type EstimateTier = 'Good' | 'Better' | 'Best';

export interface LeadActivity {
  id: string;
  type: 'Status Change' | 'Note Added' | 'Email Sent' | 'File Uploaded' | 'Info Updated' | 'System';
  description: string;
  timestamp: string;
  user: string;
}

export interface Lead {
  id: string;
  name: string;
  address: string;
  coordinates?: { x: number, y: number };
  phone: string;
  email?: string;
  status: LeadStatus;
  projectType: ProjectType;
  source?: 'Door Knocking' | 'Referral' | 'Web' | 'Ads' | 'Other';
  notes: string;
  estimatedValue: number;
  lastContact: string;
  createdAt?: string;
  assignedTo?: string;
  companyId?: string;
  insuranceCarrier?: string;
  policyNumber?: string;
  claimNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  damageDate?: string;
  projectManagerId?: string;
  productionDate?: string;
  paymentStatus?: 'Unpaid' | 'Partial' | 'Paid';
  documents?: LeadDocument[];
  productionSteps?: ProductionStep[];
  estimates?: Estimate[];
  history?: LeadActivity[];
}

export interface RoofMeasurement {
  totalAreaSqFt: number;
  pitch: string;
  solarPotential: string;
  segments: number;
  maxSunlightHours: number;
  ridgeLen: number;
  hipLen: number;
  valleyLen: number;
  rakeLen: number;
  eaveLen: number;
}

export enum RoofType {
  ASPHALT = 'Asphalt Shingle',
  METAL = 'Metal Seam',
  TILE = 'Clay Tile',
  FLAT = 'Flat/TPO'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// --- MULTI-TENANT & USER TYPES ---

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SAAS_REP = 'Software Sales Rep',
  COMPANY_ADMIN = 'Company Owner',
  SALES_REP = 'Sales Rep'
}

export enum SubscriptionTier {
  STARTER = 'Starter',
  PROFESSIONAL = 'Professional',
  ENTERPRISE = 'Enterprise'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyId: string | null;
  avatarInitials: string;
}

// --- AI AGENT & AUTOMATION TYPES (UPDATED) ---

export interface CallLog {
  id: string;
  companyId: string;
  callerNumber: string;
  callerName?: string;
  duration: string;
  timestamp: string;
  status: 'Completed' | 'Missed' | 'Voicemail' | 'Action Required';
  transcript: string;
  summary: string;
  recordingUrl?: string;
  sentiment: 'Positive' | 'Neutral' | 'Angry';
}

export interface BusinessHours {
  enabled: boolean;
  start: string;
  end: string;
  days: string[];
  timezone: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'call_missed' | 'call_completed' | 'voicemail_received';
  action: 'sms_lead' | 'email_admin' | 'create_task';
  template?: string;
}

export interface AgentConfig {
  id: string;
  elevenLabsAgentId: string;
  elevenLabsApiKey?: string;
  voiceId: string;      // Selected Voice ID
  name: string;         // Internal Name
  systemPrompt: string; // The "Brain"
  firstMessage: string; // Greeting
  isActive: boolean;
  businessHours?: BusinessHours;
  workflows?: WorkflowConfig[];
}

export interface IntegrationConfig {
  quickbooks: {
    isConnected: boolean;
    lastSync?: string;
    autoSync: boolean;
  }
}

export interface Company {
  id: string;
  name: string;
  tier: SubscriptionTier;
  userCount: number;
  maxUsers: number;
  status: 'Active' | 'Suspended' | 'Pending';
  renewalDate: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  setupComplete?: boolean;
  agentConfig?: AgentConfig;
  integrations?: IntegrationConfig;
}

// --- SAAS CRM TYPES ---

export type SoftwareLeadStatus = 'Prospect' | 'Contacted' | 'Demo Booked' | 'Trial' | 'Closed Won' | 'Lost';

export interface SoftwareLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: SoftwareLeadStatus;
  potentialUsers: number;
  assignedTo: string;
  notes: string;
  createdAt: string;
}

// --- APP UTILITY TYPES ---

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'Meeting' | 'Inspection' | 'Install' | 'Deadline';
  leadId?: string;
  assignedTo?: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Done';
  assignedTo: string;
  relatedLeadId?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  leadId: string;
  leadName: string;
  number: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dateIssued: string;
  dateDue: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  companyId?: string;
}

export interface PriceBookItem {
  id: string;
  name: string;
  category: 'Material' | 'Labor' | 'Permit' | 'Other';
  unit: string;
  price: number;
  cost: number;
  description?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  time: string;
  read: boolean;
}

export interface WeatherAlert {
  id: string;
  severity: 'High' | 'Medium' | 'Low';
  type: 'Hail' | 'Wind' | 'Rain';
  location: string;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  logo: string;
  color: string;
  email: string;
}

export interface MaterialOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  leadId: string;
  status: 'Ordered' | 'Delivered' | 'Cancelled';
  dateOrdered: string;
  deliveryDate: string;
  items: EstimateItem[];
  instructions: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  active: boolean;
  triggerType: 'Status Change';
  triggerValue: string;
  actionType: 'Create Task' | 'Send Email' | 'Create Notification';
  actionConfig: {
    template?: string;
    assignTo?: 'Lead Owner' | 'Project Manager';
  };
}

export interface GroundingResult {
  text: string;
  sources: { title: string, uri: string }[];
}

export interface LogicArgument {
  point: string;
  reasoning: string;
  action: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export enum Tab {
  DASHBOARD = 'Dashboard',
  CALENDAR = 'Calendar',
  LEADS = 'Leads',
  CLAIMS = 'Claims',
  JOBS = 'Jobs',
  ESTIMATES = 'Estimates',
  TASKS = 'Tasks',
  INVOICES = 'Invoices',
  PRICE_BOOK = 'Price Book',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  AI_RECEPTIONIST = 'AI Receptionist',
  AUTOMATIONS = 'Automations',
  
  // Admin Tabs
  ADMIN_OVERVIEW = 'Overview',
  ADMIN_LEADS = 'SaaS Leads',
  ADMIN_TEAM = 'Sales Team',
  ADMIN_TENANTS = 'Tenants',
  ADMIN_AGENTS = 'AI Configuration'
}