import React, { useState } from 'react';
import { SoftwareLead, SoftwareLeadStatus, User, UserRole } from '../../types';
import { Plus, Search, Phone, Mail, User as UserIcon, MoreHorizontal, Trash2 } from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
  onDeleteLead: (id: string) => void;
}

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead, onDeleteLead }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<SoftwareLead>>({ status: 'Prospect' });

  const columns: SoftwareLeadStatus[] = ['Prospect', 'Contacted', 'Demo Booked', 'Trial', 'Closed Won'];

  const handleSave = () => {
    if (!form.companyName || !form.contactName) return;
    
    if (form.id) {
        onUpdateLead(form as SoftwareLead);
    } else {
        const newLead: SoftwareLead = {
            id: `sl-${Date.now()}`,
            companyName: form.companyName,
            contactName: form.contactName,
            email: form.email || '',
            phone: form.phone || '',
            status: form.status || 'Prospect',
            potentialUsers: form.potentialUsers || 1,
            assignedTo: form.assignedTo || currentUser.id,
            notes: form.notes || '',
            createdAt: new Date().toISOString()
        };
        onAddLead(newLead);
    }
    setShowModal(false);
    setForm({ status: 'Prospect' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">SaaS CRM</h1>
        <button 
           onClick={() => { setForm({ status: 'Prospect' }); setShowModal(true); }}
           className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"
        >
            <Plus size={18}/> New Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-[1000px] pb-4">
            {columns.map(status => (
                <div key={status} className="flex-1 min-w-[280px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60">
                    <div className="p-3 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                        <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">{status}</span>
                        <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            {leads.filter(l => l.status === status).length}
                        </span>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {leads.filter(l => l.status === status).map(lead => (
                            <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                    <button onClick={() => { setForm(lead); setShowModal(true); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><MoreHorizontal size={16}/></button>
                                </div>
                                <h4 className="font-bold text-slate-900">{lead.companyName}</h4>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                    <UserIcon size={12}/> {lead.contactName}
                                </div>
                                <div className="mt-3 flex gap-2">
                                     {lead.phone && <a href={`tel:${lead.phone}`} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"><Phone size={14}/></a>}
                                     {lead.email && <a href={`mailto:${lead.email}`} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Mail size={14}/></a>}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Users: {lead.potentialUsers}</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                            {users.find(u => u.id === lead.assignedTo)?.avatarInitials || '?'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
               <h3 className="font-bold text-lg mb-4">{form.id ? 'Edit Lead' : 'New SaaS Lead'}</h3>
               <div className="space-y-4">
                   <input 
                      placeholder="Company Name" 
                      value={form.companyName || ''}
                      onChange={e => setForm({...form, companyName: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                   />
                   <input 
                      placeholder="Contact Person" 
                      value={form.contactName || ''}
                      onChange={e => setForm({...form, contactName: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                   />
                   <div className="grid grid-cols-2 gap-2">
                       <input 
                          placeholder="Phone" 
                          value={form.phone || ''}
                          onChange={e => setForm({...form, phone: e.target.value})}
                          className="w-full p-2 border rounded-lg"
                       />
                       <input 
                          type="number"
                          placeholder="Potential Users" 
                          value={form.potentialUsers || ''}
                          onChange={e => setForm({...form, potentialUsers: parseInt(e.target.value)})}
                          className="w-full p-2 border rounded-lg"
                       />
                   </div>
                   <select 
                       value={form.status}
                       onChange={e => setForm({...form, status: e.target.value as SoftwareLeadStatus})}
                       className="w-full p-2 border rounded-lg bg-white"
                   >
                       {columns.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <select 
                       value={form.assignedTo}
                       onChange={e => setForm({...form, assignedTo: e.target.value})}
                       className="w-full p-2 border rounded-lg bg-white"
                   >
                       {users.filter(u => u.role === UserRole.SAAS_REP || u.role === UserRole.SUPER_ADMIN).map(u => (
                           <option key={u.id} value={u.id}>{u.name}</option>
                       ))}
                   </select>
                   <textarea 
                      placeholder="Notes..."
                      value={form.notes || ''}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      className="w-full p-2 border rounded-lg h-24"
                   />
               </div>
               <div className="flex justify-between mt-6">
                   {form.id ? (
                       <button onClick={() => { onDeleteLead(form.id!); setShowModal(false); }} className="text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={16}/> Delete</button>
                   ) : <div/>}
                   <div className="flex gap-2">
                       <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                       <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save Lead</button>
                   </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminLeads;