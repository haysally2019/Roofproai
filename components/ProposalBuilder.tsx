import React, { useState } from 'react';
import { X, Plus, Minus, CheckCircle, AlertCircle, Save, ArrowLeft, PenTool } from 'lucide-react';
import { Proposal, ProposalOption, Lead } from '../types';

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(existingProposal?.title || `${lead.projectType || 'Roofing'} Project - ${lead.address}`);
  const [projectDescription, setProjectDescription] = useState(
    existingProposal?.projectDescription || 'Complete roof replacement including removal of existing materials, inspection of decking, and installation of new premium roofing system.'
  );
  
  const [scopeItems, setScopeItems] = useState<string[]>(
    existingProposal?.scopeOfWork || [
      'Remove existing roof system down to deck',
      'Inspect decking for rot or damage (replace as needed)',
      'Install ice and water shield in valleys and eaves',
      'Install synthetic underlayment on remaining deck',
      'Install new drip edge flashing',
      'Install starter strip shingles',
      'Install field shingles per manufacturer specs',
      'Install ridge vent and cap shingles',
      'Clean up all debris and magnet sweep yard'
    ]
  );

  const [termsItems, setTermsItems] = useState<string[]>(
    existingProposal?.terms || [
      'Proposal valid for 30 days',
      '50% deposit required to schedule',
      'Balance due upon completion',
      'Subject to hidden damage inspection'
    ]
  );

  const [timeline, setTimeline] = useState(existingProposal?.timeline || '2-3 days');
  const [warranty, setWarranty] = useState(existingProposal?.warranty || 'Lifetime Manufacturer Warranty + 10 Year Workmanship');
  const [validDays, setValidDays] = useState(30);

  // Helper to create default options
  const createDefaultOption = (tier: 'Good' | 'Better' | 'Best', price: number, name: string) => ({
    id: crypto.randomUUID(),
    tier,
    name,
    description: tier === 'Good' ? 'Reliable protection' : tier === 'Better' ? 'Enhanced durability' : 'Maximum performance',
    materials: ['Asphalt Shingles', 'Synthetic Underlayment'],
    features: ['Standard Warranty', 'Clean up'],
    warranty: 'Standard',
    timeline: '2 days',
    price,
    savings: 0,
    isRecommended: tier === 'Better'
  });

  const [goodOption, setGoodOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Good') || createDefaultOption('Good', 10000, 'Silver Package')
  );

  const [betterOption, setBetterOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Better') || createDefaultOption('Better', 12500, 'Gold Package')
  );

  const [bestOption, setBestOption] = useState<Partial<ProposalOption>>(
    existingProposal?.options.find(o => o.tier === 'Best') || createDefaultOption('Best', 15000, 'Platinum Package')
  );

  // --- Handlers ---

  const handleArrayChange = (
    setter: React.Dispatch<React.SetStateAction<string[]>>, 
    items: string[], 
    index: number, 
    value: string
  ) => {
    const newItems = [...items];
    newItems[index] = value;
    setter(newItems);
  };

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, items: string[]) => {
    setter([...items, '']);
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, items: string[], index: number) => {
    setter(items.filter((_, i) => i !== index));
  };

  // Generic handler for updating options
  const updateOption = (
    tier: 'Good' | 'Better' | 'Best', 
    field: keyof ProposalOption, 
    value: any
  ) => {
    const setter = tier === 'Good' ? setGoodOption : tier === 'Better' ? setBetterOption : setBestOption;
    const current = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    setter({ ...current, [field]: value });
  };

  // Array handlers for inside options (materials/features)
  const updateOptionArray = (
    tier: 'Good' | 'Better' | 'Best',
    field: 'materials' | 'features',
    index: number,
    value: string
  ) => {
    const current = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    const array = [...(current[field] || [])];
    array[index] = value;
    updateOption(tier, field, array);
  };

  const addOptionArrayItem = (tier: 'Good' | 'Better' | 'Best', field: 'materials' | 'features') => {
    const current = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    updateOption(tier, field, [...(current[field] || []), '']);
  };

  const removeOptionArrayItem = (tier: 'Good' | 'Better' | 'Best', field: 'materials' | 'features', index: number) => {
    const current = tier === 'Good' ? goodOption : tier === 'Better' ? betterOption : bestOption;
    updateOption(tier, field, (current[field] || []).filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validDays);

    const proposalNumber = existingProposal?.number || `PROP-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;

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
      validUntil: validUntilDate.toISOString(),
      projectType: lead.projectType || 'Retail',
      projectDescription,
      scopeOfWork: scopeItems.filter(i => i.trim()),
      terms: termsItems.filter(i => i.trim()),
      timeline,
      warranty,
      companyId: lead.companyId, // Ensure this exists in Lead type or pass it
      viewCount: existingProposal?.viewCount || 0,
      options: [
        { ...goodOption, tier: 'Good' } as ProposalOption,
        { ...betterOption, tier: 'Better' } as ProposalOption,
        { ...bestOption, tier: 'Best' } as ProposalOption,
      ],
      selectedOptionId: existingProposal?.selectedOptionId
    };

    onSave(proposal);
  };

  // --- Render Helpers ---

  const renderOptionForm = (tier: 'Good' | 'Better' | 'Best', option: Partial<ProposalOption>) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-lg text-slate-800">{tier} Option</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={option.isRecommended}
            onChange={(e) => updateOption(tier, 'isRecommended', e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-600">Recommended</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Package Name</label>
        <input 
          value={option.name} 
          onChange={(e) => updateOption(tier, 'name', e.target.value)}
          className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price ($)</label>
          <input 
            type="number"
            value={option.price} 
            onChange={(e) => updateOption(tier, 'price', parseFloat(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Savings ($)</label>
          <input 
            type="number"
            value={option.savings || 0} 
            onChange={(e) => updateOption(tier, 'savings', parseFloat(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-bold text-slate-500 uppercase">Key Features</label>
          <button onClick={() => addOptionArrayItem(tier, 'features')} className="text-blue-600 hover:text-blue-700">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {option.features?.map((feat, i) => (
            <div key={i} className="flex gap-2">
              <input 
                value={feat}
                onChange={(e) => updateOptionArray(tier, 'features', i, e.target.value)}
                className="flex-1 p-1.5 border border-slate-300 rounded text-sm"
              />
              <button onClick={() => removeOptionArrayItem(tier, 'features', i)} className="text-red-400 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Builder Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Proposal Builder</h2>
            <p className="text-sm text-slate-500">Creating for {lead.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white rounded-lg border border-slate-300 p-1">
            <button 
              onClick={() => setStep(1)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${step === 1 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              1. Details
            </button>
            <button 
              onClick={() => setStep(2)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${step === 2 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              2. Scope
            </button>
            <button 
              onClick={() => setStep(3)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${step === 3 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              3. Pricing
            </button>
          </div>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-all"
          >
            <Save size={18} /> Save Proposal
          </button>
        </div>
      </div>

      {/* Builder Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* STEP 1: GENERAL DETAILS */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Proposal Title</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Valid For (Days)</label>
                  <input 
                    type="number"
                    value={validDays}
                    onChange={(e) => setValidDays(parseInt(e.target.value))}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Project Description</label>
                <textarea 
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Terms & Conditions</label>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {termsItems.map((term, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-400 font-mono pt-2">{i+1}.</span>
                      <input 
                        value={term}
                        onChange={(e) => handleArrayChange(setTermsItems, termsItems, i, e.target.value)}
                        className="flex-1 p-2 border border-slate-300 rounded-lg"
                      />
                      <button onClick={() => removeArrayItem(setTermsItems, termsItems, i)} className="text-red-400 hover:text-red-600 p-2">
                        <Minus size={18} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addArrayItem(setTermsItems, termsItems)} className="text-blue-600 font-medium text-sm flex items-center gap-1 pl-6">
                    <Plus size={16} /> Add Term
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCOPE OF WORK */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Scope of Work</h3>
                <button onClick={() => addArrayItem(setScopeItems, scopeItems)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                  <Plus size={18} /> Add Item
                </button>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {scopeItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                      <div className="mt-2 text-emerald-500">
                        <CheckCircle size={20} />
                      </div>
                      <textarea
                        value={item}
                        onChange={(e) => handleArrayChange(setScopeItems, scopeItems, i, e.target.value)}
                        rows={2}
                        className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 resize-none"
                        placeholder="Describe work item..."
                      />
                      <button 
                        onClick={() => removeArrayItem(setScopeItems, scopeItems, i)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRICING OPTIONS */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {renderOptionForm('Good', goodOption)}
              {renderOptionForm('Better', betterOption)}
              {renderOptionForm('Best', bestOption)}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProposalBuilder;