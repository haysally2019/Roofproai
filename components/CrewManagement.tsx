import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  labor_rate: number;
  phone: string | null;
  email: string | null;
  status: string;
  hire_date: string;
  notes: string | null;
}

const CrewManagement: React.FC = () => {
  const { currentUser, addToast } = useStore();
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Roofer',
    labor_rate: 75,
    phone: '',
    email: '',
    hire_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (currentUser?.companyId) {
      loadCrewMembers();
    }
  }, [currentUser, statusFilter]);

  const loadCrewMembers = async () => {
    try {
      let query = supabase
        .from('crew_members')
        .select('*')
        .eq('company_id', currentUser!.companyId)
        .order('name');

      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (error) {
      console.error('Error loading crew members:', error);
      addToast('Failed to load crew members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.labor_rate) {
      addToast('Please fill in required fields', 'error');
      return;
    }

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('crew_members')
          .update({
            name: formData.name,
            role: formData.role,
            labor_rate: formData.labor_rate,
            phone: formData.phone || null,
            email: formData.email || null,
            hire_date: formData.hire_date,
            notes: formData.notes || null
          })
          .eq('id', editingMember.id);

        if (error) throw error;
        addToast('Crew member updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('crew_members')
          .insert([{
            company_id: currentUser!.companyId,
            name: formData.name,
            role: formData.role,
            labor_rate: formData.labor_rate,
            phone: formData.phone || null,
            email: formData.email || null,
            status: 'Active',
            hire_date: formData.hire_date,
            notes: formData.notes || null
          }]);

        if (error) throw error;
        addToast('Crew member added successfully', 'success');
      }

      resetForm();
      loadCrewMembers();
    } catch (error) {
      console.error('Error saving crew member:', error);
      addToast('Failed to save crew member', 'error');
    }
  };

  const handleEdit = (member: CrewMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      labor_rate: member.labor_rate,
      phone: member.phone || '',
      email: member.email || '',
      hire_date: member.hire_date,
      notes: member.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this crew member?')) return;

    try {
      const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('Crew member deleted successfully', 'success');
      loadCrewMembers();
    } catch (error) {
      console.error('Error deleting crew member:', error);
      addToast('Failed to delete crew member', 'error');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('crew_members')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      addToast(`Crew member marked as ${status}`, 'success');
      loadCrewMembers();
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Failed to update status', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'Roofer',
      labor_rate: 75,
      phone: '',
      email: '',
      hire_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingMember(null);
    setShowModal(false);
  };

  const filteredMembers = crewMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-slate-100 text-slate-700',
    'On Leave': 'bg-yellow-100 text-yellow-700'
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading crew members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-blue-600" />
            Crew Management
          </h1>
          <p className="text-slate-500 mt-1">Manage your roofing crew and labor rates</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          Add Crew Member
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search crew members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option>Active</option>
          <option>All</option>
          <option>Inactive</option>
          <option>On Leave</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{member.name}</h3>
                    <p className="text-sm text-slate-600">{member.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[member.status]}`}>
                  {member.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <DollarSign size={16} className="text-slate-400" />
                  <span className="font-semibold text-slate-900">${member.labor_rate}/hr</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Hired: {new Date(member.hire_date).toLocaleDateString()}</span>
                </div>
                {member.phone && (
                  <p className="text-sm text-slate-600">{member.phone}</p>
                )}
                {member.email && (
                  <p className="text-sm text-slate-600">{member.email}</p>
                )}
              </div>

              {member.notes && (
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{member.notes}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                {member.status === 'Active' ? (
                  <button
                    onClick={() => updateStatus(member.id, 'Inactive')}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(member.id, 'Active')}
                    className="px-3 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No crew members found
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingMember ? 'Edit Crew Member' : 'Add Crew Member'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Crew Lead</option>
                    <option>Roofer</option>
                    <option>Technician</option>
                    <option>Helper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Labor Rate ($/hr) *</label>
                  <input
                    type="number"
                    value={formData.labor_rate}
                    onChange={(e) => setFormData({...formData, labor_rate: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this crew member..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {editingMember ? 'Update' : 'Add'} Crew Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrewManagement;
