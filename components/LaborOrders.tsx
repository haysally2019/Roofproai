import React, { useState } from 'react';
import { HardHat, Plus, Search, Calendar, Clock, DollarSign, Users, Eye, X } from 'lucide-react';

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface LaborOrder {
  id: string;
  workOrderNumber: string;
  leadId: string;
  leadName: string;
  workType: 'Tear-off' | 'Installation' | 'Repair' | 'Inspection';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  scheduledDate: string;
  estimatedHours: number;
  actualHours: number | null;
  crewMembers: CrewMember[];
  laborRate: number;
  totalLaborCost: number;
  notes: string;
}

const LaborOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LaborOrder | null>(null);

  const mockOrders: LaborOrder[] = [
    {
      id: '1',
      workOrderNumber: 'WO-2025-001',
      leadId: 'lead-1',
      leadName: 'Smith Residence',
      workType: 'Installation',
      status: 'Scheduled',
      scheduledDate: '2025-01-22',
      estimatedHours: 16,
      actualHours: null,
      crewMembers: [
        { id: '1', name: 'Mike Johnson', role: 'Crew Lead' },
        { id: '2', name: 'Carlos Rodriguez', role: 'Roofer' },
        { id: '3', name: 'Tom Williams', role: 'Roofer' }
      ],
      laborRate: 75,
      totalLaborCost: 3600,
      notes: 'Full roof replacement, 2-day job'
    },
    {
      id: '2',
      workOrderNumber: 'WO-2025-002',
      leadId: 'lead-2',
      leadName: 'Johnson Commercial',
      workType: 'Tear-off',
      status: 'In Progress',
      scheduledDate: '2025-01-18',
      estimatedHours: 12,
      actualHours: 8,
      crewMembers: [
        { id: '4', name: 'Steve Davis', role: 'Crew Lead' },
        { id: '5', name: 'Juan Martinez', role: 'Roofer' }
      ],
      laborRate: 75,
      totalLaborCost: 1800,
      notes: 'Commercial tear-off, dispose of old materials'
    },
    {
      id: '3',
      workOrderNumber: 'WO-2025-003',
      leadId: 'lead-3',
      leadName: 'Martinez Property',
      workType: 'Repair',
      status: 'Completed',
      scheduledDate: '2025-01-15',
      estimatedHours: 4,
      actualHours: 3.5,
      crewMembers: [
        { id: '6', name: 'David Lee', role: 'Technician' }
      ],
      laborRate: 85,
      totalLaborCost: 298,
      notes: 'Storm damage repair - completed under estimate'
    }
  ];

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-yellow-100 text-yellow-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  const workTypeColors = {
    'Tear-off': 'bg-orange-100 text-orange-700',
    'Installation': 'bg-purple-100 text-purple-700',
    'Repair': 'bg-blue-100 text-blue-700',
    'Inspection': 'bg-gray-100 text-gray-700'
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.workType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <HardHat className="text-orange-600" />
            Labor Orders
          </h1>
          <p className="text-slate-500 mt-1">Manage crew schedules and work orders</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          New Work Order
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by work order, job, or work type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        >
          <option>All</option>
          <option>Scheduled</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Work Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Job</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Work Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Schedule</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Hours</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Labor Cost</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900">{order.workOrderNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700">{order.leadName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${workTypeColors[order.workType]}`}>
                      {order.workType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={16} className="text-slate-400" />
                      {new Date(order.scheduledDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock size={16} className="text-slate-400" />
                      {order.actualHours || order.estimatedHours}h
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-900">${order.totalLaborCost.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">{selectedOrder.workOrderNumber}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job</label>
                  <p className="text-slate-900 font-medium mt-1">{selectedOrder.leadName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${workTypeColors[selectedOrder.workType]}`}>
                      {selectedOrder.workType}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Date</label>
                  <p className="text-slate-900 font-medium mt-1">
                    {new Date(selectedOrder.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Hours</label>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{selectedOrder.estimatedHours}h</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Hours</label>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {selectedOrder.actualHours ? `${selectedOrder.actualHours}h` : 'TBD'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Users size={18} />
                  Crew Members
                </h3>
                <div className="space-y-2">
                  {selectedOrder.crewMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-500">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-500">Labor Rate: ${selectedOrder.laborRate}/hr</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-slate-500 block">Total Labor Cost</span>
                    <span className="text-2xl font-bold text-orange-600">${selectedOrder.totalLaborCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
                  <p className="text-slate-700 mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaborOrders;
