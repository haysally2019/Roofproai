import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Search, X, Eye, Edit2, Download, Send, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface DBContract {
  id: string;
  company_id: string;
  lead_id: string;
  proposal_id: string | null;
  number: string;
  type: string;
  status: 'Draft' | 'Sent' | 'Signed' | 'Active' | 'Completed' | 'Cancelled';
  created_date: string;
  sent_date: string | null;
  signed_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  project_description: string;
  scope_of_work: string[];
  materials: string[];
  total_amount: number;
  deposit_amount: number;
  payment_schedule: Array<{
    milestone: string;
    amount: number;
    status: string;
  }>;
  terms: string[];
  warranty: string;
  client_signature: string | null;
  contractor_signature: string | null;
  notes: string | null;
  leads: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

const ContractsNew: React.FC = () => {
  const { currentUser, addToast } = useStore();
  const [contracts, setContracts] = useState<DBContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedContract, setSelectedContract] = useState<DBContract | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; email: string; phone: string; address: string }>>([]);
  const [newContract, setNewContract] = useState({
    leadId: '',
    type: 'Residential Roofing',
    projectDescription: '',
    scopeOfWork: [''],
    materials: [''],
    totalAmount: 0,
    depositAmount: 0,
    warranty: '10 Year Workmanship Warranty',
    terms: ['Payment due within 30 days', 'Work to be completed within agreed timeline']
  });

  useEffect(() => {
    loadContracts();
    loadLeads();
  }, [currentUser?.companyId]);

  const loadLeads = async () => {
    if (!currentUser?.companyId) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, address')
        .eq('company_id', currentUser.companyId)
        .order('name');

      if (error) throw error;
      if (data) setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadContracts = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          leads (
            name,
            email,
            phone,
            address
          )
        `)
        .eq('company_id', currentUser.companyId)
        .order('created_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setContracts(data as unknown as DBContract[]);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      addToast('Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendContract = async (contract: DBContract) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'Sent',
          sent_date: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      addToast('Contract sent successfully', 'success');
      loadContracts();
    } catch (error) {
      console.error('Error sending contract:', error);
      addToast('Failed to send contract', 'error');
    }
  };

  const handleMarkAsSigned = async (contract: DBContract) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'Signed',
          signed_date: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      addToast('Contract marked as signed', 'success');
      loadContracts();
    } catch (error) {
      console.error('Error updating contract:', error);
      addToast('Failed to update contract', 'error');
    }
  };

  const handleMarkAsActive = async (contract: DBContract) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'Active',
          start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', contract.id);

      if (error) throw error;

      addToast('Contract activated', 'success');
      loadContracts();
    } catch (error) {
      console.error('Error updating contract:', error);
      addToast('Failed to update contract', 'error');
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addToast('Contract deleted successfully', 'success');
      loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      addToast('Failed to delete contract', 'error');
    }
  };

  const handleCreateContract = async () => {
    if (!newContract.leadId) {
      addToast('Please select a client', 'error');
      return;
    }

    try {
      const contractNumber = `CON-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase
        .from('contracts')
        .insert({
          company_id: currentUser!.companyId,
          lead_id: newContract.leadId,
          number: contractNumber,
          type: newContract.type,
          status: 'Draft',
          created_date: new Date().toISOString(),
          project_description: newContract.projectDescription,
          scope_of_work: newContract.scopeOfWork.filter(s => s.trim() !== ''),
          materials: newContract.materials.filter(m => m.trim() !== ''),
          total_amount: newContract.totalAmount,
          deposit_amount: newContract.depositAmount,
          payment_schedule: [
            { milestone: 'Deposit', amount: newContract.depositAmount, status: 'Pending' },
            { milestone: 'Final Payment', amount: newContract.totalAmount - newContract.depositAmount, status: 'Pending' }
          ],
          terms: newContract.terms,
          warranty: newContract.warranty
        });

      if (error) throw error;

      addToast('Contract created successfully', 'success');
      setShowCreateModal(false);
      setNewContract({
        leadId: '',
        type: 'Residential Roofing',
        projectDescription: '',
        scopeOfWork: [''],
        materials: [''],
        totalAmount: 0,
        depositAmount: 0,
        warranty: '10 Year Workmanship Warranty',
        terms: ['Payment due within 30 days', 'Work to be completed within agreed timeline']
      });
      loadContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      addToast('Failed to create contract', 'error');
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.leads.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DBContract['status']) => {
    switch (status) {
      case 'Signed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Active': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'Draft').length,
    sent: contracts.filter(c => c.status === 'Sent').length,
    signed: contracts.filter(c => c.status === 'Signed').length,
    active: contracts.filter(c => c.status === 'Active').length,
    completed: contracts.filter(c => c.status === 'Completed').length,
    totalValue: contracts.reduce((sum, c) => sum + c.total_amount, 0)
  };

  if (viewMode === 'detail' && selectedContract) {
    return (
      <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedContract(null);
            }}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Contracts
          </button>
          <div className="flex gap-2">
            {selectedContract.status === 'Draft' && (
              <button
                onClick={() => handleSendContract(selectedContract)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Send size={20} />
                Send to Client
              </button>
            )}
            {selectedContract.status === 'Sent' && (
              <button
                onClick={() => handleMarkAsSigned(selectedContract)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Mark as Signed
              </button>
            )}
            {selectedContract.status === 'Signed' && (
              <button
                onClick={() => handleMarkAsActive(selectedContract)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Activate Contract
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Contract {selectedContract.number}</h1>
                <p className="text-emerald-100">{selectedContract.type}</p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border bg-white ${getStatusColor(selectedContract.status)}`}>
                {selectedContract.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-semibold text-emerald-100 uppercase mb-2">Client Information</h3>
                <p className="font-semibold text-lg">{selectedContract.leads.name}</p>
                <p className="text-emerald-100">{selectedContract.leads.address}</p>
                <p className="text-emerald-100">{selectedContract.leads.phone}</p>
                <p className="text-emerald-100">{selectedContract.leads.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-100 uppercase mb-2">Contract Details</h3>
                <div className="space-y-1 text-emerald-100">
                  <p>Created: {new Date(selectedContract.created_date).toLocaleDateString()}</p>
                  {selectedContract.sent_date && <p>Sent: {new Date(selectedContract.sent_date).toLocaleDateString()}</p>}
                  {selectedContract.signed_date && <p>Signed: {new Date(selectedContract.signed_date).toLocaleDateString()}</p>}
                  {selectedContract.start_date && <p>Start: {new Date(selectedContract.start_date).toLocaleDateString()}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Project Description</h3>
              <p className="text-slate-700">{selectedContract.project_description}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Scope of Work</h3>
              <ul className="space-y-2">
                {selectedContract.scope_of_work.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Materials</h3>
              <ul className="space-y-2">
                {selectedContract.materials.map((material, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />
                    <span className="text-slate-700">{material}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm text-blue-700 mb-1">Total Contract Value</p>
                  <p className="text-3xl font-bold text-blue-900">${selectedContract.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-1">Required Deposit</p>
                  <p className="text-3xl font-bold text-emerald-600">${selectedContract.deposit_amount.toLocaleString()}</p>
                </div>
              </div>

              <h4 className="text-md font-bold text-blue-900 mb-3">Payment Schedule</h4>
              <div className="space-y-2">
                {selectedContract.payment_schedule.map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{payment.milestone}</p>
                      <p className="text-sm text-slate-600">{payment.status}</p>
                    </div>
                    <p className="font-bold text-slate-900">${payment.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Warranty</h3>
              <p className="text-slate-700">{selectedContract.warranty}</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Terms & Conditions</h3>
              <ul className="space-y-2">
                {selectedContract.terms.map((term, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-slate-400">{idx + 1}.</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileSignature className="text-emerald-600" />
            Contracts
          </h1>
          <p className="text-slate-500 mt-1">Manage client contracts and agreements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          New Contract
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Contracts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Signed</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.signed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-slate-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Awaiting Signature</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Value</p>
          <p className="text-2xl font-bold text-emerald-600">${(stats.totalValue / 1000).toFixed(0)}K</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>All</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Signed</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading contracts...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileSignature size={48} className="mx-auto text-slate-300 mb-4" />
            <p>No contracts found</p>
            <p className="text-sm mt-2">Contracts are created from accepted proposals</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Contract #</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Value</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setViewMode('detail');
                        }}
                        className="font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        {contract.number}
                      </button>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{contract.leads.name}</p>
                      <p className="text-sm text-slate-500">{contract.leads.address}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700">{contract.type}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">${contract.total_amount.toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{new Date(contract.created_date).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setViewMode('detail');
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} className="text-slate-600" />
                        </button>
                        {contract.status === 'Draft' && (
                          <button
                            onClick={() => handleSendContract(contract)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send"
                          >
                            <Send size={18} className="text-blue-600" />
                          </button>
                        )}
                        {contract.status === 'Sent' && (
                          <button
                            onClick={() => handleMarkAsSigned(contract)}
                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Mark as Signed"
                          >
                            <CheckCircle size={18} className="text-emerald-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Create New Contract</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Client *</label>
                <select
                  value={newContract.leadId}
                  onChange={(e) => setNewContract({ ...newContract, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a client</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} - {lead.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contract Type *</label>
                <select
                  value={newContract.type}
                  onChange={(e) => setNewContract({ ...newContract, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option>Residential Roofing</option>
                  <option>Commercial Roofing</option>
                  <option>Insurance Claim</option>
                  <option>Warranty Work</option>
                  <option>Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Project Description *</label>
                <textarea
                  value={newContract.projectDescription}
                  onChange={(e) => setNewContract({ ...newContract, projectDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Describe the roofing project..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Scope of Work</label>
                {newContract.scopeOfWork.map((scope, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      value={scope}
                      onChange={(e) => {
                        const updated = [...newContract.scopeOfWork];
                        updated[idx] = e.target.value;
                        setNewContract({ ...newContract, scopeOfWork: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter scope item..."
                    />
                    <button
                      onClick={() => {
                        const updated = newContract.scopeOfWork.filter((_, i) => i !== idx);
                        setNewContract({ ...newContract, scopeOfWork: updated });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewContract({ ...newContract, scopeOfWork: [...newContract.scopeOfWork, ''] })}
                  className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Materials</label>
                {newContract.materials.map((material, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      value={material}
                      onChange={(e) => {
                        const updated = [...newContract.materials];
                        updated[idx] = e.target.value;
                        setNewContract({ ...newContract, materials: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter material..."
                    />
                    <button
                      onClick={() => {
                        const updated = newContract.materials.filter((_, i) => i !== idx);
                        setNewContract({ ...newContract, materials: updated });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewContract({ ...newContract, materials: [...newContract.materials, ''] })}
                  className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                >
                  <Plus size={16} /> Add Material
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Total Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={newContract.totalAmount || ''}
                      onChange={(e) => setNewContract({ ...newContract, totalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deposit Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={newContract.depositAmount || ''}
                      onChange={(e) => setNewContract({ ...newContract, depositAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Warranty</label>
                <input
                  value={newContract.warranty}
                  onChange={(e) => setNewContract({ ...newContract, warranty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 10 Year Workmanship Warranty"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContract}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsNew;
