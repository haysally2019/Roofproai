import React, { useState } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle, Camera, FileText } from 'lucide-react';
import { InsuranceDamageReport, DamagedArea, Lead } from '../types';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface InsuranceDamageReportFormProps {
  lead: Lead;
  proposalId?: string;
  existingReport?: InsuranceDamageReport;
  onSave: (report: InsuranceDamageReport) => void;
  onCancel: () => void;
}

const InsuranceDamageReportForm: React.FC<InsuranceDamageReportFormProps> = ({
  lead,
  proposalId,
  existingReport,
  onSave,
  onCancel
}) => {
  const { currentUser, addToast } = useStore();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<InsuranceDamageReport>>(existingReport || {
    proposalId,
    leadId: lead.id,
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: currentUser?.name || '',
    weatherEventDate: lead.damageDate || '',
    weatherEventType: '',
    damagedAreas: [],
    damagePhotos: [],
    estimatedDamage: 0,
    insuranceCarrier: lead.insuranceCarrier || '',
    claimNumber: lead.claimNumber || '',
    adjusterName: lead.adjusterName || '',
    adjusterContact: lead.adjusterPhone || '',
    notes: ''
  });

  const handleAddDamagedArea = () => {
    setFormData({
      ...formData,
      damagedAreas: [
        ...(formData.damagedAreas || []),
        {
          location: '',
          type: 'Shingles',
          severity: 'Moderate',
          description: ''
        }
      ]
    });
  };

  const handleUpdateDamagedArea = (index: number, updates: Partial<DamagedArea>) => {
    const areas = [...(formData.damagedAreas || [])];
    areas[index] = { ...areas[index], ...updates };
    setFormData({ ...formData, damagedAreas: areas });
  };

  const handleRemoveDamagedArea = (index: number) => {
    setFormData({
      ...formData,
      damagedAreas: (formData.damagedAreas || []).filter((_, i) => i !== index)
    });
  };

  const handleAddPhoto = () => {
    setFormData({
      ...formData,
      damagePhotos: [
        ...(formData.damagePhotos || []),
        {
          url: '',
          caption: '',
          timestamp: new Date().toISOString()
        }
      ]
    });
  };

  const handleSelectLeadPhoto = (photoUrl: string, photoName: string) => {
    setFormData({
      ...formData,
      damagePhotos: [
        ...(formData.damagePhotos || []),
        {
          url: photoUrl,
          caption: photoName,
          timestamp: new Date().toISOString()
        }
      ]
    });
  };

  const handleUpdatePhoto = (index: number, field: 'url' | 'caption', value: string) => {
    const photos = [...(formData.damagePhotos || [])];
    photos[index] = { ...photos[index], [field]: value };
    setFormData({ ...formData, damagePhotos: photos });
  };

  const handleRemovePhoto = (index: number) => {
    setFormData({
      ...formData,
      damagePhotos: (formData.damagePhotos || []).filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    if (!currentUser?.companyId) return;

    setSaving(true);

    const reportData = {
      proposal_id: formData.proposalId,
      company_id: currentUser.companyId,
      lead_id: formData.leadId,
      inspection_date: formData.inspectionDate,
      inspector_name: formData.inspectorName,
      weather_event_date: formData.weatherEventDate,
      weather_event_type: formData.weatherEventType,
      damaged_areas: formData.damagedAreas || [],
      damage_photos: formData.damagePhotos || [],
      estimated_damage: formData.estimatedDamage || 0,
      insurance_carrier: formData.insuranceCarrier,
      claim_number: formData.claimNumber,
      adjuster_name: formData.adjusterName,
      adjuster_contact: formData.adjusterContact,
      notes: formData.notes,
      updated_at: new Date().toISOString()
    };

    if (existingReport) {
      const { data, error } = await supabase
        .from('insurance_damage_reports')
        .update(reportData)
        .eq('id', existingReport.id)
        .select()
        .single();

      if (!error && data) {
        addToast('Damage report updated successfully', 'success');
        onSave({
          ...formData,
          id: data.id,
          companyId: data.company_id
        } as InsuranceDamageReport);
      } else {
        addToast('Failed to update damage report', 'error');
      }
    } else {
      const { data, error } = await supabase
        .from('insurance_damage_reports')
        .insert(reportData)
        .select()
        .single();

      if (!error && data) {
        addToast('Damage report created successfully', 'success');
        onSave({
          ...formData,
          id: data.id,
          companyId: data.company_id
        } as InsuranceDamageReport);
      } else {
        addToast('Failed to create damage report', 'error');
      }
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Insurance Damage Report</h2>
              <p className="text-sm text-slate-500">Document storm damage for insurance claims</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <FileText className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-blue-900 text-sm">Lead Information</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {lead.name} • {lead.address}
                  {lead.insuranceCarrier && ` • ${lead.insuranceCarrier}`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Date*</label>
              <input
                type="date"
                value={formData.inspectionDate}
                onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspector Name*</label>
              <input
                type="text"
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Inspector name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weather Event Date</label>
              <input
                type="date"
                value={formData.weatherEventDate}
                onChange={(e) => setFormData({ ...formData, weatherEventDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
              <select
                value={formData.weatherEventType}
                onChange={(e) => setFormData({ ...formData, weatherEventType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select event type</option>
                <option value="Hail">Hail</option>
                <option value="Wind">Wind</option>
                <option value="Tornado">Tornado</option>
                <option value="Hurricane">Hurricane</option>
                <option value="Ice Storm">Ice Storm</option>
                <option value="Lightning">Lightning</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Damaged Areas</h3>
              <button
                onClick={handleAddDamagedArea}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus size={16} />
                Add Area
              </button>
            </div>

            {(formData.damagedAreas || []).length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <AlertTriangle size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No damaged areas documented yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.damagedAreas || []).map((area, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-slate-900">Area #{index + 1}</h4>
                      <button
                        onClick={() => handleRemoveDamagedArea(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                        <input
                          type="text"
                          value={area.location}
                          onChange={(e) => handleUpdateDamagedArea(index, { location: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., North facing slope"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Damage Type</label>
                        <select
                          value={area.type}
                          onChange={(e) => handleUpdateDamagedArea(index, { type: e.target.value as DamagedArea['type'] })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Shingles">Shingles</option>
                          <option value="Flashing">Flashing</option>
                          <option value="Gutters">Gutters</option>
                          <option value="Vents">Vents</option>
                          <option value="Decking">Decking</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                        <select
                          value={area.severity}
                          onChange={(e) => handleUpdateDamagedArea(index, { severity: e.target.value as DamagedArea['severity'] })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Minor">Minor</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                        <textarea
                          value={area.description}
                          onChange={(e) => handleUpdateDamagedArea(index, { description: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Describe the damage in detail"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Damage Photos</h3>
              <button
                onClick={handleAddPhoto}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Camera size={16} />
                Add Photo URL
              </button>
            </div>

            {lead.documents && lead.documents.filter(doc => doc.type === 'Photo').length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-3">Photos from Lead ({lead.documents.filter(doc => doc.type === 'Photo').length} available)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lead.documents
                    .filter(doc => doc.type === 'Photo')
                    .map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectLeadPhoto(doc.url || '', doc.name)}
                        className="relative group bg-white border-2 border-slate-200 hover:border-blue-500 rounded-lg overflow-hidden transition-all aspect-square"
                      >
                        {doc.url ? (
                          <img
                            src={doc.url}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
                            <Camera className="text-slate-400 mb-1" size={24} />
                            <span className="text-xs text-slate-500 px-2 text-center">{doc.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Plus className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to add
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {(formData.damagePhotos || []).length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No photos added yet</p>
                <p className="text-xs text-slate-400 mt-1">Click photos above or add URLs manually</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(formData.damagePhotos || []).map((photo, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-3 bg-white flex gap-3 items-start">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Damage photo'}
                        className="w-20 h-20 object-cover rounded border border-slate-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                        <Camera className="text-slate-400" size={24} />
                      </div>
                    )}
                    <div className="flex-1 grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={photo.url}
                        onChange={(e) => handleUpdatePhoto(index, 'url', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Photo URL"
                      />
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => handleUpdatePhoto(index, 'caption', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Photo caption or description"
                      />
                    </div>
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Carrier</label>
              <input
                type="text"
                value={formData.insuranceCarrier}
                onChange={(e) => setFormData({ ...formData, insuranceCarrier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Insurance company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Claim Number</label>
              <input
                type="text"
                value={formData.claimNumber}
                onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Claim #"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adjuster Name</label>
              <input
                type="text"
                value={formData.adjusterName}
                onChange={(e) => setFormData({ ...formData, adjusterName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adjuster name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adjuster Contact</label>
              <input
                type="text"
                value={formData.adjusterContact}
                onChange={(e) => setFormData({ ...formData, adjusterContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone or email"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Damage Amount ($)</label>
              <input
                type="number"
                value={formData.estimatedDamage}
                onChange={(e) => setFormData({ ...formData, estimatedDamage: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Any additional observations or notes about the damage..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsuranceDamageReportForm;