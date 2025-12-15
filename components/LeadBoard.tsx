import React, { useState, useMemo, useRef } from 'react';
import { Lead, LeadStatus, User } from '../types';
import { 
  Plus, Search, MapPin, MoreVertical, Filter, ArrowUpDown, 
  Users, Phone, Shield, Briefcase, Calendar, CheckCircle, 
  AlertCircle, DollarSign, Hammer, FileText,
  Bold, Italic, List, Mail, Upload, FileSpreadsheet, ArrowRight, Download, Check, X
} from 'lucide-react';
import LeadDetailPanel from './LeadDetailPanel';
import { useStore } from '../lib/store';

interface LeadBoardProps {
  leads: Lead[];
  users: User[];
  currentUser: User;
  viewMode: 'leads' | 'claims' | 'jobs';
  onDraftEmail: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onAddLead: (lead: Partial<Lead>) => void;
}

type SortField = 'name' | 'estimatedValue' | 'lastContact' | 'createdAt' | 'productionDate';
type SortOrder = 'asc' | 'desc';

const LeadBoard: React.FC<LeadBoardProps> = ({ 
  leads, users, currentUser, viewMode, onDraftEmail, onUpdateLead, onAddLead 
}) => {
  const { addToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // NEW: Import Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // New Lead Form State
  const [newLeadData, setNewLeadData] = useState<Partial<Lead>>({ name: '', address: '', source: 'Door Knocking', notes: '' });
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importSource, setImportSource] = useState('Generic CSV');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]); // Headers
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Markdown Helper
  const insertFormat = (symbol: string, wrap: boolean = true) => {
    const textarea = notesRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newLeadData.notes || '';
    
    let newText = '';
    if (wrap) {
        newText = text.substring(0, start) + symbol + text.substring(start, end) + symbol + text.substring(end);
    } else {
        newText = text.substring(0, start) + symbol + text.substring(start);
    }

    setNewLeadData({ ...newLeadData, notes: newText });
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + symbol.length, wrap ? end + symbol.length : start + symbol.length);
    }, 0);
  };

  // --- Derived State (Filtering & Sorting) ---
  const filteredAndSortedLeads = useMemo(() => {
    let result = leads.filter(lead => {
        // Search Filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            lead.name.toLowerCase().includes(searchLower) || 
            lead.address.toLowerCase().includes(searchLower) ||
            (lead.insuranceCarrier?.toLowerCase().includes(searchLower) ?? false) ||
            (lead.claimNumber?.toLowerCase().includes(searchLower) ?? false);

        // Status Filter
        const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;

        // Assignee Filter
        const matchesAssignee = filterAssignee === 'All' || lead.assignedTo === filterAssignee;

        return matchesSearch && matchesStatus && matchesAssignee;
    });

    // Sorting
    return result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        // Handle specific field types
        if (sortField === 'estimatedValue') {
            valA = valA || 0;
            valB = valB || 0;
        } else if (sortField === 'createdAt' || sortField === 'lastContact' || sortField === 'productionDate') {
             valA = valA ? new Date(valA).getTime() : 0;
             valB = valB ? new Date(valB).getTime() : 0;
        } else {
            valA = (valA || '').toLowerCase();
            valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [leads, searchTerm, filterStatus, filterAssignee, sortField, sortOrder]);


  // --- HELPERS ---

  const getAvailableStatuses = () => {
      switch(viewMode) {
          case 'leads': return [LeadStatus.NEW, LeadStatus.INSPECTION];
          case 'claims': return [LeadStatus.CLAIM_FILED, LeadStatus.ADJUSTER_MEETING, LeadStatus.APPROVED, LeadStatus.SUPPLEMENTING];
          case 'jobs': return [LeadStatus.PRODUCTION, LeadStatus.CLOSED];
          default: return [];
      }
  };

  const getStatusBadge = (status: LeadStatus) => {
    let color = 'bg-slate-100 text-slate-800 border-slate-200';
    switch (status) {
      case LeadStatus.NEW: color = 'bg-blue-50 text-blue-700 border-blue-200'; break;
      case LeadStatus.INSPECTION: color = 'bg-indigo-50 text-indigo-700 border-indigo-200'; break;
      case LeadStatus.CLAIM_FILED: color = 'bg-amber-50 text-amber-700 border-amber-200'; break;
      case LeadStatus.APPROVED: color = 'bg-emerald-50 text-emerald-700 border-emerald-200'; break;
      case LeadStatus.PRODUCTION: color = 'bg-purple-50 text-purple-700 border-purple-200'; break;
      case LeadStatus.CLOSED: color = 'bg-slate-200 text-slate-700 border-slate-300'; break;
      case LeadStatus.SUPPLEMENTING: color = 'bg-orange-50 text-orange-700 border-orange-200'; break;
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-semibold border ${color} whitespace-nowrap`}>{status}</span>;
  };

  const getSourceBadge = (source: string) => {
      let icon = <Users size={10}/>;
      if (source === 'Web') icon = <Search size={10}/>;
      if (source === 'Door Knocking') icon = <MapPin size={10}/>;
      return <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{icon} {source}</span>
  };

  const getProgress = (lead: Lead) => {
      if (!lead.productionSteps || lead.productionSteps.length === 0) return 0;
      const completed = lead.productionSteps.filter(s => s.status === 'Completed').length;
      return Math.round((completed / lead.productionSteps.length) * 100);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.name) return;
    onAddLead({
        ...newLeadData,
        status: LeadStatus.NEW,
        projectType: 'Unknown',
        estimatedValue: 0,
        phone: newLeadData.phone || 'Pending',
        lastContact: new Date().toISOString(),
        createdAt: new Date().toISOString().split('T')[0],
        assignedTo: currentUser.id
    });
    setIsAdding(false);
    setNewLeadData({ name: '', address: '', source: 'Door Knocking', notes: '' });
  };

  // --- IMPORT LOGIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setCsvFile(file);
          // Simple CSV Parser
          const reader = new FileReader();
          reader.onload = (evt) => {
              const text = evt.target?.result as string;
              const lines = text.split('\n');
              const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
              
              const data = lines.slice(1).filter(l => l.trim()).map(line => {
                  const values = line.split(','); // Basic split, regex needed for advanced CSVs
                  const obj: any = {};
                  headers.forEach((h, i) => {
                      obj[h] = values[i]?.trim().replace(/"/g, '') || '';
                  });
                  return obj;
              });

              setCsvPreview(headers);
              setParsedData(data);
              
              // Auto-Map if possible
              const newMapping: Record<string, string> = {};
              headers.forEach(h => {
                  const lower = h.toLowerCase();
                  if (lower.includes('name') || lower.includes('customer')) newMapping[h] = 'name';
                  else if (lower.includes('address') || lower.includes('street')) newMapping[h] = 'address';
                  else if (lower.includes('phone') || lower.includes('mobile')) newMapping[h] = 'phone';
                  else if (lower.includes('email')) newMapping[h] = 'email';
                  else if (lower.includes('source')) newMapping[h] = 'source';
                  else if (lower.includes('value') || lower.includes('revenue')) newMapping[h] = 'estimatedValue';
              });
              setColumnMapping(newMapping);
              setImportStep(2);
          };
          reader.readAsText(file);
      }
  };

  const handleImportSubmit = () => {
      setImportStep(3); // Loading state
      
      setTimeout(() => {
          let count = 0;
          parsedData.forEach(row => {
              const lead: Partial<Lead> = {
                  status: LeadStatus.NEW,
                  projectType: 'Unknown',
                  lastContact: new Date().toISOString(),
                  createdAt: new Date().toISOString().split('T')[0],
                  assignedTo: currentUser.id,
                  notes: 'Imported from ' + importSource
              };

              // Apply mapping
              Object.keys(columnMapping).forEach(csvHeader => {
                  const roofProField = columnMapping[csvHeader];
                  if (roofProField) {
                      if (roofProField === 'estimatedValue') {
                          lead.estimatedValue = parseFloat(row[csvHeader]) || 0;
                      } else {
                          // @ts-ignore
                          lead[roofProField] = row[csvHeader];
                      }
                  }
              });

              if (lead.name && lead.address) {
                  onAddLead(lead);
                  count++;
              }
          });

          addToast(`Successfully imported ${count} leads!`, 'success');
          setIsImporting(false);
          setImportStep(1);
          setCsvFile(null);
          setParsedData([]);
      }, 1500);
  };

  const toggleSort = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('desc');
      }
  };

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      
      {/* --- Metrics Row --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
         <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                {viewMode === 'leads' ? 'Pipeline Value' : viewMode === 'claims' ? 'Total RCV' : 'Projected Revenue'}
            </p>
            <h3 className="text-lg md:text-2xl font-bold text-slate-800">${filteredAndSortedLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0).toLocaleString()}</h3>
         </div>
         <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Active {viewMode}</p>
            <h3 className="text-lg md:text-2xl font-bold text-slate-800">{filteredAndSortedLeads.length}</h3>
         </div>
         {viewMode === 'leads' && (
             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm hidden md:block">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Conversion Rate</p>
                <h3 className="text-lg md:text-2xl font-bold text-indigo-600">24%</h3>
            </div>
         )}
         {viewMode === 'claims' && (
             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm hidden md:block">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Avg Approval</p>
                <h3 className="text-lg md:text-2xl font-bold text-emerald-600">85%</h3>
            </div>
         )}
         {viewMode === 'jobs' && (
             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm hidden md:block">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">On Schedule</p>
                <h3 className="text-lg md:text-2xl font-bold text-purple-600">92%</h3>
            </div>
         )}
      </div>

      {/* --- Main Board --- */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-0">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="flex flex-col md:flex-row gap-3 justify-between">
                <div className="relative flex-1 max-w-lg">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={`Search ${viewMode}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex-1 md:flex-none px-3 py-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter size={16} /> Filters
                    </button>
                    {viewMode === 'leads' && (
                        <>
                             <button 
                                onClick={() => setIsImporting(true)}
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                title="Import from CSV / JobNimbus"
                             >
                                <Upload size={16} />
                             </button>
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 text-sm font-semibold shadow-sm transition-all active:scale-95"
                            >
                                <Plus size={16} /> <span className="hidden md:inline">New Lead</span><span className="md:hidden">Add</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 animate-fade-in border-t border-slate-50 mt-2">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="All">All Statuses</option>
                            {getAvailableStatuses().map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Assigned User</label>
                        <select 
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="All">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Sort By</label>
                        <div className="flex gap-2">
                             <select 
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value as SortField)}
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="createdAt">Date Created</option>
                                <option value="lastContact">Last Contact</option>
                                <option value="estimatedValue">Value ($)</option>
                                <option value="name">Name (A-Z)</option>
                                {viewMode === 'jobs' && <option value="productionDate">Production Date</option>}
                            </select>
                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600"
                                title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                            >
                                <ArrowUpDown size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={() => { setFilterStatus('All'); setFilterAssignee('All'); setSortField('createdAt'); setSortOrder('desc'); }}
                            className="w-full py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* --- Content Area --- */}
        <div className="flex-1 overflow-y-auto bg-slate-50 md:bg-white p-0 md:p-0 custom-scrollbar relative">
            {filteredAndSortedLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center min-h-[300px]">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        {viewMode === 'leads' && <Users size={32} className="opacity-40" />}
                        {viewMode === 'claims' && <Shield size={32} className="opacity-40" />}
                        {viewMode === 'jobs' && <Hammer size={32} className="opacity-40" />}
                    </div>
                    <p className="font-medium text-lg text-slate-600">No {viewMode} found.</p>
                    <p className="text-sm mt-1">Try adjusting your filters or add a new {viewMode === 'leads' ? 'lead' : 'item'}.</p>
                </div>
            ) : (
                <>
                {/* --- LEADS VIEW TABLE --- */}
                {viewMode === 'leads' && (
                    <table className="hidden md:table w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('name')}>Prospect</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('estimatedValue')}>Est. Value</th>
                                <th className="px-6 py-4">Assigned Rep</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAndSortedLeads.map(lead => (
                                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{lead.name}</div>
                                        <div className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={10}/> {lead.address}</div>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                                    <td className="px-6 py-4">{getSourceBadge(lead.source || 'Other')}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600">${lead.estimatedValue.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                         <div className="flex items-center gap-2">
                                             <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                                 {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                             </div>
                                             <span className="text-slate-600 text-xs">{users.find(u => u.id === lead.assignedTo)?.name.split(' ')[0] || 'Unassigned'}</span>
                                         </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={(e) => { e.stopPropagation(); onDraftEmail(lead); }} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors">
                                            <MoreVertical size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* --- CLAIMS VIEW TABLE --- */}
                {viewMode === 'claims' && (
                    <table className="hidden md:table w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Carrier Info</th>
                                <th className="px-6 py-4">Adjuster</th>
                                <th className="px-6 py-4">RCV Value</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAndSortedLeads.map(lead => (
                                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{lead.name}</div>
                                        <div className="text-xs text-slate-500">{lead.address}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} className="text-blue-500"/>
                                            <span className="font-medium text-slate-700">{lead.insuranceCarrier || 'Unknown Carrier'}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">#{lead.claimNumber || 'No Claim #'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700 font-medium">{lead.adjusterName || 'Unassigned'}</div>
                                        <div className="text-xs text-slate-500">{lead.adjusterPhone || ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-slate-700">${lead.estimatedValue.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                            View Scope
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* --- JOBS VIEW TABLE --- */}
                {viewMode === 'jobs' && (
                     <table className="hidden md:table w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Schedule</th>
                                <th className="px-6 py-4">Progress</th>
                                <th className="px-6 py-4">Financials</th>
                                <th className="px-6 py-4">Project Mgr</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAndSortedLeads.map(lead => {
                                const progress = getProgress(lead);
                                return (
                                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{lead.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {lead.address}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.productionDate ? (
                                                <div className="flex items-center gap-2 text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                                                    <Calendar size={14} className="text-slate-500"/>
                                                    <span className="text-xs font-medium">{new Date(lead.productionDate).toLocaleDateString()}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">Unscheduled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 w-48">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-medium text-slate-600">{progress}% Complete</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-800">${lead.estimatedValue.toLocaleString()}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit font-bold ${lead.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : lead.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {lead.paymentStatus || 'Unpaid'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                 <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                                                     {users.find(u => u.id === lead.projectManagerId)?.avatarInitials || 'NA'}
                                                 </div>
                                                 <span className="text-slate-600 text-xs">{users.find(u => u.id === lead.projectManagerId)?.name.split(' ')[0] || 'No PM'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50">
                                                <MoreVertical size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}

                {/* --- MOBILE CARD VIEW (Responsive Fallback) --- */}
                <div className="md:hidden p-4 space-y-3 pb-24">
                    {filteredAndSortedLeads.map(lead => (
                        <div key={lead.id} onClick={() => setSelectedLead(lead)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{lead.name}</h3>
                                    <p className="text-xs text-slate-400">{new Date(lead.createdAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                                {getStatusBadge(lead.status)}
                            </div>
                            <p className="text-sm text-slate-500 flex items-start gap-1 mb-3">
                                <MapPin size={14} className="mt-0.5 shrink-0"/> {lead.address}
                            </p>
                            
                            {viewMode === 'claims' && lead.insuranceCarrier && (
                                <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center gap-2 text-xs text-blue-800 font-medium">
                                    <Shield size={14}/> {lead.insuranceCarrier} <span className="text-blue-400">|</span> #{lead.claimNumber}
                                </div>
                            )}

                            {viewMode === 'jobs' && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
                                        <span>Progress</span>
                                        <span>{getProgress(lead)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{width: `${getProgress(lead)}%`}}></div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-3 mt-1">
                                <span className="font-bold text-slate-800 text-lg">${lead.estimatedValue.toLocaleString()}</span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); window.location.href=`tel:${lead.phone}`}} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100">
                                        <Phone size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDraftEmail(lead); }} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100">
                                        <Mail size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailPanel 
            lead={selectedLead} 
            onClose={() => setSelectedLead(null)} 
            onUpdate={(l) => { onUpdateLead(l); setSelectedLead(l); }} 
            onDraftEmail={onDraftEmail} 
        />
      )}

      {/* Add Lead Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Add New Prospect</h3>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                         <input autoFocus placeholder="e.g. John Smith" value={newLeadData.name} onChange={e=>setNewLeadData({...newLeadData, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                         <input placeholder="e.g. 123 Maple Dr" value={newLeadData.address} onChange={e=>setNewLeadData({...newLeadData, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                         <input placeholder="(555) 123-4567" value={newLeadData.phone} onChange={e=>setNewLeadData({...newLeadData, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Source</label>
                         <select 
                             value={newLeadData.source} 
                             onChange={e=>setNewLeadData({...newLeadData, source: e.target.value as any})}
                             className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                         >
                             <option value="Door Knocking">Door Knocking</option>
                             <option value="Referral">Referral</option>
                             <option value="Web">Web Lead</option>
                             <option value="Ads">Ads</option>
                             <option value="Other">Other</option>
                         </select>
                    </div>
                    
                    {/* Notes Field with Markdown Support */}
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                         <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
                            <div className="flex items-center gap-1 p-1 bg-slate-50 border-b border-slate-200">
                                <button type="button" onClick={() => insertFormat('**')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Bold"><Bold size={14}/></button>
                                <button type="button" onClick={() => insertFormat('*')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Italic"><Italic size={14}/></button>
                                <button type="button" onClick={() => insertFormat('\n- ', false)} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="List"><List size={14}/></button>
                            </div>
                            <textarea
                                ref={notesRef}
                                placeholder="Add initial notes here... (Markdown supported)"
                                value={newLeadData.notes || ''}
                                onChange={e => setNewLeadData({...newLeadData, notes: e.target.value})}
                                className="w-full p-3 outline-none text-sm min-h-[100px] resize-y"
                            />
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm">Add Lead</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Import Modal */}
      {isImporting && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-fade-in flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Import Leads</h3>
                        <p className="text-sm text-slate-500">Migrate data from other platforms.</p>
                    </div>
                    <button onClick={() => { setIsImporting(false); setImportStep(1); setCsvFile(null); }} className="text-slate-400 hover:text-slate-600">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {importStep === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                {['Generic CSV', 'JobNimbus', 'AccuLynx'].map(src => (
                                    <button
                                        key={src}
                                        onClick={() => setImportSource(src)}
                                        className={`p-4 border rounded-xl text-left transition-all ${importSource === src ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <div className="font-bold text-slate-800 mb-1">{src}</div>
                                        <div className="text-xs text-slate-500">CSV Export</div>
                                    </button>
                                ))}
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors"
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
                            <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <span className="text-sm font-medium text-indigo-900 flex items-center gap-2"><CheckCircle size={16}/> File Loaded: {csvFile?.name}</span>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded text-indigo-600">{parsedData.length} Rows</span>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 w-1/2">CSV Header ({importSource})</th>
                                            <th className="px-4 py-3 w-1/2">ALTUS AI Field</th>
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
                                                        <option value="name">Full Name</option>
                                                        <option value="address">Address</option>
                                                        <option value="phone">Phone Number</option>
                                                        <option value="email">Email</option>
                                                        <option value="status">Status</option>
                                                        <option value="source">Lead Source</option>
                                                        <option value="estimatedValue">Value ($)</option>
                                                        <option value="notes">Notes</option>
                                                        <option value="insuranceCarrier">Carrier</option>
                                                        <option value="claimNumber">Claim #</option>
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
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-bold text-slate-800">Importing Leads...</h3>
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
                            <button onClick={handleImportSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                                <Download size={18}/> Start Import
                            </button>
                        </>
                    )}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default LeadBoard;