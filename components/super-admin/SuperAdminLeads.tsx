import React, { useState } from 'react';
import { SoftwareLead, User, UserRole } from '../../types';
import { Plus, Search, Phone, Mail, ArrowRight, DollarSign, Calendar, Building2 } from 'lucide-react';

interface Props {
  leads: SoftwareLead[];
  users: User[];
  currentUser: User;
  onAddLead: (lead: SoftwareLead) => void;
  onUpdateLead: (lead: SoftwareLead) => void;
}

const STAGES = ['New', 'Contacted', 'Demo Booked', 'Trial', 'Closed Won', 'Closed Lost'];

const SuperAdminLeads: React.FC<Props> = ({ leads, users, currentUser, onAddLead, onUpdateLead }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState<Partial<SoftwareLead>>({ status: 'New', potentialUsers: 5 });

  // Filter leads: Super Admins see all, SaaS Reps see only theirs
  const myLeads = currentUser.role === UserRole.SUPER_ADMIN 
    ? leads 
    : leads.filter(l => l.assignedTo === currentUser.id);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.companyName || !newLead.contactName) return;
    
    onAddLead({
        id: `sl-${Date.now()}`,
        companyName: newLead.companyName,
        contactName: newLead.contactName,
        email: newLead.email || '',
        phone: newLead.phone || '',
        status: 'New',
        potentialUsers: newLead.potentialUsers || 5,
        assignedTo: currentUser.id,
        notes: '',
        createdAt: new Date().toISOString()
    });
    setShowModal(false);
    setNewLead({ status: 'New', potentialUsers: 5 });
  };

  const moveStage = (lead: SoftwareLead, direction: 'next' | 'prev') => {
      const currentIndex = STAGES.indexOf(lead.status);
      if (currentIndex === -1) return;
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex >= 0 && newIndex < STAGES.length) {
          onUpdateLead({ ...lead, status: STAGES[newIndex] });
      }
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Pipeline</h2>
          <p className="text-slate-500 text-sm">Manage your SaaS prospects and demos.</p>
        </div>
        <div className="flex gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 rounded-md ${viewMode === 'kanban' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Board</button>
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>List</button>
            </div>
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <Plus size={18}/> New Lead
            </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {viewMode === 'kanban' && (
          <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[1200px] h-full">
                  {STAGES.map(stage => {
                      const stageLeads = myLeads.filter(l => l.status === stage);
                      const totalPotential = stageLeads.reduce((acc, curr) => acc + (curr.potentialUsers * 99), 0); // Approx MRR

                      return (
                          <div key={stage} className="flex-1 flex flex-col min-w-[280px] bg-slate-50 rounded-xl border border-slate-200 h-full">
                              <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl">
                                  <div className="flex justify-between items-center mb-1">
                                      <h3 className="font-bold text-slate-700">{stage}</h3>
                                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{stageLeads.length}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 font-medium">Est. MRR: ${totalPotential.toLocaleString()}</p>
                              </div>
                              
                              <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                  {stageLeads.map(lead => (
                                      <div key={lead.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="font-bold text-slate-800 text-sm truncate">{lead.companyName}</span>
                                              {stage !== 'Closed Won' && (
                                                  <button onClick={(e) => { e.stopPropagation(); moveStage(lead, 'next'); }} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <ArrowRight size={16} />
                                                  </button>
                                              )}
                                          </div>
                                          <div className="space-y-1">
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                  <Building2 size={12}/> {lead.contactName}
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                  <Mail size={12}/> {lead.email}
                                              </div>
                                          </div>
                                          <div className="mt-3 flex items-center justify-between">
                                              <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold">{lead.potentialUsers} Seats</span>
                                              <span className="text-[10px] text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* NEW LEAD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold mb-4">Add Sales Prospect</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Company Name</label>
                        <input required className="w-full p-2 border rounded-lg" value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName: e.target.value})} placeholder="Apex Roofing" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Contact Person</label>
                        <input required className="w-full p-2 border rounded-lg" value={newLead.contactName} onChange={e => setNewLead({...newLead, contactName: e.target.value})} placeholder="John Doe" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                            <input type="email" className="w-full p-2 border rounded-lg" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Est. Seats</label>
                            <input type="number" className="w-full p-2 border rounded-lg" value={newLead.potentialUsers} onChange={e => setNewLead({...newLead, potentialUsers: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Add Prospect</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLeads;