import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Copy, Star, X, Save, Upload, MousePointer } from 'lucide-react';
import { ContractTemplate, FormField, SignatureField } from '../types';
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
    pdfUrl: '',
    formFields: [],
    signatureFields: [],
    isDefault: false
  });

  const [editingFormField, setEditingFormField] = useState<FormField | null>(null);
  const [editingSignatureField, setEditingSignatureField] = useState<SignatureField | null>(null);

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
        pdfUrl: t.pdf_url,
        formFields: t.form_fields || [],
        signatureFields: t.signature_fields || [],
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
      pdfUrl: '',
      formFields: [],
      signatureFields: [],
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
    if (!currentUser?.companyId || !formData.name || !formData.pdfUrl) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const templateData = {
      company_id: currentUser.companyId,
      name: formData.name,
      description: formData.description || '',
      pdf_url: formData.pdfUrl,
      form_fields: formData.formFields || [],
      signature_fields: formData.signatureFields || [],
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
        pdf_url: template.pdfUrl,
        form_fields: template.formFields,
        signature_fields: template.signatureFields,
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

  const addFormField = () => {
    const newField: FormField = {
      fieldId: `field_${Date.now()}`,
      fieldType: 'text',
      label: 'New Field',
      page: 1,
      x: 100,
      y: 100,
      width: 200,
      height: 30,
      required: false
    };
    setFormData({
      ...formData,
      formFields: [...(formData.formFields || []), newField]
    });
  };

  const updateFormField = (index: number, updates: Partial<FormField>) => {
    const fields = [...(formData.formFields || [])];
    fields[index] = { ...fields[index], ...updates };
    setFormData({ ...formData, formFields: fields });
  };

  const removeFormField = (index: number) => {
    setFormData({
      ...formData,
      formFields: (formData.formFields || []).filter((_, i) => i !== index)
    });
  };

  const addSignatureField = () => {
    const newField: SignatureField = {
      fieldId: `sig_${Date.now()}`,
      signerRole: 'client',
      label: 'Client Signature',
      page: 1,
      x: 100,
      y: 500,
      width: 250,
      height: 60
    };
    setFormData({
      ...formData,
      signatureFields: [...(formData.signatureFields || []), newField]
    });
  };

  const updateSignatureField = (index: number, updates: Partial<SignatureField>) => {
    const fields = [...(formData.signatureFields || [])];
    fields[index] = { ...fields[index], ...updates };
    setFormData({ ...formData, signatureFields: fields });
  };

  const removeSignatureField = (index: number) => {
    setFormData({
      ...formData,
      signatureFields: (formData.signatureFields || []).filter((_, i) => i !== index)
    });
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Upload your PDF contract template and add form fields and signature areas. Fields will be overlaid on the PDF for users to fill out electronically.
              </p>
            </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-1">PDF URL*</label>
                <input
                  type="text"
                  value={formData.pdfUrl}
                  onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/contract.pdf"
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

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Form Fields</h3>
                <button
                  onClick={addFormField}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Field
                </button>
              </div>

              {(formData.formFields || []).length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <MousePointer size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No form fields added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(formData.formFields || []).map((field, index) => (
                    <div key={field.fieldId} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateFormField(index, { label: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                          <select
                            value={field.fieldType}
                            onChange={(e) => updateFormField(index, { fieldType: e.target.value as FormField['fieldType'] })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="date">Date</option>
                            <option value="number">Number</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Page</label>
                          <input
                            type="number"
                            value={field.page}
                            onChange={(e) => updateFormField(index, { page: parseInt(e.target.value) || 1 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateFormField(index, { required: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-700">Required</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">X Position</label>
                          <input
                            type="number"
                            value={field.x}
                            onChange={(e) => updateFormField(index, { x: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Y Position</label>
                          <input
                            type="number"
                            value={field.y}
                            onChange={(e) => updateFormField(index, { y: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Width</label>
                          <input
                            type="number"
                            value={field.width}
                            onChange={(e) => updateFormField(index, { width: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Height</label>
                          <input
                            type="number"
                            value={field.height}
                            onChange={(e) => updateFormField(index, { height: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => removeFormField(index)}
                            className="w-full px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100"
                          >
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Signature Fields</h3>
                <button
                  onClick={addSignatureField}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Signature
                </button>
              </div>

              {(formData.signatureFields || []).length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No signature fields added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(formData.signatureFields || []).map((field, index) => (
                    <div key={field.fieldId} className="border border-slate-200 rounded-lg p-4 bg-green-50">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateSignatureField(index, { label: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Signer Role</label>
                          <select
                            value={field.signerRole}
                            onChange={(e) => updateSignatureField(index, { signerRole: e.target.value as SignatureField['signerRole'] })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="client">Client</option>
                            <option value="contractor">Contractor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Page</label>
                          <input
                            type="number"
                            value={field.page}
                            onChange={(e) => updateSignatureField(index, { page: parseInt(e.target.value) || 1 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">X Position</label>
                          <input
                            type="number"
                            value={field.x}
                            onChange={(e) => updateSignatureField(index, { x: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Y Position</label>
                          <input
                            type="number"
                            value={field.y}
                            onChange={(e) => updateSignatureField(index, { y: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Width</label>
                          <input
                            type="number"
                            value={field.width}
                            onChange={(e) => updateSignatureField(index, { width: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Height</label>
                          <input
                            type="number"
                            value={field.height}
                            onChange={(e) => updateSignatureField(index, { height: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => removeSignatureField(index)}
                            className="w-full px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100"
                          >
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <p className="text-sm text-slate-500 mt-1">Create PDF-based contract templates with fillable fields and e-signatures</p>
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
              <p className="text-slate-500 mb-4">Create your first PDF contract template with fillable fields</p>
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
                    <div>• {template.formFields.length} form fields</div>
                    <div>• {template.signatureFields.length} signature areas</div>
                    {template.pdfUrl && <div>• PDF template configured</div>}
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