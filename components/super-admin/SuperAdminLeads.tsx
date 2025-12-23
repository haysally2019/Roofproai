import React, { useState, useMemo } from 'react';
import { SoftwareLead, SoftwareLeadStatus, User, UserRole } from '../../types';
import { Plus, Search, Phone, Mail, X, Building2, Calendar, User as UserIcon, Save, ArrowRight, Trash2, LayoutGrid, List } from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
  onDeleteLead?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-700 border-blue-200',
  'Contacted': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Demo Booked': 'bg-purple-100 text-purple-700 border-purple-200',
  'Trial': 'bg-amber-100 text-amber-700 border-amber-200',
  'Closed Won': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Closed Lost': 'bg-slate-100 text-slate-600 border-slate-200',
};

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead, onDeleteLead }) => {
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [form, setForm] = useState<Partial<SoftwareLead>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
        const matchesSearch = l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
        // SaaS Reps only see their own leads, Super Admins see all
        const matchesUser = currentUser.role === UserRole.SUPER_ADMIN || l.assignedTo === currentUser.id;
        
        return matchesSearch && matchesUser;
    });
  }, [leads, searchQuery, currentUser]);

  // Metrics Logic
  const totalPipeline = filteredLeads.reduce((acc, curr) => acc + (curr.potentialUsers * 99 * 12), 0); // Annual Value
  const totalSeats = filteredLeads.reduce((acc, curr) => acc + curr.potentialUsers, 0);

  const handleEdit = (lead: SoftwareLead) => {
      setForm({ ...lead });
      setIsSlideOverOpen(true);
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
      setIsSlideOverOpen(true);
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
      setIsSlideOverOpen(false);
  };

  const handleDelete = () => {
      if (form.id && onDeleteLead) {
          if (confirm('Are you sure you want to delete this lead?')) {
              onDeleteLead(form.id);
              setIsSlideOverOpen(false);
          }
      }
  };

  // Get list of SaaS Reps for assignment dropdown
  const saasReps = users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* 1. PIPELINE METRICS BAR */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-6 items-center shrink-0">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Prospects</p>
            <p className="text-2xl font-bold text-slate-900">{filteredLeads.length}</p>
        </div>
        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Value (ARR)</p>
            <p className="text-2xl font-bold text-emerald-600">${totalPipeline.toLocaleString()}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                    type="text" 
                    placeholder="Search companies..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 bg-white transition-all focus:w-72"
                />
            </div>
            <button 
                onClick={handleNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
                <Plus size={16}/> Add Prospect
            </button>
        </div>
      </div>

      {/* 2. DATA TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm">
                <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Company</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Contact</th>
                    <th className="px-6 py-3 border-b border-slate-200">Deal Size</th>
                    <th className="px-6 py-3 border-b border-slate-200">Assigned To</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Edit</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => handleEdit(lead)} className="hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{lead.companyName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar size={10}/> Added {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[lead.status] || 'bg-slate-100'}`}>
                                {lead.status}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <UserIcon size={14} className="text-slate-400"/> {lead.contactName}
                            </div>
                            <div className="text-xs text-slate-500 pl-6 space-y-0.5">
                                {lead.email && <div className="hover:text-indigo-600 transition-colors">{lead.email}</div>}
                                {lead.phone && <div>{lead.phone}</div>}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{lead.potentialUsers} Seats</div>
                            <div className="text-xs text-emerald-600 font-medium">
                                ${ (lead.potentialUsers * 99).toLocaleString() } / mo
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                </div>
                                <span className="text-sm text-slate-600">{users.find(u => u.id === lead.assignedTo)?.name.split(' ')[0]}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                <ArrowRight size={18}/>
                            </button>
                        </td>
                    </tr>
                ))}
                {filteredLeads.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic bg-slate-50/50">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                    <Search className="text-slate-300" size={24}/>
                                </div>
                                <p>No leads found matching your criteria.</p>
                                <button onClick={handleNew} className="text-indigo-600 font-bold hover:underline text-sm">Create new prospect</button>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* 3. SLIDE-OVER FORM */}
      {isSlideOverOpen && (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity" onClick={() => setIsSlideOverOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col animate-slide-in-right">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">{form.id ? 'Edit Opportunity' : 'New Prospect'}</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage deal details and status.</p>
                    </div>
                    <button onClick={() => setIsSlideOverOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* SECTION 1: Company Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-indigo-100">
                            <Building2 size={14}/> Deal Information
                        </h4>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                            <input required className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={form.companyName || ''} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="e.g. Apex Roofing" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                <select className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Est. Seats</label>
                                <div className="relative">
                                    <input type="number" min="1" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pl-3" value={form.potentialUsers} onChange={e => setForm({...form, potentialUsers: parseInt(e.target.value)})} />
                                    <div className="absolute right-3 top-3 text-xs text-slate-400 font-bold pointer-events-none">USERS</div>
                                </div>
                            </div>
                        </div>

                        {/* Assign To (Only for Super Admins) */}
                        {currentUser.role === UserRole.SUPER_ADMIN && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assigned Representative</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-indigo-100">
                            <UserIcon size={14}/> Primary Contact
                        </h4>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                            <input required className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="e.g. John Smith" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                <input type="email" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@apex.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                                <input type="tel" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 123-4567" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Notes */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-indigo-100">
                            <List size={14}/> Notes
                        </h4>
                        <textarea className="w-full p-4 border border-slate-200 rounded-lg h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Enter call notes, next steps, or specific requirements..." />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-4 justify-between items-center">
                    {form.id ? (
                        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <Trash2 size={18}/> Delete
                        </button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsSlideOverOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg flex items-center gap-2 transition-all transform active:scale-95">
                            <Save size={18}/> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminLeads;