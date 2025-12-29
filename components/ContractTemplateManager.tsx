import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Copy, Star, X, Save } from 'lucide-react';
import { ContractTemplate, Contract } from '../types';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface ContractTemplateManagerProps {
  onClose: () => void;
  onSelectTemplate?: (template: ContractTemplate) => void;
}

const ContractTemplateManager: React.FC<ContractTemplateManagerProps> = ({ onClose, onSelectTemplate }) => {
  const { currentUser, addToast } = useStore();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<ContractTemplate>>({
    name: '',
    description: '',
    type: 'Residential Roofing',
    scopeOfWork: [''],
    materials: [''],
    terms: [''],
    paymentScheduleTemplate: [{ milestone: '', percentage: 0 }],
    warrantyText: '',
    isDefault: false
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    if (!currentUser?.companyId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('company_id', currentUser.companyId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data.map((t: any) => ({
        id: t.id,
        companyId: t.company_id,
        name: t.name,
        description: t.description,
        type: t.type,
        scopeOfWork: t.scope_of_work || [],
        materials: t.materials || [],
        terms: t.terms || [],
        paymentScheduleTemplate: t.payment_schedule_template || [],
        warrantyText: t.warranty_text,
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
      type: 'Residential Roofing',
      scopeOfWork: [''],
      materials: [''],
      terms: [''],
      paymentScheduleTemplate: [{ milestone: '', percentage: 0 }],
      warrantyText: '',
      isDefault: false
    });
    setEditingTemplate(null);
    setIsEditing(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    setFormData(template);
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentUser?.companyId || !formData.name || !formData.type) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const templateData = {
      company_id: currentUser.companyId,
      name: formData.name,
      description: formData.description || '',
      type: formData.type,
      scope_of_work: formData.scopeOfWork || [],
      materials: formData.materials || [],
      terms: formData.terms || [],
      payment_schedule_template: formData.paymentScheduleTemplate || [],
      warranty_text: formData.warrantyText || '',
      is_default: formData.isDefault || false,
      updated_at: new Date().toISOString()
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('contract_templates')
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
        .from('contract_templates')
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
      .from('contract_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      addToast('Template deleted successfully', 'success');
      loadTemplates();
    } else {
      addToast('Failed to delete template', 'error');
    }
  };

  const handleDuplicate = async (template: ContractTemplate) => {
    const { error } = await supabase
      .from('contract_templates')
      .insert({
        company_id: template.companyId,
        name: `${template.name} (Copy)`,
        description: template.description,
        type: template.type,
        scope_of_work: template.scopeOfWork,
        materials: template.materials,
        terms: template.terms,
        payment_schedule_template: template.paymentScheduleTemplate,
        warranty_text: template.warrantyText,
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
      .from('contract_templates')
      .update({ is_default: false })
      .eq('company_id', currentUser?.companyId);

    const { error } = await supabase
      .from('contract_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (!error) {
      addToast('Default template updated', 'success');
      loadTemplates();
    }
  };

  const addArrayItem = (field: 'scopeOfWork' | 'materials' | 'terms') => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), '']
    });
  };

  const updateArrayItem = (field: 'scopeOfWork' | 'materials' | 'terms', index: number, value: string) => {
    const updated = [...(formData[field] || [])];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };

  const removeArrayItem = (field: 'scopeOfWork' | 'materials' | 'terms', index: number) => {
    const updated = (formData[field] || []).filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updated });
  };

  const addPaymentMilestone = () => {
    setFormData({
      ...formData,
      paymentScheduleTemplate: [...(formData.paymentScheduleTemplate || []), { milestone: '', percentage: 0 }]
    });
  };

  const updatePaymentMilestone = (index: number, field: 'milestone' | 'percentage', value: string | number) => {
    const updated = [...(formData.paymentScheduleTemplate || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, paymentScheduleTemplate: updated });
  };

  const removePaymentMilestone = (index: number) => {
    const updated = (formData.paymentScheduleTemplate || []).filter((_, i) => i !== index);
    setFormData({ ...formData, paymentScheduleTemplate: updated });
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                  placeholder="e.g., Standard Residential Contract"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Contract['type'] })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Residential Roofing">Residential Roofing</option>
                  <option value="Commercial Roofing">Commercial Roofing</option>
                  <option value="Insurance Claim">Insurance Claim</option>
                  <option value="Warranty Work">Warranty Work</option>
                  <option value="Repair">Repair</option>
                </select>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Materials</label>
              {(formData.materials || []).map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayItem('materials', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Material name"
                  />
                  <button
                    onClick={() => removeArrayItem('materials', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('materials')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={16} /> Add Material
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Schedule Template</label>
              {(formData.paymentScheduleTemplate || []).map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item.milestone}
                    onChange={(e) => updatePaymentMilestone(index, 'milestone', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Milestone name"
                  />
                  <input
                    type="number"
                    value={item.percentage}
                    onChange={(e) => updatePaymentMilestone(index, 'percentage', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="%"
                  />
                  <button
                    onClick={() => removePaymentMilestone(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                onClick={addPaymentMilestone}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={16} /> Add Milestone
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Text</label>
              <textarea
                value={formData.warrantyText}
                onChange={(e) => setFormData({ ...formData, warrantyText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="e.g., 10 Year Workmanship + Manufacturer Material Warranty"
              />
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
            <h2 className="text-2xl font-bold text-slate-900">Contract Templates</h2>
            <p className="text-sm text-slate-500 mt-1">Create reusable contract templates for faster document generation</p>
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
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Templates Yet</h3>
              <p className="text-slate-500 mb-4">Create your first contract template to streamline your workflow</p>
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
                      <p className="text-sm text-slate-600 mb-2">{template.type}</p>
                      {template.description && (
                        <p className="text-sm text-slate-500">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div>• {template.scopeOfWork.length} scope items</div>
                    <div>• {template.materials.length} materials</div>
                    <div>• {template.terms.length} terms</div>
                    <div>• {template.paymentScheduleTemplate.length} payment milestones</div>
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

export default ContractTemplateManager;