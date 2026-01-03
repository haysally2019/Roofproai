import React, { useState, useEffect } from 'react';
import { ScrollText, Plus, Search, Download, Send, CheckCircle, X, Eye, Edit, Trash2, Star, Shield, Clock, FileSignature } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import ProposalBuilder from './ProposalBuilder';
import { generateProposalPDF } from '../lib/proposalPdf';

interface DBProposal {
  id: string;
  company_id: string;
  lead_id: string;
  number: string;
  title: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  created_date: string;
  sent_date: string | null;
  viewed_date: string | null;
  responded_date: string | null;
  valid_until: string;
  project_type: 'Insurance' | 'Retail' | 'Unknown';
  project_description: string;
  scope_of_work: string[];
  terms: string[];
  timeline: string;
  warranty: string;
  selected_option_id: string | null;
  view_count: number;
  last_viewed: string | null;
  contract_id: string | null;
  leads: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface DBProposalOption {
  id: string;
  proposal_id: string;
  tier: 'Good' | 'Better' | 'Best';
  name: string;
  description: string;
  materials: string[];
  features: string[];
  warranty: string;
  timeline: string;
  price: number;
  savings: number | null;
  is_recommended: boolean;
  display_order: number;
}

const ProposalsNew: React.FC = () => {
  const { currentUser, addToast, leads } = useStore();
  const [proposals, setProposals] = useState<DBProposal[]>([]);
  const [proposalOptions, setProposalOptions] = useState<Record<string, DBProposalOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<DBProposal | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    loadProposals();
  }, [currentUser?.companyId]);

  const loadProposals = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
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

      if (proposalsError) throw proposalsError;

      if (proposalsData) {
        setProposals(proposalsData as unknown as DBProposal[]);

        const proposalIds = proposalsData.map(p => p.id);

        if (proposalIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from('proposal_options')
            .select('*')
            .in('proposal_id', proposalIds)
            .order('display_order');

          if (optionsError) throw optionsError;

          if (optionsData) {
            const optionsByProposal: Record<string, DBProposalOption[]> = {};
            optionsData.forEach((option: any) => {
              if (!optionsByProposal[option.proposal_id]) {
                optionsByProposal[option.proposal_id] = [];
              }
              optionsByProposal[option.proposal_id].push(option as DBProposalOption);
            });
            setProposalOptions(optionsByProposal);
          }
        }
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      addToast('Failed to load proposals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProposal = async (proposal: DBProposal) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'Sent',
          sent_date: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (error) throw error;

      addToast('Proposal sent successfully', 'success');
      loadProposals();
    } catch (error) {
      console.error('Error sending proposal:', error);
      addToast('Failed to send proposal', 'error');
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addToast('Proposal deleted successfully', 'success');
      loadProposals();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      addToast('Failed to delete proposal', 'error');
    }
  };

  const handleConvertToContract = async (proposal: DBProposal) => {
    if (proposal.contract_id) {
      addToast('This proposal already has a contract', 'info');
      return;
    }

    if (!proposal.selected_option_id) {
      addToast('Please select an option before converting to contract', 'warning');
      return;
    }

    try {
      const selectedOption = proposalOptions[proposal.id]?.find(
        opt => opt.id === proposal.selected_option_id
      );

      if (!selectedOption) {
        throw new Error('Selected option not found');
      }

      const contractNumber = `CNT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: proposal.company_id,
          lead_id: proposal.lead_id,
          proposal_id: proposal.id,
          number: contractNumber,
          type: proposal.project_type === 'Insurance' ? 'Insurance Claim' : 'Residential Roofing',
          status: 'Draft',
          created_date: new Date().toISOString(),
          project_description: proposal.project_description,
          scope_of_work: proposal.scope_of_work,
          materials: selectedOption.materials,
          total_amount: selectedOption.price,
          deposit_amount: selectedOption.price * 0.33,
          payment_schedule: [
            { milestone: 'Contract Signing', amount: selectedOption.price * 0.33, status: 'Pending' },
            { milestone: 'Materials Delivered', amount: selectedOption.price * 0.33, status: 'Pending' },
            { milestone: 'Project Completion', amount: selectedOption.price * 0.34, status: 'Pending' }
          ],
          terms: proposal.terms,
          warranty: selectedOption.warranty
        })
        .select()
        .single();

      if (contractError) throw contractError;

      const { error: updateError } = await supabase
        .from('proposals')
        .update({ contract_id: contract.id })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      addToast('Contract created successfully!', 'success');
      loadProposals();
    } catch (error) {
      console.error('Error creating contract:', error);
      addToast('Failed to create contract', 'error');
    }
  };

  const handleDownloadPDF = (proposal: DBProposal) => {
    const company = currentUser?.companyId;
    generateProposalPDF(proposal as any, company || 'RoofPro AI');
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch =
      proposal.leads.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DBProposal['status']) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Viewed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTierColor = (tier: DBProposalOption['tier']) => {
    switch (tier) {
      case 'Good': return 'from-slate-500 to-slate-600';
      case 'Better': return 'from-blue-500 to-blue-600';
      case 'Best': return 'from-emerald-500 to-emerald-600';
    }
  };

  const stats = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'Draft').length,
    sent: proposals.filter(p => p.status === 'Sent').length,
    viewed: proposals.filter(p => p.status === 'Viewed').length,
    accepted: proposals.filter(p => p.status === 'Accepted').length,
    totalValue: proposals.reduce((sum, p) => {
      const options = proposalOptions[p.id] || [];
      const selectedOption = options.find(o => o.id === p.selected_option_id) || options[0];
      return sum + (selectedOption?.price || 0);
    }, 0)
  };

  if (viewMode === 'detail' && selectedProposal) {
    const options = proposalOptions[selectedProposal.id] || [];
    const selectedOption = options.find(o => o.id === selectedProposal.selected_option_id);

    return (
      <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedProposal(null);
            }}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Proposals
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadPDF(selectedProposal)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Download PDF
            </button>
            {selectedProposal.status === 'Accepted' && !selectedProposal.contract_id && (
              <button
                onClick={() => handleConvertToContract(selectedProposal)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <FileSignature size={20} />
                Convert to Contract
              </button>
            )}
            {selectedProposal.status !== 'Sent' && selectedProposal.status !== 'Viewed' && selectedProposal.status !== 'Accepted' && (
              <button
                onClick={() => handleSendProposal(selectedProposal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Send size={20} />
                Send to Client
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{selectedProposal.title}</h1>
                <p className="text-blue-100">{selectedProposal.number}</p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border bg-white ${getStatusColor(selectedProposal.status)}`}>
                {selectedProposal.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-semibold text-blue-100 uppercase mb-2">Prepared For</h3>
                <p className="font-semibold text-lg">{selectedProposal.leads.name}</p>
                <p className="text-blue-100">{selectedProposal.leads.address}</p>
                <p className="text-blue-100">{selectedProposal.leads.phone}</p>
                <p className="text-blue-100">{selectedProposal.leads.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-100 uppercase mb-2">Proposal Details</h3>
                <div className="space-y-1 text-blue-100">
                  <p>Created: {new Date(selectedProposal.created_date).toLocaleDateString()}</p>
                  {selectedProposal.sent_date && <p>Sent: {new Date(selectedProposal.sent_date).toLocaleDateString()}</p>}
                  <p>Valid Until: {new Date(selectedProposal.valid_until).toLocaleDateString()}</p>
                  {selectedProposal.view_count > 0 && <p>Viewed {selectedProposal.view_count} times</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Project Overview</h3>
              <p className="text-slate-700">{selectedProposal.project_description}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Scope of Work</h3>
              <ul className="space-y-2">
                {selectedProposal.scope_of_work.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Investment Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      option.id === selectedProposal.selected_option_id
                        ? 'border-blue-500 shadow-xl scale-105'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${option.is_recommended ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <div className={`p-4 bg-gradient-to-r ${getTierColor(option.tier)} text-white`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-semibold opacity-90">{option.tier}</span>
                          <h4 className="text-xl font-bold">{option.name}</h4>
                        </div>
                        {option.is_recommended && (
                          <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star size={12} />
                            Best Value
                          </div>
                        )}
                      </div>
                      <p className="text-sm opacity-90">{option.description}</p>
                    </div>

                    <div className="p-6">
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900">${option.price.toLocaleString()}</span>
                        </div>
                        {option.savings && (
                          <p className="text-sm text-emerald-600 font-semibold">Save ${option.savings}</p>
                        )}
                      </div>

                      <div className="space-y-4 mb-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Materials</p>
                          <ul className="space-y-1">
                            {option.materials.map((material, idx) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                                <span>{material}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Features</p>
                          <ul className="space-y-1">
                            {option.features.map((feature, idx) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-slate-200 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Shield size={16} className="text-blue-600" />
                            <span className="font-medium">{option.warranty}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            <span>{option.timeline}</span>
                          </div>
                        </div>
                      </div>

                      {option.id === selectedProposal.selected_option_id && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                          <CheckCircle size={20} className="text-blue-600 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-blue-900">Client Selected</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOption && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Selected Investment</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedOption.name}</p>
                    <p className="text-sm text-slate-600">{selectedOption.warranty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">${selectedOption.price.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Total Investment</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-slate-50 rounded-lg">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Project Timeline</h3>
                <p className="text-slate-700">{selectedProposal.timeline}</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
                <h3 className="text-lg font-bold text-emerald-900 mb-3">Warranty Coverage</h3>
                <p className="text-emerald-800">{selectedProposal.warranty}</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Terms & Conditions</h3>
              <ul className="space-y-2">
                {selectedProposal.terms.map((term, idx) => (
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
            <ScrollText className="text-blue-600" />
            Proposals
          </h1>
          <p className="text-slate-500 mt-1">Create and manage client proposals</p>
        </div>
        <button
          onClick={() => setShowLeadSelector(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Proposals</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Accepted</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Viewed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.viewed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Awaiting Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
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
            placeholder="Search proposals..."
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
          <option>Viewed</option>
          <option>Accepted</option>
          <option>Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading proposals...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ScrollText size={48} className="mx-auto text-slate-300 mb-4" />
            <p>No proposals found</p>
            <button
              onClick={() => setShowLeadSelector(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Proposal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Proposal #</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Title</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Views</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setViewMode('detail');
                        }}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {proposal.number}
                      </button>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{proposal.leads.name}</p>
                      <p className="text-sm text-slate-500">{proposal.leads.address}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{proposal.title}</p>
                      <p className="text-sm text-slate-500">{proposalOptions[proposal.id]?.length || 0} options</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-600">{proposal.view_count}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{new Date(proposal.created_date).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setViewMode('detail');
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(proposal)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} className="text-slate-600" />
                        </button>
                        {proposal.status === 'Accepted' && !proposal.contract_id && (
                          <button
                            onClick={() => handleConvertToContract(proposal)}
                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Convert to Contract"
                          >
                            <FileSignature size={18} className="text-emerald-600" />
                          </button>
                        )}
                        {proposal.status !== 'Sent' && proposal.status !== 'Viewed' && proposal.status !== 'Accepted' && (
                          <button
                            onClick={() => handleSendProposal(proposal)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send"
                          >
                            <Send size={18} className="text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProposal(proposal.id)}
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

      {showLeadSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">Select Lead</h2>
              <button onClick={() => setShowLeadSelector(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Choose which lead to create a proposal for:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leads.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No leads available. Create a lead first.</p>
                  </div>
                ) : (
                  leads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowLeadSelector(false);
                        setIsCreating(true);
                      }}
                      className="w-full p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-sm text-slate-600">{lead.address}</p>
                      <p className="text-sm text-slate-500">{lead.phone}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreating && selectedLead && (
        <ProposalBuilder
          lead={selectedLead}
          onSave={() => {
            setIsCreating(false);
            setSelectedLead(null);
            loadProposals();
          }}
          onCancel={() => {
            setIsCreating(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
};

export default ProposalsNew;
