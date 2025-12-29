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
  name?: string; // e.g. "Initial Roof Quote"
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  signature?: string; // base64 signature
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
  coordinates?: { x: number, y: number }; // Mock coordinates for map view
  phone: string;
  email?: string;
  status: LeadStatus;
  projectType: ProjectType;
  source?: 'Door Knocking' | 'Referral' | 'Web' | 'Ads' | 'Other';
  notes: string;
  estimatedValue: number; // RCV or Estimate Total
  lastContact: string;
  createdAt?: string;
  assignedTo?: string; // ID of the sales rep
  companyId?: string;
  // Insurance Specifics
  insuranceCarrier?: string;
  policyNumber?: string;
  claimNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  damageDate?: string;
  // Job Specifics
  projectManagerId?: string;
  productionDate?: string;
  paymentStatus?: 'Unpaid' | 'Partial' | 'Paid';
  // Deep Dive Data
  documents?: LeadDocument[];
  productionSteps?: ProductionStep[];
  estimates?: Estimate[];
  history?: LeadActivity[];
}

export interface MeasurementSegment {
  id: string;
  measurementId: string;
  name: string;
  areaSqft: number;
  pitch?: string;
  pitchDegrees?: number;
  geometry: { lat: number; lng: number }[];
  materialType?: 'Shingle' | 'Metal' | 'Tile' | 'Flat' | 'Other';
  condition?: 'Good' | 'Fair' | 'Poor' | 'Unknown';
  notes?: string;
  displayOrder: number;
}

export interface RoofMeasurement {
  id: string;
  companyId: string;
  leadId?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  imagerySource: 'Vexcel' | 'Bing' | 'Google' | 'Nearmap';
  imageryDate?: string;
  totalAreaSqft: number;
  pitch?: string;
  pitchDegrees?: number;
  segments: MeasurementSegment[];
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  rakeLength: number;
  eaveLength: number;
  perimeter: number;
  wasteFactor: number;
  measurementDate: string;
  measuredBy?: string;
  status: 'Draft' | 'Completed' | 'Approved';
  notes?: string;
  reportUrl?: string;
  createdAt?: string;
  updatedAt?: string;

  // Legacy fields for backward compatibility
  solarPotential?: string;
  maxSunlightHours?: number;
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

// --- Multi-Tenancy Types ---

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SAAS_REP = 'SaaS Rep', // Sells RAFTER AI to companies
  COMPANY_ADMIN = 'Company Owner',
  SALES_REP = 'Sales Rep'
}

export enum SubscriptionTier {
  STARTER = 'Starter',         // up to 3 users, Basic AI
  PROFESSIONAL = 'Professional', // up to 10 users, Vision + Adv AI
  ENTERPRISE = 'Enterprise'      // Unlimited, Custom
}

// --- AI Receptionist Types ---

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
  recordingUrl?: string; // Mock URL
  sentiment: 'Positive' | 'Neutral' | 'Angry';
}

// NEW: Business Hours Logic
export interface BusinessHours {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
  days: string[]; // ["Mon", "Tue", ...]
  timezone: string;
}

export interface AgentConfig {
  id: string;
  elevenLabsAgentId: string;
  elevenLabsApiKey?: string;
  voiceId: string;
  name: string;
  systemPrompt: string;
  firstMessage: string;
  isActive: boolean;
  language?: string;
  responseDelay?: number;
  interruptionThreshold?: number;
  maxDuration?: number;
  temperature?: number;
  stability?: number;
  similarityBoost?: number;
  conversationStarters?: string[];
  fallbackMessage?: string;
  transferMessage?: string;
  endCallPhrases?: string[];
  pronunciationDictionary?: { word: string; pronunciation: string }[];
  customVocabulary?: string[];
  knowledgeBase?: string;
  webhookUrl?: string;
  webhookEvents?: string[];
  businessHours?: BusinessHours;
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
  logoUrl?: string;
  // Onboarding fields
  setupComplete?: boolean;
  phone?: string;
  // AI Configuration
  agentConfig?: AgentConfig;
  // Integrations
  integrations?: IntegrationConfig;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for Auth
  role: UserRole;
  companyId: string | null; // Null if Super Admin or SaaS Rep
  avatarInitials: string;
  status?: 'Active' | 'Pending'; // Invitation status
  invitedAt?: string;
  invitedByUserId?: string; // ID of the Super Admin who invited this user
}

// --- Software CRM Types (Super Admin) ---

export type SoftwareLeadStatus = 'Prospect' | 'Contacted' | 'Demo Booked' | 'Trial' | 'Closed Won' | 'Lost';

