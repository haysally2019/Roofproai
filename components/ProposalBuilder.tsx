import React, { useState } from 'react';
import { X, Plus, Minus, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { Proposal, ProposalOption, Lead, InsuranceDamageReport } from '../types';
import InsuranceDamageReportForm from './InsuranceDamageReportForm';

interface ProposalBuilderProps {
  lead: Lead;
  onSave: (proposal: Proposal) => void;
  onCancel: () => void;
  existingProposal?: Proposal;
}

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({
  lead,
  onSave,
  onCancel,
  existingProposal
}) => {
  const [title, setTitle] = useState(existingProposal?.title || `${lead.projectType} Roof Project - ${lead.address}`);
  const [projectDescription, setProjectDescription] = useState(
    existingProposal?.projectDescription || 'Complete roof replacement with premium materials and professional installation'
  );
  const [scopeItems, setScopeItems] = useState<string[]>(
    existingProposal?.scopeOfWork || [
      'Complete tear-off of existing roof',
      'Inspection and replacement of damaged decking',
      'Installation of premium underlayment',
      'Installation of roofing system',
      'Complete cleanup and debris removal'
    ]
  );
  const [termsItems, setTermsItems] = useState<string[]>(
    existingProposal?.terms || [
      'Proposal valid for 30 days from issue date',
      'Deposit required to schedule work',
      'Payment schedule based on project milestones',
      'All materials backed by manufacturer warranties',
      'Licensed and insured contractors'
    ]
  );
  const [timeline, setTimeline] = useState(existingProposal?.timeline || '4-6 business days from start date');
  const [warranty, setWarranty] = useState(existingProposal?.warranty || 'Lifetime Material + 10-Year Workmanship');
  const [validDays, setValidDays] = useState(30);
  const [showDamageReport, setShowDamageReport] = useState(false);
  const [damageReport, setDamageReport] = useState<InsuranceDamageReport | null>(null);

  const [goodOption, setGoodOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Good') || {
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
      price: 12000,
      isRecommended: false
    }
  );

  const [betterOption, setBetterOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Better') || {
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
    }
  );

  const [bestOption, setBestOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Best') || {
      tier: 'Best',
      name: 'Ultimate Protection',
      description: 'Top-tier materials with maximum performance',
      materials: ['GAF Grand Sequoia Designer Shingles', 'WeatherWatch Mineral Guard', 'Full Coverage Ice & Water'],
      features: [
        'Lifetime limited warranty with upgrades',
        'Ultra-premium designer shingles',
        '15-year workmanship warranty',
        'Advanced ridge ventilation',
        'White-glove service',
        'Maximum insurance discounts',
        'Enhanced curb appeal'
      ],
      warranty: 'GAF Golden Pledge Ltd. Warranty (50 Years)',
      timeline: '5-7 days',
      price: 22000,
      savings: 1000,
      isRecommended: false
    }
  );

  const addScopeItem = () => setScopeItems([...scopeItems, '']);
  const removeScopeItem = (index: number) => setScopeItems(scopeItems.filter((_, i) => i !== index));
  const updateScopeItem = (index: number, value: string) => {
    const newItems = [...scopeItems];
    newItems[index] = value;
    setScopeItems(newItems);
  };

  const addTermsItem = () => setTermsItems([...termsItems, '']);
  const removeTermsItem = (index: number) => setTermsItems(termsItems.filter((_, i) => i !== index));
  const updateTermsItem = (index: number, value: string) => {
    const newItems = [...termsItems];
    newItems[index] = value;
    setTermsItems(newItems);
  };

  const addMaterial = (tier: 'Good' | 'Better' | 'Best') => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    setter({ ...option, materials: [...(option.materials || []), ''] });
  };

  const removeMaterial = (tier: 'Good' | 'Better' | 'Best', index: number) => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    setter({ ...option, materials: (option.materials || []).filter((_, i) => i !== index) });
  };

  const updateMaterial = (tier: 'Good' | 'Better' | 'Best', index: number, value: string) => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    const newMaterials = [...(option.materials || [])];
    newMaterials[index] = value;
    setter({ ...option, materials: newMaterials });
  };

  const addFeature = (tier: 'Good' | 'Better' | 'Best') => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    setter({ ...option, features: [...(option.features || []), ''] });
  };

  const removeFeature = (tier: 'Good' | 'Better' | 'Best', index: number) => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    setter({ ...option, features: (option.features || []).filter((_, i) => i !== index) });
  };

  const updateFeature = (tier: 'Good' | 'Better' | 'Best', index: number, value: string) => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const option = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    const newFeatures = [...(option.features || [])];
    newFeatures[index] = value;
    setter({ ...option, features: newFeatures });
  };

  const handleSubmit = () => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const proposalNumber = existingProposal?.number || `PROP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const proposal: Proposal = {
      id: existingProposal?.id || crypto.randomUUID(),
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email || '',
      leadPhone: lead.phone || '',
      leadAddress: lead.address,
      number: proposalNumber,
      title,
      status: existingProposal?.status || 'Draft',
      createdDate: existingProposal?.createdDate || new Date().toISOString(),
      validUntil: validUntil.toISOString().split('T')[0],
      projectType: lead.projectType,
      projectDescription,
      scopeOfWork: scopeItems.filter(item => item.trim() !== ''),
      options: [
        { ...goodOption, id: goodOption.id || crypto.randomUUID() } as ProposalOption,
        { ...betterOption, id: betterOption.id || crypto.randomUUID() } as ProposalOption,
        { ...bestOption, id: bestOption.id || crypto.randomUUID() } as ProposalOption
      ],
      selectedOptionId: existingProposal?.selectedOptionId,
      terms: termsItems.filter(item => item.trim() !== ''),
      timeline,
      warranty,
      companyId: lead.companyId,
      viewCount: existingProposal?.viewCount || 0
    };

    onSave(proposal);
  };

  const renderOptionEditor = (
    option: Partial<ProposalOption>,
    setter: React.Dispatch<React.SetStateAction<Partial<ProposalOption>>>,
    tier: 'Good' | 'Better' | 'Best'
  ) => (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h4 className="text-lg font-bold text-slate-900 mb-4">{tier} Option</h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Option Name</label>
          <input
            type="text"
            value={option.name || ''}
            onChange={(e) => setter({ ...option, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            type="text"
            value={option.description || ''}
            onChange={(e) => setter({ ...option, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Materials</label>
          {(option.materials || []).map((material, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={material}
                onChange={(e) => updateMaterial(tier, idx, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Material name"
              />
              <button
                onClick={() => removeMaterial(tier, idx)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Minus size={20} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addMaterial(tier)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Add Material
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Features</label>
          {(option.features || []).map((feature, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(tier, idx, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Feature description"
              />
              <button
                onClick={() => removeFeature(tier, idx)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Minus size={20} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addFeature(tier)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Add Feature
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
            <input
              type="number"
              value={option.price || 0}
              onChange={(e) => setter({ ...option, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Savings ($)</label>
            <input
              type="number"
              value={option.savings || 0}
              onChange={(e) => setter({ ...option, savings: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warranty</label>
            <input
              type="text"
              value={option.warranty || ''}
              onChange={(e) => setter({ ...option, warranty: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
            <input
              type="text"
              value={option.timeline || ''}
              onChange={(e) => setter({ ...option, timeline: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={option.isRecommended || false}
            onChange={(e) => setter({ ...option, isRecommended: e.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Mark as recommended</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {existingProposal ? 'Edit Proposal' : 'Create New Proposal'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              For: {lead.name} - {lead.address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lead.projectType === 'Insurance' && (
              <button
                onClick={() => setShowDamageReport(true)}
                className="px-3 py-2 border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <AlertTriangle size={18} />
                {damageReport ? 'Edit Damage Report' : 'Add Damage Report'}
              </button>
            )}
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Tip: Good, Better, Best Pricing</p>
              <p>Offer three options to give clients choice. Most clients choose the middle "Better" option when presented with three tiers.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid For (days)</label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Scope of Work</label>
            {scopeItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateScopeItem(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Work item"
                />
                <button
                  onClick={() => removeScopeItem(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Minus size={20} />
                </button>
              </div>
            ))}
            <button
              onClick={addScopeItem}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={16} /> Add Work Item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Timeline</label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warranty</label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Pricing Options</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderOptionEditor(goodOption, setGoodOption, 'Good')}
              {renderOptionEditor(betterOption, setBetterOption, 'Better')}
              {renderOptionEditor(bestOption, setBestOption, 'Best')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Terms & Conditions</label>
            {termsItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateTermsItem(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Term or condition"
                />
                <button
                  onClick={() => removeTermsItem(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Minus size={20} />
                </button>
              </div>
            ))}
            <button
              onClick={addTermsItem}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={16} /> Add Term
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
          >
            <CheckCircle size={20} />
            {existingProposal ? 'Update Proposal' : 'Create Proposal'}
          </button>
        </div>
      </div>

      {showDamageReport && (
        <InsuranceDamageReportForm
          lead={lead}
          proposalId={existingProposal?.id}
          existingReport={damageReport || undefined}
          onSave={(report) => {
            setDamageReport(report);
            setShowDamageReport(false);
          }}
          onCancel={() => setShowDamageReport(false)}
        />
      )}
    </div>
  );
};

export default ProposalBuilder;
