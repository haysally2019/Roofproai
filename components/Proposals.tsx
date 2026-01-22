import React, { useState, useEffect } from 'react';
import { 
  ScrollText, Plus, Search, Download, Send, CheckCircle, X, Eye, Edit, 
  Trash2, Star, Shield, Clock, FileSignature, ArrowLeft, Calendar, User, MapPin, Phone, Mail 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import ProposalBuilder from './ProposalBuilder';
import { generateProposalPDF } from '../lib/proposalPdf';
import { Proposal, ProposalOption, Lead } from '../types';

// Database interfaces to match Supabase structure
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
  valid_until: string;
  project_type: 'Insurance' | 'Retail' | 'Unknown';
  project_description: string;
  scope_of_work: string[];
  terms: string[];
  timeline: string;
  warranty: string;
  selected_option_id: string | null;
  view_count: number;
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

const Proposals: React.FC = () => {
  const { currentUser, addToast, leads } = useStore();
  const [proposals, setProposals] = useState<DBProposal[]>([]);
  const [proposalOptions, setProposalOptions] = useState<Record<string, DBProposalOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // UI States
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<DBProposal | null>(null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [selectedLeadForCreate, setSelectedLeadForCreate] = useState<Lead | null>(null);

  useEffect(() => {
    if (currentUser?.companyId) {
      loadProposals();
    }
  }, [currentUser?.companyId]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          *,
          leads (name, email, phone, address)
        `)
        .eq('company_id', currentUser?.companyId)
        .order('created_date', { ascending: false });

      if (proposalsError) throw proposalsError;

      if (proposalsData) {
        setProposals(proposalsData as any);
        
        // Load options for all proposals
        const proposalIds = proposalsData.map(p => p.id);
        if (proposalIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from('proposal_options')
            .select('*')
            .in('proposal_id', proposalIds)
            .order('display_order');

          if (optionsError) throw optionsError;

          const optionsMap: Record<string, DBProposalOption[]> = {};
          optionsData?.forEach((opt: any) => {
            if (!optionsMap[opt.proposal_id]) optionsMap[opt.proposal_id] = [];
            optionsMap[opt.proposal_id].push(opt);
          });
          setProposalOptions(optionsMap);
        }
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      addToast('Failed to load proposals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProposal = async (proposal: Proposal) => {
    try {
      // 1. Upsert Proposal
      const { data: savedProposal, error: proposalError } = await supabase
        .from('proposals')
        .upsert({
          id: proposal.id,
          company_id: currentUser?.companyId,
          lead_id: proposal.leadId,
          number: proposal.number,
          title: proposal.title,
          status: proposal.status,
          created_date: proposal.createdDate,
          valid_until: proposal.validUntil,
          project_type: proposal.projectType,
          project_description: proposal.projectDescription,
          scope_of_work: proposal.scopeOfWork,
          terms: proposal.terms,
          timeline: proposal.timeline,
          warranty: proposal.warranty,
          view_count: proposal.viewCount
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // 2. Delete existing options if updating
      await supabase.from('proposal_options').delete().eq('proposal_id', proposal.id);

      // 3. Insert Options
      const optionsToInsert = proposal.options.map((opt, index) => ({
        id: opt.id,
        proposal_id: proposal.id,
        tier: opt.tier,
        name: opt.name,
        description: opt.description,
        materials: opt.materials,
        features: opt.features,
        warranty: opt.warranty,
        timeline: opt.timeline,
        price: opt.price,
        savings: opt.savings,
        is_recommended: opt.isRecommended,
        display_order: index
      }));

      const { error: optionsError } = await supabase
        .from('proposal_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      addToast('Proposal saved successfully!', 'success');
      setIsCreating(false);
      setSelectedLeadForCreate(null);
      loadProposals();
    } catch (error) {
      console.error('Error saving proposal:', error);
      addToast('Failed to save proposal', 'error');
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await supabase.from('proposals').delete().eq('id', id);
      addToast('Proposal deleted', 'success');
      loadProposals();
      if (selectedProposal?.id === id) {
        setSelectedProposal(null);
        setViewMode('list');
      }
    } catch (error) {
      addToast('Error deleting proposal', 'error');
    }
  };

  const handleSendProposal = async (proposal: DBProposal) => {
    try {
      await supabase
        .from('proposals')
        .update({ status: 'Sent', sent_date: new Date().toISOString() })
        .eq('id', proposal.id);
      addToast('Proposal marked as Sent', 'success');
      loadProposals();
    } catch (error) {
      addToast('Error updating status', 'error');
    }
  };

  const handleConvertToContract = async (proposal: DBProposal) => {
    if (!proposal.selected_option_id) {
      addToast('Please select an option first (simulate client acceptance)', 'warning');
      return;
    }
    try {
      const options = proposalOptions[proposal.id] || [];
      const selectedOption = options.find(o => o.id === proposal.selected_option_id);
      
      if (!selectedOption) throw new Error('Option not found');

      const contractNumber = `CNT-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`;
      
      const { data: contract, error } = await supabase.from('contracts').insert({
        company_id: proposal.company_id,
        lead_id: proposal.lead_id,
        proposal_id: proposal.id,
        number: contractNumber,
        status: 'Draft',
        total_amount: selectedOption.price,
        created_date: new Date().toISOString()
      }).select().single();

      if (error) throw error;

      await supabase.from('proposals').update({ contract_id: contract.id, status: 'Accepted' }).eq('id', proposal.id);
      
      addToast('Contract created successfully!', 'success');
      loadProposals();
    } catch (error) {
      console.error(error);
      addToast('Failed to convert to contract', 'error');
    }
  };

  const handleDownloadPDF = (proposal: DBProposal) => {
    // Map DBProposal to Proposal type expected by PDF generator
    const mappedProposal: Proposal = {
      id: proposal.id,
      leadId: proposal.lead_id,
      leadName: proposal.leads.name,
      leadEmail: proposal.leads.email,
      leadPhone: proposal.leads.phone,
      leadAddress: proposal.leads.address,
      number: proposal.number,
      title: proposal.title,
      status: proposal.status,
      createdDate: proposal.created_date,
      validUntil: proposal.valid_until,
      projectType: proposal.project_type,
      projectDescription: proposal.project_description,
      scopeOfWork: proposal.scope_of_work,
      options: proposalOptions[proposal.id]?.map(o => ({
        id: o.id,
        tier: o.tier,
        name: o.name,
        description: o.description,
        price: o.price,
        materials: o.materials,
        features: o.features,
        warranty: o.warranty,
        timeline: o.timeline,
        savings: o.savings || 0,
        isRecommended: o.is_recommended
      })) || [],
      selectedOptionId: proposal.selected_option_id || undefined,
      terms: proposal.terms,
      timeline: proposal.timeline,
      warranty: proposal.warranty,
      companyId: proposal.company_id,
      viewCount: proposal.view_count
    };
    
    generateProposalPDF(mappedProposal, currentUser?.companyName || 'Roofing Company');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Viewed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Good': return 'from-slate-500 to-slate-600';
      case 'Better': return 'from-blue-600 to-blue-700';
      case 'Best': return 'from-amber-500 to-amber-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  // --- Views ---

  if (isCreating && selectedLeadForCreate) {
    return (
      <ProposalBuilder 
        lead={selectedLeadForCreate}
        onSave={handleSaveProposal}
        onCancel={() => { setIsCreating(false); setSelectedLeadForCreate(null); }}
      />
    );
  }

  if (viewMode === 'detail' && selectedProposal) {
    const options = proposalOptions[selectedProposal.id] || [];
    
    return (
      <div className="h-full flex flex-col bg-slate-50 min-h-screen">
        {/* Detail Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewMode('list'); setSelectedProposal(null); }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {selectedProposal.title}
                <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(selectedProposal.status)}`}>
                  {selectedProposal.status}
                </span>
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1"><FileSignature size={14}/> {selectedProposal.number}</span>
                <span className="flex items-center gap-1"><Calendar size={14}/> Valid until {new Date(selectedProposal.valid_until).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => handleDownloadPDF(selectedProposal)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors">
              <Download size={18} /> PDF
            </button>
            {selectedProposal.status !== 'Accepted' && (
               <button onClick={() => handleSendProposal(selectedProposal)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                 <Send size={18} /> Send
               </button>
            )}
            {selectedProposal.status === 'Accepted' && !selectedProposal.contract_id && (
               <button onClick={() => handleConvertToContract(selectedProposal)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                 <FileSignature size={18} /> Convert to Contract
               </button>
            )}
          </div>
        </div>

        {/* Detail Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Client Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Client Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="font-medium text-slate-900">{selectedProposal.leads.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="font-medium text-slate-900">{selectedProposal.leads.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{selectedProposal.leads.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{selectedProposal.leads.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Project Overview</h3>
                  <p className="text-slate-600 leading-relaxed">{selectedProposal.project_description}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Scope of Work</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProposal.scope_of_work.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Terms & Conditions</h3>
                  <ul className="space-y-3">
                    {selectedProposal.terms.map((term, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="font-mono text-slate-400">{idx + 1}.</span>
                        {term}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Options Grid */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Investment Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {options.map((option) => (
                  <div 
                    key={option.id} 
                    className={`bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                      option.id === selectedProposal.selected_option_id 
                        ? 'border-blue-600 shadow-xl scale-105 relative z-10' 
                        : 'border-slate-100 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-4 bg-gradient-to-r ${getTierColor(option.tier)} text-white`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider opacity-90">{option.tier}</span>
                          <h4 className="text-xl font-bold mt-1">{option.name}</h4>
                        </div>
                        {option.is_recommended && (
                          <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Star size={12} fill="currentColor" /> Recommended
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-6">
                        <span className="text-3xl font-bold text-slate-900">${option.price.toLocaleString()}</span>
                        {option.savings && (
                          <span className="block text-xs font-medium text-emerald-600 mt-1">
                            Save ${option.savings.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Features</p>
                          <ul className="space-y-2">
                            {option.features.map((feat, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <CheckCircle size={14} className="text-blue-500 mt-0.5 shrink-0"/> {feat}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-1">Warranty</p>
                          <p className="text-sm font-medium text-slate-900">{option.warranty}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="text-blue-600" /> Proposals
          </h1>
          <p className="text-slate-500 mt-1">Manage and track your customer proposals</p>
        </div>
        <button
          onClick={() => setShowLeadSelector(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={20} />
          New Proposal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Viewed">Viewed</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Number</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposals.filter(p => {
                 const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
                 const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       p.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       p.leads.name.toLowerCase().includes(searchQuery.toLowerCase());
                 return matchesStatus && matchesSearch;
              }).map((proposal) => (
                <tr key={proposal.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6">
                    <button 
                      onClick={() => { setSelectedProposal(proposal); setViewMode('detail'); }}
                      className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {proposal.number}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-900">{proposal.leads.name}</div>
                    <div className="text-xs text-slate-500">{proposal.leads.address}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-slate-900 font-medium">{proposal.title}</div>
                    <div className="text-xs text-slate-500">
                      {proposalOptions[proposal.id]?.length || 0} Options
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(proposal.status)}`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">
                    {new Date(proposal.created_date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedProposal(proposal); setViewMode('detail'); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProposal(proposal.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No proposals found. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Selector Modal */}
      {showLeadSelector && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Select a Lead</h3>
              <button onClick={() => setShowLeadSelector(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {leads.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No leads available. Please add a lead first.
                </div>
              ) : (
                <div className="space-y-1">
                  {leads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadForCreate(lead);
                        setIsCreating(true);
                        setShowLeadSelector(false);
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.address}</div>
                      </div>
                      <Plus size={18} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proposals;