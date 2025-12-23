import React, { useState, useMemo } from 'react';
import { SoftwareLead, SoftwareLeadStatus, User, UserRole } from '../../types';
import { Plus, Search, Phone, Mail, Filter, MoreHorizontal, X, Building2, Calendar, DollarSign, User as UserIcon, Trash2, Save, ArrowRight } from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-700 border-blue-200',
  'Contacted': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Demo Booked': 'bg-purple-100 text-purple-700 border-purple-200',
  'Trial': 'bg-amber-100 text-amber-700 border-amber-200',
  'Closed Won': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Closed Lost': 'bg-slate-100 text-slate-600 border-slate-200',
};

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead }) => {
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [form, setForm] = useState<Partial<SoftwareLead>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filter Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
        const matchesSearch = l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
        // SaaS Reps only see their own leads, Super Admins see all
        const matchesUser = currentUser.role === UserRole.SUPER_ADMIN || l.assignedTo === currentUser.id;
        
        return matchesSearch && matchesStatus && matchesUser;
    });
  }, [leads, searchQuery, statusFilter, currentUser]);

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
          assignedTo: currentUser.id 
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

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* 1. PIPELINE METRICS BAR */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-6 items-center">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Prospects</p>
            <p className="text-2xl font-bold text-slate-900">{filteredLeads.length}</p>
        </div>
        <div className="h-8 w-px bg-slate-200"></div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Value (ARR)</p>
            <p className="text-2xl font-bold text-emerald-600">${totalPipeline.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px bg-slate-200"></div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Seats</p>
            <p className="text-2xl font-bold text-indigo-600">{totalSeats}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                    type="text" 
                    placeholder="Search companies..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 bg-white"
                />
            </div>
            <button 
                onClick={handleNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
                <Plus size={16}/> Add Prospect
            </button>
        </div>
      </div>

      {/* 2. DATA TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Company</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Contact</th>
                    <th className="px-6 py-3 border-b border-slate-200">Seats / Value</th>
                    <th className="px-6 py-3 border-b border-slate-200">Rep</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => handleEdit(lead)} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
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
                                {lead.email && <div className="hover:text-indigo-600">{lead.email}</div>}
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
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                </div>
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
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            No leads found. Start selling by adding a prospect!
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* 3. SLIDE-OVER FORM (Better than Modal) */}
      {isSlideOverOpen && (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSlideOverOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{form.id ? 'Edit Opportunity' : 'New Prospect'}</h3>
                    <button onClick={() => setIsSlideOverOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* SECTION 1: Company Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Building2 size={14}/> Company Details</h4>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                            <input required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.companyName || ''} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="e.g. Apex Roofing" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Potential Seats</label>
                                <input type="number" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.potentialUsers} onChange={e => setForm({...form, potentialUsers: parseInt(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* SECTION 2: Contact Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><UserIcon size={14}/> Primary Contact</h4>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="e.g. John Smith" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input type="email" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@apex.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input type="tel" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 123-4567" />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* SECTION 3: Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes & Next Steps</label>
                        <textarea className="w-full p-3 border border-slate-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Met at expo, interested in AI features..." />
                    </div>
                </