export type LeadPriority = 'Hot' | 'Warm' | 'Cold';
export type LeadSource = 'Inbound' | 'Outbound' | 'Referral' | 'Event' | 'Partner' | 'Other';

export interface LeadActivity {
  id: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Note' | 'Status Change';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface SoftwareLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  companySize?: string;
  status: SoftwareLeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  potentialUsers: number;
  estimatedValue: number;
  assignedTo: string; // SaaS Rep ID
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  demoScheduledDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  activities: LeadActivity[];
  tags?: string[];
  lostReason?: string;
}

// --- New Modules ---

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

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'Card' | 'ACH' | 'Check' | 'Cash';
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  date: string;
  stripePaymentId?: string;
  processingFee: number;
  platformFee: number;
  netAmount: number;
}

export interface Invoice {
  id: string;
  leadId: string;
  leadName: string;
  number: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Partially Paid';
  dateIssued: string;
  dateDue: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  companyId?: string;
  paymentLink?: string;
  payments?: Payment[];
}

export interface Contract {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadAddress: string;
  number: string;
  type: 'Residential Roofing' | 'Commercial Roofing' | 'Insurance Claim' | 'Warranty Work' | 'Repair';
  status: 'Draft' | 'Sent' | 'Signed' | 'Active' | 'Completed' | 'Cancelled';
  createdDate: string;
  sentDate?: string;
  signedDate?: string;
  startDate?: string;
  completionDate?: string;
  projectDescription: string;
  scopeOfWork: string[];
  materials: string[];
  totalAmount: number;
  depositAmount: number;
  paymentSchedule: { milestone: string; amount: number; status: 'Pending' | 'Paid' }[];
  terms: string[];
  warranty: string;
  clientSignature?: string;
  contractorSignature?: string;
  companyId?: string;
  proposalId?: string;
  notes?: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadAddress: string;
  number: string;
  title: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  createdDate: string;
  sentDate?: string;
  viewedDate?: string;
  respondedDate?: string;
  validUntil: string;
  projectType: ProjectType;
  projectDescription: string;
  scopeOfWork: string[];
  options: ProposalOption[];
  selectedOptionId?: string;
  terms: string[];
  timeline: string;
  warranty: string;
  companyId?: string;
  contractId?: string;
  viewCount: number;
  lastViewed?: string;
  clientNotes?: string;
}

export interface ProposalOption {
  id: string;
  tier: 'Good' | 'Better' | 'Best';
  name: string;
  description: string;
  materials: string[];
  features: string[];
  warranty: string;
  timeline: string;
  price: number;
  savings?: number;
  isRecommended?: boolean;
}

export interface PriceBookItem {
  id: string;
  name: string;
  category: 'Material' | 'Labor' | 'Permit' | 'Other';
  unit: string;
  price: number; // Selling price
  cost: number; // Cost to company
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

// --- SUPPLIER & ORDERS (NEW) ---

export interface Supplier {
  id: string;
  name: string;
  logo: string; // url or placeholder
  color: string; // brand color
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

// --- Automation Types ---

export interface AutomationRule {
  id: string;
  name: string;
  active: boolean;
  triggerType: 'Status Change';
  triggerValue: string; // e.g. "LeadStatus.APPROVED"
  actionType: 'Create Task' | 'Send Email' | 'Create Notification';
  actionConfig: {
    template?: string; // Email template or Task title
    assignTo?: 'Lead Owner' | 'Project Manager';
  };
}

// --- AI Infrastructure Types ---

export interface GroundingResult {
  text: string;
  sources: { title: string, uri: string }[];
}

export interface LogicArgument {
  point: string;
  reasoning: string;
  action: string;
}

// --- UX Types ---

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
  MEASUREMENTS = 'Measurements',
  TASKS = 'Tasks',
  MATERIAL_ORDERS = 'Materials',
  LABOR_ORDERS = 'Labor',
  CONTRACTS = 'Contracts',
  PROPOSALS = 'Proposals',
  INVOICES = 'Payments',
  PRICE_BOOK = 'Price Book',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  AI_RECEPTIONIST = 'AI Receptionist',
  AUTOMATIONS = 'Automations',
  SUPPLEMENT_DETECTOR = 'Supplement Detector',
  AI_INTELLIGENCE = 'AI Intelligence',

  // Admin Tabs
  ADMIN_OVERVIEW = 'Overview',
  ADMIN_LEADS = 'SaaS Leads',
  ADMIN_TEAM = 'Sales Team',
  ADMIN_TENANTS = 'Tenants',
  ADMIN_AGENTS = 'AI Configuration'
}