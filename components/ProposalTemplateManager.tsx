import React, { useState, useEffect } from 'react';
import { ScrollText, Plus, Edit2, Trash2, Copy, Star, X, Save } from 'lucide-react';
import { ProposalTemplate, ProposalOption } from '../types';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface ProposalTemplateManagerProps {
  onClose: () => void;
  onSelectTemplate?: (template: ProposalTemplate) => void;
}

const ProposalTemplateManager: React.FC<ProposalTemplateManagerProps> = ({ onClose, onSelectTemplate }) => {
  const { currentUser, addToast } = useStore();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<ProposalTemplate>>({
    name: '',
    description: '',
    projectDescription: '',
    scopeOfWork: [''],
    terms: [''],
    timeline: '',
    warranty: '',
    goodOption: {
      tier: 'Good',
      name: '',
      description: '',
      materials: [''],
      features: [''],
      warranty: '',
      timeline: '',
      price: 0
    },
    betterOption: {
      tier: 'Better',
      name: '',
      description: '',
      materials: [''],
      features: [''],
      warranty: '',
      timeline: '',
      price: 0
    },
    bestOption: {
      tier: 'Best',
      name: '',
      description: '',
      materials: [''],
      features: [''],
      warranty: '',
      timeline: '',
      price: 0
    },
    isDefault: false
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    if (!currentUser?.companyId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('company_id', currentUser.companyId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data.map((t: any) => ({
        id: t.id,
        companyId: t.company_id,
        name: t.name,
        description: t.description,
        projectDescription: t.project_description,
        scopeOfWork: t.scope_of_work || [],
        terms: t.terms || [],
        timeline: t.timeline,
        warranty: t.warranty,
        goodOption: t.good_option || {},
        betterOption: t.better_option || {},
        bestOption: t.best_option || {},
        isDefault: t.is_default,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })));
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      description: '',
      projectDescription: '',
      scopeOfWork: [''],
      terms: [''],
      timeline: '',
      warranty: '',
      goodOption: {
        tier: 'Good',
        name: '',
        description: '',
        materials: [''],
        features: [''],
        warranty: '',
        timeline: '',
        price: 0
      },
      betterOption: {
        tier: 'Better',
        name: '',
        description: '',
        materials: [''],
        features: [''],
        warranty: '',
        timeline: '',
        price: 0
      },
      bestOption: {
        tier: 'Best',
        name: '',
        description: '',
        materials: [''],
        features: [''],
        warranty: '',
        timeline: '',
        price: 0
      },
      isDefault: false
    });
    setEditingTemplate(null);
    setIsEditing(true);
  };

  const handleEdit = (template: ProposalTemplate) => {
    setFormData(template);
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentUser?.companyId || !formData.name) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const templateData = {
      company_id: currentUser.companyId,
      name: formData.name,
      description: formData.description || '',
      project_description: formData.projectDescription || '',
      scope_of_work: formData.scopeOfWork || [],
      terms: formData.terms || [],
      timeline: formData.timeline || '',
      warranty: formData.warranty || '',
      good_option: formData.goodOption || {},
      better_option: formData.betterOption || {},
      best_option: formData.bestOption || {},
      is_default: formData.isDefault || false,
      updated_at: new Date().toISOString()
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('proposal_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);

      if (!error) {
        addToast('Template updated successfully', 'success');
        loadTemplates();
        setIsEditing(false);
      } else {
        addToast('Failed to update template', 'error');
      }
    } else {
      const { error } = await supabase
        .from('proposal_templates')
        .insert(templateData);

      if (!error) {
        addToast('Template created successfully', 'success');
        loadTemplates();
        setIsEditing(false);
      } else {
        addToast('Failed to create template', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const { error } = await supabase
      .from('proposal_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      addToast('Template deleted successfully', 'success');
      loadTemplates();
    } else {
      addToast('Failed to delete template', 'error');
    }
  };

  const handleDuplicate = async (template: ProposalTemplate) => {
    const { error } = await supabase
      .from('proposal_templates')
      .insert({
        company_id: template.companyId,
        name: `${template.name} (Copy)`,
        description: template.description,
        project_description: template.projectDescription,
        scope_of_work: template.scopeOfWork,
        terms: template.terms,
        timeline: template.timeline,
        warranty: template.warranty,
        good_option: template.goodOption,
        better_option: template.betterOption,
        best_option: template.bestOption,
        is_default: false
      });

    if (!error) {
      addToast('Template duplicated successfully', 'success');
      loadTemplates();
    } else {
      addToast('Failed to duplicate template', 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    await supabase
      .from('proposal_templates')
      .update({ is_default: false })
      .eq('company_id', currentUser?.companyId);

    const { error } = await supabase
      .from('proposal_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (!error) {
      addToast('Default template updated', 'success');
      loadTemplates();
    }
  };

  const addArrayItem = (field: 'scopeOfWork' | 'terms') => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), '']
    });
  };

  const updateArrayItem = (field: 'scopeOfWork' | 'terms', index: number, value: string) => {
    const updated = [...(formData[field] || [])];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };

  const removeArrayItem = (field: 'scopeOfWork' | 'terms', index: number) => {
    const updated = (formData[field] || []).filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updated });
  };

  const updateOption = (tier: 'goodOption' | 'betterOption' | 'bestOption', updates: Partial<ProposalOption>) => {
    setFormData({
      ...formData,
      [tier]: { ...(formData[tier] || {}), ...updates }
    });
  };

  const addOptionArrayItem = (tier: 'goodOption' | 'betterOption' | 'bestOption', field: 'materials' | 'features') => {
    const option = formData[tier] || {};
    const arr = option[field] || [];
    updateOption(tier, { [field]: [...arr, ''] });
  };

  const updateOptionArrayItem = (tier: 'goodOption' | 'betterOption' | 'bestOption', field: 'materials' | 'features', index: number, value: string) => {
    const option = formData[tier] || {};
    const arr = [...(option[field] || [])];
    arr[index] = value;
    updateOption(tier, { [field]: arr });
  };

  const removeOptionArrayItem = (tier: 'goodOption' | 'betterOption' | 'bestOption', field: 'materials' | 'features', index: number) => {
    const option = formData[tier] || {};
    const arr = (option[field] || []).filter((_, i: number) => i !== index);
    updateOption(tier, { [field]: arr });
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name*</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Standard Three-Tier Proposal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                <input
                  type="text"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 4-6 business days"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Brief description of this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
              <textarea
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Default project description for proposals using this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scope of Work</label>
              {(formData.scopeOfWork || []).map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayItem('scopeOfWork', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Scope item"
                  />
                  <button
                    onClick={() => removeArrayItem('scopeOfWork', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('scopeOfWork')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Terms & Conditions</label>
              {(formData.terms || []).map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayItem('terms', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Term or condition"
                  />
                  <button
                    onClick={() => removeArrayItem('terms', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('terms')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={16} /> Add Term
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warranty</label>
              <input
                type="text"
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Lifetime Material + 10-Year Workmanship"
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing Tiers</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['goodOption', 'betterOption', 'bestOption'] as const).map((tier, tierIndex) => {
                  const option = formData[tier] || {};
                  const tierName = ['Good', 'Better', 'Best'][tierIndex];

                  return (
                    <div key={tier} className="border border-slate-200 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">{tierName} Option</h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                          <input
                            type="text"
                            value={option.name || ''}
                            onChange={(e) => updateOption(tier, { name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={option.description || ''}
                            onChange={(e) => updateOption(tier, { description: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Price ($)</label>
                          <input
                            type="number"
                            value={option.price || 0}
                            onChange={(e) => updateOption(tier, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Materials</label>
                          {((option.materials || []) as string[]).map((material, idx) => (
                            <div key={idx} className="flex gap-1 mb-1">
                              <input
                                type="text"
                                value={material}
                                onChange={(e) => updateOptionArrayItem(tier, 'materials', idx, e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => removeOptionArrayItem(tier, 'materials', idx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOptionArrayItem(tier, 'materials')}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Features</label>
                          {((option.features || []) as string[]).map((feature, idx) => (
                            <div key={idx} className="flex gap-1 mb-1">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => updateOptionArrayItem(tier, 'features', idx, e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => removeOptionArrayItem(tier, 'features', idx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOptionArrayItem(tier, 'features')}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault || false}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-slate-700">Set as default template</label>
            </div>
          </div>

          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={18} />
              Save Template
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Proposal Templates</h2>
            <p className="text-sm text-slate-500 mt-1">Create reusable proposal templates for faster quote generation</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} />
              New Template
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Templates Yet</h3>
              <p className="text-slate-500 mb-4">Create your first proposal template to streamline your workflow</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Create First Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        {template.isDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-500">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div>• {template.scopeOfWork.length} scope items</div>
                    <div>• {template.terms.length} terms</div>
                    <div>• 3 pricing tiers configured</div>
                  </div>

                  <div className="flex gap-2">
                    {onSelectTemplate && (
                      <button
                        onClick={() => onSelectTemplate(template)}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Use Template
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="Set as default"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalTemplateManager;