import React, { useState, useMemo } from 'react';
import { SoftwareLead, SoftwareLeadStatus, User, UserRole } from '../../types';
import { Plus, Search, Phone, Mail, X, Building2, Calendar, User as UserIcon, Save, ArrowRight, Trash2, FileText, Tag, DollarSign, LayoutGrid } from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
  onDeleteLead?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
  'Contacted': 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
  'Demo Booked': 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
  'Trial': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
  'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
  'Closed Lost': 'bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-slate-500/20',
};

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead, onDeleteLead }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<SoftwareLead>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
        const matchesSearch = l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUser = currentUser.role === UserRole.SUPER_ADMIN || l.assignedTo === currentUser.id;
        
        return matchesSearch && matchesUser;
    });
  }, [leads, searchQuery, currentUser]);

  // Metrics Logic
  const totalPipeline = filteredLeads.reduce((acc, curr) => acc + (curr.potentialUsers * 99 * 12), 0);
  const totalSeats = filteredLeads.reduce((acc, curr) => acc + curr.potentialUsers, 0);

  const handleEdit = (lead: SoftwareLead) => {
      setForm({ ...lead });
      setShowModal(true);
  };

  const handleNew = () => {
      setForm({ 
          status: 'New', 
          potentialUsers: 5, 
          assignedTo: currentUser.id,
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          notes: ''
      });
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.companyName || !form.contactName) return;

      if (form.id) {
          onUpdateLead(form as SoftwareLead);
      } else {
          onAddLead({
              id: `sl-${Date.now()}`,
              companyName: form.companyName!,
              contactName: form.contactName!,
              email: form.email || '',
              phone: form.phone || '',
              status: (form.status as SoftwareLeadStatus) || 'New',
              potentialUsers: form.potentialUsers || 5,
              assignedTo: form.assignedTo || currentUser.id,
              notes: form.notes || '',
              createdAt: new Date().toISOString()
          } as SoftwareLead);
      }
      setShowModal(false);
  };

  const handleDelete = () => {
      if (form.id && onDeleteLead) {
          if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
              onDeleteLead(form.id);
              setShowModal(false);
          }
      }
  };

  const saasReps = users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* 1. TOP METRICS & SEARCH */}
      <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex gap-8">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Prospects</p>
                <p className="text-2xl font-bold text-slate-900">{filteredLeads.length}</p>
            </div>
            <div className="w-px bg-slate-200 h-10 self-center hidden sm:block"></div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pipeline Value (ARR)</p>
                <p className="text-2xl font-bold text-emerald-600">${totalPipeline.toLocaleString()}</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                <input 
                    type="text" 
                    placeholder="Search pipeline..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-64 bg-white transition-all shadow-sm"
                />
            </div>
            <button 
                onClick={handleNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
                <Plus size={16}/> Add Prospect
            </button>
        </div>
      </div>

      {/* 2. MAIN TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm">
                <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Company / Date</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Contact Person</th>
                    <th className="px-6 py-3 border-b border-slate-200">Deal Size</th>
                    <th className="px-6 py-3 border-b border-slate-200">Assigned To</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => handleEdit(lead)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{lead.companyName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                                <Calendar size={10}/> Added {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_COLORS[lead.status] || 'bg-slate-100'}`}>
                                {lead.status}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <UserIcon size={12}/> 
                                </div>
                                {lead.contactName}
                            </div>
                            <div className="text-xs text-slate-500 pl-8 mt-0.5">
                                {lead.email}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-slate-900">{lead.potentialUsers}</span>
                                <span className="text-xs text-slate-500">Seats</span>
                            </div>
                            <div className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 rounded w-fit mt-1 border border-emerald-100">
                                ${ (lead.potentialUsers * 99).toLocaleString() }/mo
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                    {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                </div>
                                <span className="text-xs text-slate-600 font-medium">
                                    {users.find(u => u.id === lead.assignedTo)?.name.split(' ')[0]}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors inline-block">
                                <ArrowRight size={18}/>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-600">No leads found</p>
                <button onClick={handleNew} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">Add New Prospect</button>
            </div>
        )}
      </div>

      {/* 3. CENTERED MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in" 
                onClick={() => setShowModal(false)}
            />
            
            {/* Modal Panel */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                            {form.id ? 'Edit Opportunity' : 'New Prospect'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Fill in the details below to track this deal.</p>
                    </div>
                    <button 
                        onClick={() => setShowModal(false)} 
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                {/* Scrollable Form Content */}
                <form id="lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    
                    {/* SECTION 1: Company Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wide border-b border-slate-100 pb-2">
                            <Building2 size={14}/> Company & Deal Info
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                            <input 
                                required 
                                autoFocus
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                                value={form.companyName || ''} 
                                onChange={e => setForm({...form, companyName: e.target.value})} 
                                placeholder="e.g. Apex Roofing Inc." 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                            <div className="relative">
                                <Tag size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select 
                                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-sm font-medium appearance-none" 
                                    value={form.status} 
                                    onChange={e => setForm({...form, status: e.target.value as any})}
                                >
                                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Potential Seats</label>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-3 text-slate-400" />
                                <input 
                                    type="number" 
                                    min="1" 
                                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
                                    value={form.potentialUsers} 
                                    onChange={e => setForm({...form, potentialUsers: parseInt(e.target.value)})} 
                                />
                            </div>
                        </div>

                        {currentUser.role === UserRole.SUPER_ADMIN && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assigned Representative</label>
                                <select 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={form.assignedTo}
                                    onChange={e => setForm({...form, assignedTo: e.target.value})}
                                >
                                    {saasReps.map(rep => (
                                        <option key={rep.id} value={rep.id}>
                                            {rep.name} ({rep.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wide border-b border-slate-100 pb-2">
                            <UserIcon size={14}/> Primary Contact
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                            <input required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="e.g. John Smith" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                                <input type="email" className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                                <input type="tel" className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 123-4567" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Notes */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wide border-b border-slate-100 pb-2">
                            <FileText size={14}/> Sales Notes
                        </div>
                        <textarea 
                            className="w-full p-4 border border-slate-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed bg-slate-50 focus:bg-white transition-colors" 
                            value={form.notes || ''} 
                            onChange={e => setForm({...form, notes: e.target.value})} 
                            placeholder="Add meeting notes, next steps, or specific requirements here..." 
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-4 justify-between items-center">
                    {form.id ? (
                        <button 
                            type="button"
                            onClick={handleDelete} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                        >
                            <Trash2 size={16}/> Delete
                        </button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowModal(false)} 
                            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            form="lead-form"
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-indigo-200 flex items-center gap-2 transition-all transform active:scale-[0.98] text-sm"
                        >
                            <Save size={18}/> 
                            {form.id ? 'Save Changes' : 'Create Prospect'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLeads;