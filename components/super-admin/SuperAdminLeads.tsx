import React, { useState, useMemo, useRef } from 'react';
import { SoftwareLead, SoftwareLeadStatus, LeadPriority, LeadSource, User, UserRole, LeadActivity } from '../../types';
import {
  Plus, Search, Phone, Mail, User as UserIcon, MoreHorizontal, Trash2, ArrowRightCircle,
  Flame, TrendingUp, Clock, DollarSign, Filter, Calendar, MessageSquare, ExternalLink,
  LayoutList, ArrowUpDown, AlertCircle, CheckCircle2, XCircle, Target, Upload,
  FileSpreadsheet, Download, Check, X, Pencil, ChevronDown
} from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
  onDeleteLead: (id: string) => void;
  onConvertLead: (lead: SoftwareLead) => void;
}

type SortField = 'companyName' | 'createdAt' | 'estimatedValue' | 'nextFollowUpDate' | 'priority';

// Helper to generate valid UUIDs for Supabase
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead, onDeleteLead, onConvertLead }) => {
  const [showModal, setShowModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SoftwareLead | null>(null);
  
  const [form, setForm] = useState<Partial<SoftwareLead>>({
    status: 'Prospect',
    priority: 'Warm',
    source: 'Inbound',
    activities: [],
    estimatedValue: 0,
    potentialUsers: 1
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SoftwareLeadStatus | 'All'>('All');
  const [filterPriority, setFilterPriority] = useState<LeadPriority | 'All'>('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Import state
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importSource, setImportSource] = useState('Generic CSV');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [assignToUserId, setAssignToUserId] = useState<string>(currentUser.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns: SoftwareLeadStatus[] = ['Prospect', 'Contacted', 'Demo Booked', 'Trial', 'Closed Won', 'Lost'];
  const priorities: LeadPriority[] = ['Hot', 'Warm', 'Cold'];
  const sources: LeadSource[] = ['Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Other'];

  // Metrics calculations
  const metrics = useMemo(() => {
    const total = leads.length;
    const closedWon = leads.filter(l => l.status === 'Closed Won').length;
    const inTrial = leads.filter(l => l.status === 'Trial').length;
    const hot = leads.filter(l => l.priority === 'Hot').length;
    const needsFollowUp = leads.filter(l =>
      l.nextFollowUpDate && new Date(l.nextFollowUpDate) <= new Date()
    ).length;
    const conversionRate = total > 0 ? ((closedWon / total) * 100).toFixed(1) : '0';
    const totalValue = leads
      .filter(l => l.status === 'Closed Won')
      .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

    return { total, closedWon, inTrial, hot, needsFollowUp, conversionRate, totalValue };
  }, [leads]);

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads.filter(l => {
      const matchesSearch =
        l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || l.priority === filterPriority;
      const matchesAssignedTo = filterAssignedTo === 'All' || l.assignedTo === filterAssignedTo;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'priority') {
        const priorityOrder = { 'Hot': 3, 'Warm': 2, 'Cold': 1 };
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [leads, searchQuery, filterStatus, filterPriority, filterAssignedTo, sortField, sortDirection]);

  // --- Handlers for Quick Updates in List View ---

  const handleQuickStatusUpdate = (lead: SoftwareLead, newStatus: SoftwareLeadStatus) => {
    if (lead.status === newStatus) return;
    const now = new Date().toISOString();
    
    // Add activity log for status change
    const updatedActivities = [
      ...(lead.activities || []),
      {
        id: `act-${Date.now()}`,
        type: 'Status Change' as const,
        description: `Status changed from ${lead.status} to ${newStatus}`,
        timestamp: now,
        userId: currentUser.id,
        userName: currentUser.name
      }
    ];

    onUpdateLead({
      ...lead,
      status: newStatus,
      updatedAt: now,
      activities: updatedActivities
    });
  };

  const handleQuickPriorityUpdate = (lead: SoftwareLead, newPriority: LeadPriority) => {
    if (lead.priority === newPriority) return;
    const now = new Date().toISOString();
    onUpdateLead({
      ...lead,
      priority: newPriority,
      updatedAt: now
    });
  };

  // ------------------------------------------------

  const handleSave = () => {
    if (!form.companyName || !form.contactName) return;

    const now = new Date().toISOString();

    if (form.id) {
      const statusChanged = selectedLead && selectedLead.status !== form.status;
      const updatedActivities = statusChanged
        ? [
            ...(form.activities || []),
            {
              id: `act-${Date.now()}`,
              type: 'Status Change' as const,
              description: `Status changed from ${selectedLead?.status} to ${form.status}`,
              timestamp: now,
              userId: currentUser.id,
              userName: currentUser.name
            }
          ]
        : form.activities || [];

      onUpdateLead({ ...form, updatedAt: now, activities: updatedActivities } as SoftwareLead);
    } else {
      const newLead: SoftwareLead = {
        id: generateUUID(),
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email || '',
        phone: form.phone || '',
        website: form.website || '',
        companySize: form.companySize || '',
        status: form.status || 'Prospect',
        priority: form.priority || 'Warm',
        source: form.source || 'Inbound',
        potentialUsers: form.potentialUsers || 1,
        estimatedValue: form.estimatedValue || 0,
        assignedTo: form.assignedTo || currentUser.id,
        notes: form.notes || '',
        createdAt: now,
        updatedAt: now,
        activities: [{
          id: `act-${Date.now()}`,
          type: 'Note',
          description: 'Lead created',
          timestamp: now,
          userId: currentUser.id,
          userName: currentUser.name
        }],
        tags: form.tags || []
      };
      onAddLead(newLead);
    }
    setShowModal(false);
    setForm({ status: 'Prospect', priority: 'Warm', source: 'Inbound', activities: [], estimatedValue: 0, potentialUsers: 1 });
    setSelectedLead(null);
  };

  const handleAddActivity = (lead: SoftwareLead, type: LeadActivity['type'], description: string) => {
    const now = new Date().toISOString();
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      type,
      description,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name
    };

    const updatedLead = {
      ...lead,
      activities: [...(lead.activities || []), newActivity],
      updatedAt: now,
      lastContactDate: now
    };

    onUpdateLead(updatedLead);
  };

  const getPriorityColor = (priority: LeadPriority) => {
    switch (priority) {
      case 'Hot': return 'text-red-700 bg-red-50 border-red-200';
      case 'Warm': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Cold': return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getStatusColor = (status: SoftwareLeadStatus) => {
    switch (status) {
        case 'Closed Won': return 'text-green-700 bg-green-50 border-green-200';
        case 'Lost': return 'text-slate-500 bg-slate-100 border-slate-200';
        case 'Trial': return 'text-purple-700 bg-purple-50 border-purple-200';
        default: return 'text-slate-700 bg-white border-slate-200';
    }
  }

  const isFollowUpOverdue = (lead: SoftwareLead) => {
    return lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) <= new Date();
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/);
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

        console.log('CSV Headers:', headers);

        const data = lines.slice(1).filter(l => l.trim()).map((line, idx) => {
          const values = parseCSVLine(line);
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i]?.replace(/^"|"$/g, '') || '';
          });
          return obj;
        });

        setCsvPreview(headers);
        setParsedData(data);

        const newMapping: Record<string, string> = {};
        headers.forEach(h => {
          const lower = h.toLowerCase();
          
          if ((lower.includes('company') || lower.includes('business') || lower.includes('organization')) && !lower.includes('size')) {
            newMapping[h] = 'companyName';
          }
          else if (lower.includes('contact') || (lower.includes('name') && !lower.includes('company') && !lower.includes('business'))) {
             newMapping[h] = 'contactName';
          }
          else if (lower.includes('email') || lower.includes('e-mail')) newMapping[h] = 'email';
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell')) newMapping[h] = 'phone';
          else if (lower.includes('website') || lower.includes('url') || lower.includes('web')) newMapping[h] = 'website';
          else if (lower.includes('size') || lower.includes('employees')) newMapping[h] = 'companySize';
          else if (lower.includes('value') || lower.includes('revenue') || lower.includes('deal')) newMapping[h] = 'estimatedValue';
          else if (lower.includes('users') || lower.includes('seats') || lower.includes('licenses')) newMapping[h] = 'potentialUsers';
          else if (lower.includes('source') || lower.includes('channel')) newMapping[h] = 'source';
          else if (lower.includes('priority') || lower.includes('temp')) newMapping[h] = 'priority';
        });

        setColumnMapping(newMapping);
        setImportStep(2);
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async () => {
    setImportStep(3);

    const leadsToImport: SoftwareLead[] = [];
    const skippedRows: number[] = [];

    parsedData.forEach((row, index) => {
      const lead: Partial<SoftwareLead> = {
        status: 'Prospect',
        priority: 'Warm',
        source: 'Inbound',
        estimatedValue: 0,
        potentialUsers: 1,
        assignedTo: assignToUserId,
        activities: [],
        tags: []
      };

      Object.keys(columnMapping).forEach(csvHeader => {
        const fieldName = columnMapping[csvHeader];
        if (fieldName && row[csvHeader]) {
          const value = row[csvHeader];
          if (fieldName === 'estimatedValue' || fieldName === 'potentialUsers') {
            const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
            (lead as any)[fieldName] = numValue;
          } else {
            (lead as any)[fieldName] = value;
          }
        }
      });

      if (lead.companyName && !lead.contactName) {
        lead.contactName = "Authorized Representative";
      }

      if (!lead.companyName) {
        skippedRows.push(index + 2);
      } else {
        const now = new Date().toISOString();
        const newLead: SoftwareLead = {
          id: generateUUID(),
          companyName: lead.companyName,
          contactName: lead.contactName || "Authorized Representative",
          email: lead.email || '',
          phone: lead.phone || '',
          website: lead.website || '',
          companySize: lead.companySize || '',
          status: lead.status as SoftwareLeadStatus || 'Prospect',
          priority: lead.priority as LeadPriority || 'Warm',
          source: lead.source as LeadSource || 'Inbound',
          potentialUsers: lead.potentialUsers || 1,
          estimatedValue: lead.estimatedValue || 0,
          assignedTo: assignToUserId,
          notes: `Imported from ${importSource}`,
          createdAt: now,
          updatedAt: now,
          activities: [{
            id: `act-${Date.now()}-${index}`,
            type: 'Note',
            description: `Lead imported from ${importSource}`,
            timestamp: now,
            userId: currentUser.id,
            userName: currentUser.name
          }],
          tags: []
        };
        leadsToImport.push(newLead);
      }
    });

    if (leadsToImport.length === 0) {
      alert(`No valid leads found. ${skippedRows.length} rows were skipped because they were missing Company Name.`);
      setImportStep(2);
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const lead of leadsToImport) {
        try {
          await onAddLead(lead);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          console.error('Failed to import lead:', lead.companyName, err);
          errorCount++;
        }
      }

      setShowImportModal(false);
      setImportStep(1);
      setCsvFile(null);
      setParsedData([]);
      setColumnMapping({});

      const message = `Import complete!\n✓ ${successCount} leads imported successfully\n${errorCount > 0 ? `✗ ${errorCount} leads failed\n` : ''}${skippedRows.length > 0 ? `⊘ ${skippedRows.length} rows skipped` : ''}`;
      alert(message);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import leads.');
      setImportStep(2);
    }
  };

  const saasReps = users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN);

  return (
    <div className="h-full flex flex-col">
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Target size={16} />
            <span>Total Leads</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle2 size={16} />
            <span>Closed Won</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{metrics.closedWon}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
            <Clock size={16} />
            <span>In Trial</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{metrics.inTrial}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <Flame size={16} />
            <span>Hot Leads</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{metrics.hot}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
            <AlertCircle size={16} />
            <span>Follow-ups</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{metrics.needsFollowUp}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <TrendingUp size={16} />
            <span>Conv. Rate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.conversionRate}%</div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SaaS CRM</h1>
          <p className="text-slate-500 text-sm">Manage and convert roofing software prospects</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>

          {/* Filters */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as LeadPriority | 'All')}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="All">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="All">All Reps</option>
            {saasReps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <button
            onClick={() => setShowImportModal(true)}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-200 shadow-sm whitespace-nowrap border border-slate-200"
            title="Import leads from CSV"
          >
            <Upload size={18}/> Import
          </button>

          <button
            onClick={() => {
              setForm({ status: 'Prospect', priority: 'Warm', source: 'Inbound', activities: [], estimatedValue: 0, potentialUsers: 1 });
              setSelectedLead(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm whitespace-nowrap"
          >
            <Plus size={18}/> New Lead
          </button>
        </div>
      </div>

      {/* List View (Default & Only) */}
      <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortField === 'companyName') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('companyName');
                      setSortDirection('asc');
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                >
                  Company <ArrowUpDown size={14} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Status (Funnel)</th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortField === 'priority') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('priority');
                      setSortDirection('desc');
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                >
                  Priority <ArrowUpDown size={14} />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortField === 'estimatedValue') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('estimatedValue');
                      setSortDirection('desc');
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                >
                  Value <ArrowUpDown size={14} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Next Follow-up</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Assigned</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedLeads.map(lead => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{lead.companyName}</div>
                  <div className="text-xs text-slate-500">{lead.source}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{lead.contactName}</div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail size={12} className="text-slate-400" /> {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone size={12} className="text-slate-400" /> {lead.phone}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Interactive Status Dropdown */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <select
                      value={lead.status}
                      onChange={(e) => handleQuickStatusUpdate(lead, e.target.value as SoftwareLeadStatus)}
                      className={`appearance-none w-full pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${getStatusColor(lead.status)}`}
                    >
                      {columns.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </td>

                {/* Interactive Priority Dropdown */}
                <td className="px-4 py-3">
                  <div className="relative w-28">
                    <select
                      value={lead.priority}
                      onChange={(e) => handleQuickPriorityUpdate(lead, e.target.value as LeadPriority)}
                      className={`appearance-none w-full pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg border cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${getPriorityColor(lead.priority)}`}
                    >
                      {priorities.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">${lead.estimatedValue?.toLocaleString() || 0}</div>
                  <div className="text-xs text-slate-500">{lead.potentialUsers} users</div>
                </td>
                <td className="px-4 py-3">
                  {lead.nextFollowUpDate ? (
                    <div className={`text-sm ${isFollowUpOverdue(lead) ? 'text-orange-600 font-semibold' : 'text-slate-700'}`}>
                      {new Date(lead.nextFollowUpDate).toLocaleDateString()}
                      {isFollowUpOverdue(lead) && <AlertCircle size={12} className="inline ml-1" />}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                    </div>
                    <span className="text-sm text-slate-700">{users.find(u => u.id === lead.assignedTo)?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setSelectedLead(lead); setShowActivityModal(true); }}
                      className="p-1.5 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                      title="Activities"
                    >
                      <MessageSquare size={14}/>
                    </button>
                    <button
                      onClick={() => { setForm(lead); setSelectedLead(lead); setShowModal(true); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold"
                      title="Edit Lead"
                    >
                      <Pencil size={12}/> Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedLeads.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Target size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">Try adjusting your filters or add a new lead</p>
          </div>
        )}
      </div>

      {/* Lead Edit/Create Modal (COMPACT 3-COLUMN LAYOUT) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            {/* Header - Fixed */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-xl">{form.id ? 'Edit Lead' : 'New SaaS Lead'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Edit lead details and status</p>
            </div>

            {/* Form Content - Scrollable & Compact */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Column 1: Core Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Details</h4>
                  <input
                    placeholder="Company Name *"
                    value={form.companyName || ''}
                    onChange={e => setForm({...form, companyName: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <input
                    placeholder="Contact Person *"
                    value={form.contactName || ''}
                    onChange={e => setForm({...form, contactName: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <input
                    placeholder="Company Size"
                    value={form.companySize || ''}
                    onChange={e => setForm({...form, companySize: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <input
                    placeholder="Website"
                    value={form.website || ''}
                    onChange={e => setForm({...form, website: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                {/* Column 2: Contact & Status */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact & Status</h4>
                  <input
                    placeholder="Email"
                    type="email"
                    value={form.email || ''}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <input
                    placeholder="Phone"
                    value={form.phone || ''}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.status}
                      onChange={e => setForm({...form, status: e.target.value as SoftwareLeadStatus})}
                      className="w-full p-2 border border-slate-300 rounded bg-white outline-none text-sm"
                    >
                      {columns.filter(c => c !== 'Lost').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={form.priority}
                      onChange={e => setForm({...form, priority: e.target.value as LeadPriority})}
                      className="w-full p-2 border border-slate-300 rounded bg-white outline-none text-sm"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <select
                    value={form.assignedTo}
                    onChange={e => setForm({...form, assignedTo: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded bg-white outline-none text-sm"
                  >
                    {saasReps.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Column 3: Value & Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deal & Notes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Users"
                      value={form.potentialUsers || ''}
                      onChange={e => setForm({...form, potentialUsers: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-slate-300 rounded outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Value ($)"
                      value={form.estimatedValue || ''}
                      onChange={e => setForm({...form, estimatedValue: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-slate-300 rounded outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Follow-up</label>
                      <input
                        type="date"
                        value={form.nextFollowUpDate?.split('T')[0] || ''}
                        onChange={e => setForm({...form, nextFollowUpDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Demo</label>
                      <input
                        type="date"
                        value={form.demoScheduledDate?.split('T')[0] || ''}
                        onChange={e => setForm({...form, demoScheduledDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>
                  <textarea
                    placeholder="Notes..."
                    value={form.notes || ''}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded h-20 outline-none resize-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              {form.id ? (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this lead?')) {
                      onDeleteLead(form.id!);
                      setShowModal(false);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium px-3 py-2 hover:bg-red-50 rounded transition-colors text-sm"
                >
                  <Trash2 size={16}/> Delete
                </button>
              ) : <div/>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setForm({ status: 'Prospect', priority: 'Warm', source: 'Inbound', activities: [], estimatedValue: 0, potentialUsers: 1 }); setSelectedLead(null); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.companyName || !form.contactName}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {form.id ? 'Update' : 'Create'} Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Import Software Leads</h3>
                <p className="text-sm text-slate-500">Import prospects from CSV files</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportStep(1); setCsvFile(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {importStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {['Generic CSV', 'HubSpot', 'Salesforce'].map(src => (
                      <button
                        key={src}
                        onClick={() => setImportSource(src)}
                        className={`p-4 border rounded-xl text-left transition-all ${importSource === src ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="font-bold text-slate-800 mb-1">{src}</div>
                        <div className="text-xs text-slate-500">CSV Export</div>
                      </button>
                    ))}
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv" />
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <FileSpreadsheet className="text-slate-400" size={32}/>
                    </div>
                    <h4 className="font-bold text-slate-700">Click to upload {importSource} file</h4>
                    <p className="text-sm text-slate-400 mt-2">or drag and drop CSV here</p>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="text-sm font-medium text-blue-900 flex items-center gap-2"><CheckCircle2 size={16}/> File Loaded: {csvFile?.name}</span>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded text-blue-600">{parsedData.length} Rows</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Assign All Leads To:</label>
                    <select
                      value={assignToUserId}
                      onChange={(e) => setAssignToUserId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">All {parsedData.length} leads will be assigned to this user</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-1/2">CSV Header ({importSource})</th>
                          <th className="px-4 py-3 w-1/2">RAFTER AI Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.map((header) => (
                          <tr key={header}>
                            <td className="px-4 py-3 font-medium text-slate-700">{header}</td>
                            <td className="px-4 py-3">
                              <select
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm bg-white"
                                value={columnMapping[header] || ''}
                                onChange={(e) => setColumnMapping({...columnMapping, [header]: e.target.value})}
                              >
                                <option value="">-- Ignore --</option>
                                <option value="companyName">Company Name</option>
                                <option value="contactName">Contact Name</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone Number</option>
                                <option value="website">Website</option>
                                <option value="companySize">Company Size</option>
                                <option value="status">Status</option>
                                <option value="priority">Priority</option>
                                <option value="source">Lead Source</option>
                                <option value="estimatedValue">Estimated Value ($)</option>
                                <option value="potentialUsers">Potential Users</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStep === 3 && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-bold text-slate-800">Importing Software Leads...</h3>
                  <p className="text-slate-500">Mapping data and creating records.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              {importStep === 1 && (
                <button disabled className="px-6 py-2 bg-slate-200 text-slate-400 rounded-lg font-bold cursor-not-allowed">Next Step</button>
              )}
              {importStep === 2 && (
                <>
                  <button onClick={() => setImportStep(1)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">Back</button>
                  <button onClick={handleImportSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2">
                    <Download size={18}/> Start Import
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-xl">{selectedLead.companyName}</h3>
                <p className="text-slate-500 text-sm">{selectedLead.contactName}</p>
              </div>
              <button
                onClick={() => { setShowActivityModal(false); setSelectedLead(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare size={18} />
                Activity Timeline
              </h4>

              <div className="space-y-3">
                {selectedLead.activities && selectedLead.activities.length > 0 ? (
                  [...selectedLead.activities].reverse().map(activity => (
                    <div key={activity.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        {activity.type === 'Call' && <Phone size={14} />}
                        {activity.type === 'Email' && <Mail size={14} />}
                        {activity.type === 'Meeting' && <UserIcon size={14} />}
                        {activity.type === 'Demo' && <Target size={14} />}
                        {activity.type === 'Note' && <MessageSquare size={14} />}
                        {activity.type === 'Status Change' && <TrendingUp size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 text-sm">{activity.type}</span>
                            <p className="text-slate-600 text-sm mt-1">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {activity.userName} • {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>No activities yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => { setShowActivityModal(false); setForm(selectedLead); setShowModal(true); }}
                className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLeads;