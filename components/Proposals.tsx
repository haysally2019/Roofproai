import React, { useState } from 'react';
import { ScrollText, Plus, Search, Download, Send, CheckCircle, X, Eye, Edit, Trash2, Star, Shield, Clock } from 'lucide-react';
import { Proposal, ProposalOption, Lead } from '../types';
import { useStore } from '../lib/store';
import ProposalBuilder from './ProposalBuilder';
import { generateProposalPDF } from '../lib/proposalPdf';

interface ProposalsProps {}

const Proposals: React.FC<ProposalsProps> = () => {
  const { proposals, leads, companies, addProposal, updateProposal, deleteProposal } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showLeadSelector, setShowLeadSelector] = useState(false);

  const handleCreateProposal = (proposal: Proposal) => {
    addProposal(proposal);
    setIsCreating(false);
    setSelectedLead(null);
  };

  const handleUpdateProposal = (proposal: Proposal) => {
    updateProposal(proposal);
    setEditingProposal(null);
    if (selectedProposal && selectedProposal.id === proposal.id) {
      setSelectedProposal(proposal);
    }
  };

  const handleDeleteProposal = (id: string) => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      deleteProposal(id);
    }
  };

  const handleSendProposal = (proposal: Proposal) => {
    const updatedProposal = {
      ...proposal,
      status: 'Sent' as const,
      sentDate: new Date().toISOString()
    };
    updateProposal(updatedProposal);
    alert('Proposal sent successfully! (In production, this would send an email to the client)');
  };

  const handleDownloadPDF = (proposal: Proposal) => {
    const company = companies.find(c => c.id === proposal.companyId);
    generateProposalPDF(proposal, company?.name || 'RoofPro AI');
  };

  const mockProposals: Proposal[] = proposals.length > 0 ? proposals : [
    {
      id: '1',
      leadId: 'lead1',
      leadName: 'Jennifer Martinez',
      leadEmail: 'jennifer@example.com',
      leadPhone: '(555) 111-2222',
      leadAddress: '789 Elm Street, Dallas, TX 75201',
      number: 'PROP-2024-001',
      title: 'Residential Roof Replacement - Elm Street',
      status: 'Accepted',
      createdDate: '2024-01-10',
      sentDate: '2024-01-11',
      viewedDate: '2024-01-12',
      respondedDate: '2024-01-15',
      validUntil: '2024-02-10',
      projectType: 'Retail',
      projectDescription: 'Complete roof replacement with premium materials and extended warranty options',
      scopeOfWork: [
        'Complete tear-off of existing roof',
        'Inspection and replacement of damaged decking',
        'Installation of premium underlayment',
        'Installation of architectural shingles',
        'New ridge venting system',
        'Complete cleanup and debris removal'
      ],
      options: [
        {
          id: 'opt1',
          tier: 'Good',
          name: 'Standard Protection',
          description: 'Quality materials with reliable performance',
          materials: ['GAF Timberline HDZ Shingles', 'Standard Underlayment', 'Basic Ice & Water Shield'],
          features: [
            '30-year shingle warranty',
            'Standard installation',
            '5-year workmanship warranty',
            'Basic ventilation system',
            'Standard cleanup'
          ],
          warranty: '30-Year Material + 5-Year Workmanship',
          timeline: '3-5 days',
          price: 12000
        },
        {
          id: 'opt2',
          tier: 'Better',
          name: 'Enhanced Protection',
          description: 'Premium materials with superior durability',
          materials: ['GAF Timberline HD Impact Resistant', 'Premium Synthetic Underlayment', 'Full Ice & Water Shield'],
          features: [
            'Lifetime limited shingle warranty',
            'Impact-resistant shingles',
            '10-year workmanship warranty',
            'Enhanced ventilation system',
            'Premium cleanup service',
            'Insurance discount eligible'
          ],
          warranty: 'Lifetime Material + 10-Year Workmanship',
          timeline: '4-6 days',
          price: 16500,
          savings: 500,
          isRecommended: true
        },
        {
          id: 'opt3',
          tier: 'Best',
          name: 'Ultimate Protection',
          description: 'Top-tier materials with maximum performance and aesthetics',
          materials: ['GAF Grand Sequoia Designer Shingles', 'WeatherWatch Mineral Guard', 'Full Coverage Ice & Water'],
          features: [
            'Lifetime limited warranty with upgrades',
            'Ultra-premium designer shingles',
            '15-year workmanship warranty',
            'Advanced ridge ventilation',
            'White-glove service',
            'Maximum insurance discounts',
            'Enhanced curb appeal',
            'Premium color selection'
          ],
          warranty: 'GAF Golden Pledge Ltd. Warranty (50 Years)',
          timeline: '5-7 days',
          price: 22000,
          savings: 1000
        }
      ],
      selectedOptionId: 'opt2',
      terms: [
        'Proposal valid for 30 days from issue date',
        'Deposit required to schedule work',
        'Payment schedule based on project milestones',
        'All materials backed by manufacturer warranties',
        'Licensed and insured contractors'
      ],
      timeline: '4-6 business days from start date',
      warranty: 'Lifetime Material + 10-Year Workmanship',
      viewCount: 5,
      lastViewed: '2024-01-14'
    },
    {
      id: '2',
      leadId: 'lead2',
      leadName: 'Robert Thompson',
      leadEmail: 'robert@example.com',
      leadPhone: '(555) 333-4444',
      leadAddress: '456 Oak Lane, Fort Worth, TX 76102',
      number: 'PROP-2024-002',
      title: 'Insurance Claim Roof Replacement',
      status: 'Viewed',
      createdDate: '2024-01-18',
      sentDate: '2024-01-19',
      viewedDate: '2024-01-20',
      validUntil: '2024-02-19',
      projectType: 'Insurance',
      projectDescription: 'Hail damage roof replacement covered by insurance claim',
      scopeOfWork: [
        'Document all storm damage',
        'Coordinate with insurance adjuster',
        'Complete roof replacement',
        'Gutter repair and replacement',
        'Final inspection coordination'
      ],
      options: [
        {
          id: 'opt1',
          tier: 'Good',
          name: 'Insurance Match',
          description: 'Meets insurance requirements',
          materials: ['GAF Timberline HDZ', 'Standard Underlayment'],
          features: [
            '30-year warranty',
            'Insurance approved materials',
            'Standard installation',
            'Supplement assistance included'
          ],
          warranty: '30-Year Material Warranty',
          timeline: '4-5 days',
          price: 15000
        },
        {
          id: 'opt2',
          tier: 'Better',
          name: 'Premium Upgrade',
          description: 'Impact-resistant with insurance discounts',
          materials: ['GAF Timberline HD IR', 'Premium Underlayment'],
          features: [
            'Lifetime warranty',
            'Impact-resistant protection',
            'Insurance premium discount',
            'Supplement assistance',
            '10-year workmanship warranty'
          ],
          warranty: 'Lifetime Material + 10-Year Workmanship',
          timeline: '4-6 days',
          price: 19000,
          isRecommended: true
        },
        {
          id: 'opt3',
          tier: 'Best',
          name: 'Designer Upgrade',
          description: 'Maximum protection and aesthetics',
          materials: ['GAF Camelot Designer Shingles', 'Premium System'],
          features: [
            'GAF Golden Pledge Warranty',
            'Designer shingles',
            'Maximum impact resistance',
            'Highest insurance discounts',
            '15-year workmanship warranty'
          ],
          warranty: 'GAF Golden Pledge 50-Year Warranty',
          timeline: '5-7 days',
          price: 24500
        }
      ],
      terms: [
        'Customer pays insurance deductible',
        'Supplement assistance included',
        'Insurance payment coordination',
        'Work begins upon insurance approval'
      ],
      timeline: '4-6 business days',
      warranty: 'Lifetime Material + 10-Year Workmanship',
      viewCount: 3,
      lastViewed: '2024-01-20'
    },
    {
      id: '3',
      leadId: 'lead3',
      leadName: 'Amanda Chen',
      leadEmail: 'amanda@example.com',
      leadPhone: '(555) 555-6666',
      leadAddress: '123 Pine Ave, Arlington, TX 76001',
      number: 'PROP-2024-003',
      title: 'Commercial Flat Roof Installation',
      status: 'Sent',
      createdDate: '2024-01-22',
      sentDate: '2024-01-23',
      validUntil: '2024-02-23',
      projectType: 'Retail',
      projectDescription: 'Commercial TPO flat roof system for retail building',
      scopeOfWork: [
        'Remove existing roof system',
        'Install new insulation',
        'Install TPO membrane',
        'New metal edge and coping',
        '20-year warranty inspection'
      ],
      options: [
        {
          id: 'opt1',
          tier: 'Good',
          name: 'Standard TPO System',
          description: 'Reliable commercial roofing',
          materials: ['45-mil TPO', 'R-20 Insulation'],
          features: [
            '15-year warranty',
            'White reflective surface',
            'Energy Star rated',
            'Standard installation'
          ],
          warranty: '15-Year System Warranty',
          timeline: '5-7 days',
          price: 35000
        },
        {
          id: 'opt2',
          tier: 'Better',
          name: 'Enhanced TPO System',
          description: 'Superior protection and efficiency',
          materials: ['60-mil TPO', 'R-30 Insulation'],
          features: [
            '20-year warranty',
            'Thicker membrane',
            'Enhanced energy efficiency',
            'Annual inspections (5 years)',
            'Priority service'
          ],
          warranty: '20-Year System Warranty',
          timeline: '6-8 days',
          price: 42000,
          isRecommended: true
        },
        {
          id: 'opt3',
          tier: 'Best',
          name: 'Premium TPO System',
          description: 'Maximum durability and performance',
          materials: ['80-mil TPO', 'R-40 Insulation'],
          features: [
            '30-year warranty',
            'Maximum thickness protection',
            'Superior energy savings',
            'Annual inspections (10 years)',
            '24/7 priority service',
            'Preventive maintenance program'
          ],
          warranty: '30-Year NDL System Warranty',
          timeline: '7-10 days',
          price: 52000
        }
      ],
      terms: [
        'All work per building codes',
        'Roof warranty registered',
        'Work during business hours',
        'Final inspection included'
      ],
      timeline: '6-8 business days',
      warranty: '20-Year System Warranty',
      viewCount: 1,
      lastViewed: '2024-01-23'
    }
  ];

  const filteredProposals = mockProposals.filter(proposal => {
    const matchesSearch = proposal.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Viewed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTierColor = (tier: ProposalOption['tier']) => {
    switch (tier) {
      case 'Good': return 'from-slate-500 to-slate-600';
      case 'Better': return 'from-blue-500 to-blue-600';
      case 'Best': return 'from-emerald-500 to-emerald-600';
    }
  };

  const getTierBadgeColor = (tier: ProposalOption['tier']) => {
    switch (tier) {
      case 'Good': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Better': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Best': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
  };

  const stats = {
    total: mockProposals.length,
    draft: mockProposals.filter(p => p.status === 'Draft').length,
    sent: mockProposals.filter(p => p.status === 'Sent').length,
    viewed: mockProposals.filter(p => p.status === 'Viewed').length,
    accepted: mockProposals.filter(p => p.status === 'Accepted').length,
    totalValue: mockProposals.reduce((sum, p) => {
      const selectedOption = p.options.find(o => o.id === p.selectedOptionId);
      return sum + (selectedOption?.price || p.options[0]?.price || 0);
    }, 0)
  };

  if (viewMode === 'detail' && selectedProposal) {
    const selectedOption = selectedProposal.options.find(o => o.id === selectedProposal.selectedOptionId);

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
              onClick={() => setEditingProposal(selectedProposal)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Edit size={20} />
              Edit
            </button>
            <button
              onClick={() => selectedProposal && handleDownloadPDF(selectedProposal)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Download PDF
            </button>
            <button
              onClick={() => selectedProposal && handleSendProposal(selectedProposal)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Send size={20} />
              Send to Client
            </button>
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
                <p className="font-semibold text-lg">{selectedProposal.leadName}</p>
                <p className="text-blue-100">{selectedProposal.leadAddress}</p>
                <p className="text-blue-100">{selectedProposal.leadPhone}</p>
                <p className="text-blue-100">{selectedProposal.leadEmail}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-100 uppercase mb-2">Proposal Details</h3>
                <div className="space-y-1 text-blue-100">
                  <p>Created: {new Date(selectedProposal.createdDate).toLocaleDateString()}</p>
                  {selectedProposal.sentDate && <p>Sent: {new Date(selectedProposal.sentDate).toLocaleDateString()}</p>}
                  <p>Valid Until: {new Date(selectedProposal.validUntil).toLocaleDateString()}</p>
                  {selectedProposal.viewCount > 0 && <p>Viewed {selectedProposal.viewCount} times</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Project Overview</h3>
              <p className="text-slate-700">{selectedProposal.projectDescription}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Scope of Work</h3>
              <ul className="space-y-2">
                {selectedProposal.scopeOfWork.map((item, idx) => (
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
                {selectedProposal.options.map((option) => (
                  <div
                    key={option.id}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      option.id === selectedProposal.selectedOptionId
                        ? 'border-blue-500 shadow-xl scale-105'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${option.isRecommended ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <div className={`p-4 bg-gradient-to-r ${getTierColor(option.tier)} text-white`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-semibold opacity-90">{option.tier}</span>
                          <h4 className="text-xl font-bold">{option.name}</h4>
                        </div>
                        {option.isRecommended && (
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

                      {option.id === selectedProposal.selectedOptionId && (
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
          <p className="text-slate-500 mt-1">Create and send professional proposals with multiple options</p>
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
                    <p className="font-medium text-slate-900">{proposal.leadName}</p>
                    <p className="text-sm text-slate-500">{proposal.leadAddress}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{proposal.title}</p>
                    <p className="text-sm text-slate-500">{proposal.options.length} options</p>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{proposal.viewCount}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-600">{new Date(proposal.createdDate).toLocaleDateString()}</p>
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
                      <button
                        onClick={() => setEditingProposal(proposal)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleSendProposal(proposal)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Send"
                      >
                        <Send size={18} className="text-slate-600" />
                      </button>
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
          onSave={handleCreateProposal}
          onCancel={() => {
            setIsCreating(false);
            setSelectedLead(null);
          }}
        />
      )}

      {editingProposal && (
        <ProposalBuilder
          lead={leads.find(l => l.id === editingProposal.leadId) || {
            id: editingProposal.leadId,
            name: editingProposal.leadName,
            address: editingProposal.leadAddress,
            phone: editingProposal.leadPhone,
            email: editingProposal.leadEmail,
            status: 'New Lead' as any,
            projectType: editingProposal.projectType,
            source: undefined,
            notes: '',
            estimatedValue: 0,
            lastContact: '',
            companyId: editingProposal.companyId
          }}
          existingProposal={editingProposal}
          onSave={handleUpdateProposal}
          onCancel={() => setEditingProposal(null)}
        />
      )}
    </div>
  );
};

export default Proposals;
