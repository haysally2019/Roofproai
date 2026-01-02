import React, { useState } from 'react';
import { FileSignature, Plus, Search, Filter, Download, Send, CheckCircle, X, Eye, Edit2, FileText, DollarSign, Calendar, AlertCircle, Copy, Settings } from 'lucide-react';
import { Contract, Lead } from '../types';
import ContractTemplateManager from './ContractTemplateManager';
import { useStore } from '../lib/store';

interface ContractsProps {
  leads?: Lead[];
}

const Contracts: React.FC<ContractsProps> = ({
  leads: leadsFromProps = []
}) => {
  const { contracts, leads: leadsFromStore, addContract, updateContract } = useStore();

  const allLeads = leadsFromProps.length > 0 ? leadsFromProps : leadsFromStore;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const [formData, setFormData] = useState({
    leadId: '',
    type: 'Residential Roofing' as Contract['type'],
    projectDescription: '',
    totalAmount: 0,
    depositAmount: 0,
    warranty: '10 Year Workmanship Warranty'
  });

  const mockContracts: Contract[] = contracts && contracts.length > 0 ? contracts : [
    {
      id: '1',
      leadId: 'lead1',
      leadName: 'John Smith',
      leadEmail: 'john@example.com',
      leadPhone: '(555) 123-4567',
      leadAddress: '123 Main St, Dallas, TX',
      number: 'CNT-2024-001',
      type: 'Residential Roofing',
      status: 'Signed',
      createdDate: '2024-01-15',
      sentDate: '2024-01-16',
      signedDate: '2024-01-18',
      startDate: '2024-02-01',
      projectDescription: 'Complete roof replacement including shingles, underlayment, and flashing',
      scopeOfWork: [
        'Remove existing asphalt shingles',
        'Install new underlayment',
        'Install GAF Timberline HDZ shingles',
        'Replace all pipe boots and vents',
        'Install new ridge cap',
        'Clean up and haul away debris'
      ],
      materials: ['GAF Timberline HDZ Shingles', 'Synthetic Underlayment', 'Ice & Water Shield', 'Ridge Cap Shingles'],
      totalAmount: 15000,
      depositAmount: 5000,
      paymentSchedule: [
        { milestone: 'Contract Signing', amount: 5000, status: 'Paid' },
        { milestone: 'Materials Delivered', amount: 5000, status: 'Pending' },
        { milestone: 'Project Completion', amount: 5000, status: 'Pending' }
      ],
      terms: [
        'All work performed by licensed contractors',
        'Materials warranty provided by manufacturer',
        'Workmanship warranty provided by contractor',
        'Payment due upon completion of milestones',
        'Change orders must be approved in writing'
      ],
      warranty: '10 Year Workmanship + Manufacturer Material Warranty',
      clientSignature: 'signed',
      contractorSignature: 'signed'
    },
    {
      id: '2',
      leadId: 'lead2',
      leadName: 'Sarah Johnson',
      leadEmail: 'sarah@example.com',
      leadPhone: '(555) 234-5678',
      leadAddress: '456 Oak Ave, Fort Worth, TX',
      number: 'CNT-2024-002',
      type: 'Insurance Claim',
      status: 'Active',
      createdDate: '2024-01-20',
      sentDate: '2024-01-21',
      signedDate: '2024-01-23',
      startDate: '2024-02-15',
      projectDescription: 'Hail damage roof replacement covered by insurance',
      scopeOfWork: [
        'Remove storm-damaged shingles',
        'Inspect and repair decking as needed',
        'Install impact-resistant shingles',
        'Replace damaged gutters',
        'Final inspection coordination'
      ],
      materials: ['GAF Timberline HD Impact Resistant', 'Decking (as needed)', '6" Seamless Gutters'],
      totalAmount: 18500,
      depositAmount: 1500,
      paymentSchedule: [
        { milestone: 'Insurance Deductible', amount: 1500, status: 'Paid' },
        { milestone: 'Insurance Payment', amount: 17000, status: 'Pending' }
      ],
      terms: [
        'Customer responsible for insurance deductible',
        'Insurance claim filing assistance included',
        'Supplement negotiations handled by contractor',
        'Work begins upon insurance approval'
      ],
      warranty: '10 Year Workmanship + Lifetime Material Warranty',
      clientSignature: 'signed',
      contractorSignature: 'signed'
    },
    {
      id: '3',
      leadId: 'lead3',
      leadName: 'Mike Davis',
      leadEmail: 'mike@example.com',
      leadPhone: '(555) 345-6789',
      leadAddress: '789 Pine Rd, Arlington, TX',
      number: 'CNT-2024-003',
      type: 'Commercial Roofing',
      status: 'Sent',
      createdDate: '2024-01-25',
      sentDate: '2024-01-26',
      projectDescription: 'Commercial TPO roof installation for retail building',
      scopeOfWork: [
        'Remove existing built-up roof',
        'Install new insulation',
        'Install 60-mil TPO membrane',
        'Install new metal edge and coping',
        'Warranty inspection'
      ],
      materials: ['60-mil TPO Membrane', 'Polyiso Insulation', 'Metal Edge & Coping', 'TPO Fasteners & Plates'],
      totalAmount: 45000,
      depositAmount: 15000,
      paymentSchedule: [
        { milestone: 'Contract Signing', amount: 15000, status: 'Pending' },
        { milestone: '50% Complete', amount: 15000, status: 'Pending' },
        { milestone: 'Final Completion', amount: 15000, status: 'Pending' }
      ],
      terms: [
        'All work performed per building codes',
        'Roof warranty registered with manufacturer',
        'Annual inspections included for 5 years',
        'Work scheduled during business hours'
      ],
      warranty: '20 Year Material & Workmanship Warranty',
    }
  ];

  const filteredContracts = mockContracts.filter(contract => {
    const matchesSearch = contract.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.leadAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'Signed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Completed': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeColor = (type: Contract['type']) => {
    switch (type) {
      case 'Residential Roofing': return 'text-blue-600';
      case 'Commercial Roofing': return 'text-purple-600';
      case 'Insurance Claim': return 'text-emerald-600';
      case 'Warranty Work': return 'text-orange-600';
      case 'Repair': return 'text-slate-600';
    }
  };

  const stats = {
    total: mockContracts.length,
    draft: mockContracts.filter(c => c.status === 'Draft').length,
    sent: mockContracts.filter(c => c.status === 'Sent').length,
    active: mockContracts.filter(c => c.status === 'Active' || c.status === 'Signed').length,
    completed: mockContracts.filter(c => c.status === 'Completed').length,
    totalValue: mockContracts.reduce((sum, c) => sum + c.totalAmount, 0)
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
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Download size={20} />
              Download PDF
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Send size={20} />
              Send to Client
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-slate-50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Contract {selectedContract.number}</h1>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedContract.status)}`}>
                  {selectedContract.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Created</p>
                <p className="font-semibold text-slate-900">{new Date(selectedContract.createdDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Client Information</h3>
                <p className="font-semibold text-slate-900 text-lg">{selectedContract.leadName}</p>
                <p className="text-slate-600">{selectedContract.leadAddress}</p>
                <p className="text-slate-600">{selectedContract.leadPhone}</p>
                <p className="text-slate-600">{selectedContract.leadEmail}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Project Details</h3>
                <p className={`font-semibold text-lg ${getTypeColor(selectedContract.type)}`}>{selectedContract.type}</p>
                <p className="text-slate-600 mt-2">{selectedContract.projectDescription}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  Scope of Work
                </h3>
                <ul className="space-y-2">
                  {selectedContract.scopeOfWork.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-bold text-slate-900 mb-4 mt-6">Materials</h3>
                <ul className="space-y-2">
                  {selectedContract.materials.map((material, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />
                      <span className="text-slate-700">{material}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-600" />
                  Payment Schedule
                </h3>
                <div className="space-y-3">
                  {selectedContract.paymentSchedule.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-900">{payment.milestone}</p>
                        <p className="text-sm text-slate-500">
                          {payment.status === 'Paid' ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle size={14} /> Paid
                            </span>
                          ) : (
                            <span className="text-orange-600">Pending</span>
                          )}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">${payment.amount.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                    <p className="font-bold text-slate-900">Total Contract Value</p>
                    <p className="text-xl font-bold text-blue-600">${selectedContract.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-4 mt-6 flex items-center gap-2">
                  <Calendar size={20} className="text-slate-600" />
                  Timeline
                </h3>
                <div className="space-y-2">
                  {selectedContract.startDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Start Date</span>
                      <span className="font-semibold text-slate-900">{new Date(selectedContract.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedContract.completionDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Completion Date</span>
                      <span className="font-semibold text-slate-900">{new Date(selectedContract.completionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-lg">
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

            <div className="mt-6 p-6 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Warranty</h3>
              <p className="text-emerald-800">{selectedContract.warranty}</p>
            </div>

            {selectedContract.clientSignature && selectedContract.contractorSignature && (
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div className="p-4 border-t-2 border-slate-300">
                  <p className="text-sm text-slate-500 mb-2">Client Signature</p>
                  <p className="font-bold text-slate-900">{selectedContract.leadName}</p>
                  <p className="text-sm text-slate-500">{selectedContract.signedDate && new Date(selectedContract.signedDate).toLocaleDateString()}</p>
                </div>
                <div className="p-4 border-t-2 border-slate-300">
                  <p className="text-sm text-slate-500 mb-2">Contractor Signature</p>
                  <p className="font-bold text-slate-900">Authorized Representative</p>
                  <p className="text-sm text-slate-500">{selectedContract.signedDate && new Date(selectedContract.signedDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}
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
            <FileSignature className="text-blue-600" />
            Contracts
          </h1>
          <p className="text-slate-500 mt-1">Manage and track all your roofing contracts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Settings size={20} />
            Templates
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            New Contract
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Contracts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Pending Signature</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-slate-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Value</p>
          <p className="text-2xl font-bold text-blue-600">${(stats.totalValue / 1000).toFixed(0)}K</p>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Contract #</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Amount</th>
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
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {contract.number}
                    </button>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{contract.leadName}</p>
                    <p className="text-sm text-slate-500">{contract.leadAddress}</p>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${getTypeColor(contract.type)}`}>
                      {contract.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">${contract.totalAmount.toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-600">{new Date(contract.createdDate).toLocaleDateString()}</p>
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
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Download">
                        <Download size={18} className="text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Send">
                        <Send size={18} className="text-slate-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">Create New Contract</h2>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Client</label>
                {allLeads.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-yellow-900">No leads available</p>
                        <p className="text-sm text-yellow-700 mt-1">Create a lead first before creating a contract.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a client...</option>
                    {allLeads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.name} - {lead.address}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Contract Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Contract['type'] })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Residential Roofing</option>
                  <option>Commercial Roofing</option>
                  <option>Insurance Claim</option>
                  <option>Warranty Work</option>
                  <option>Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Project Description</label>
                <textarea
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the roofing project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Total Amount</label>
                  <input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deposit Amount</label>
                  <input
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Warranty</label>
                <input
                  type="text"
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10 Year Workmanship Warranty"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!formData.leadId) {
                      alert('Please select a client');
                      return;
                    }

                    const selectedLead = allLeads.find(l => l.id === formData.leadId);
                    if (!selectedLead) return;

                    const newContract: Contract = {
                      id: crypto.randomUUID(),
                      leadId: formData.leadId,
                      leadName: selectedLead.name,
                      leadEmail: selectedLead.email || '',
                      leadPhone: selectedLead.phone,
                      leadAddress: selectedLead.address,
                      number: `CNT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
                      type: formData.type,
                      status: 'Draft',
                      createdDate: new Date().toISOString(),
                      projectDescription: formData.projectDescription,
                      scopeOfWork: [],
                      materials: [],
                      totalAmount: formData.totalAmount,
                      depositAmount: formData.depositAmount,
                      paymentSchedule: [],
                      terms: [],
                      warranty: formData.warranty,
                      companyId: selectedLead.companyId
                    };

                    await addContract(newContract);

                    setFormData({
                      leadId: '',
                      type: 'Residential Roofing',
                      projectDescription: '',
                      totalAmount: 0,
                      depositAmount: 0,
                      warranty: '10 Year Workmanship Warranty'
                    });
                    setIsCreating(false);
                  }}
                  disabled={allLeads.length === 0 || !formData.leadId}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateManager && (
        <ContractTemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
};

export default Contracts;
