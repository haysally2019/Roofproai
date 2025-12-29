import React, { useState } from 'react';
import { Package, Plus, Search, Filter, Calendar, DollarSign, Truck, Check, X, Eye } from 'lucide-react';

interface MaterialOrder {
  id: string;
  poNumber: string;
  supplier: string;
  leadId: string;
  leadName: string;
  status: 'Pending' | 'Ordered' | 'In Transit' | 'Delivered' | 'Cancelled';
  dateOrdered: string;
  deliveryDate: string;
  totalCost: number;
  items: { name: string; quantity: number; unit: string; unitPrice: number }[];
  notes: string;
}

const MaterialOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);

  const mockOrders: MaterialOrder[] = [
    {
      id: '1',
      poNumber: 'PO-2025-001',
      supplier: 'ABC Supply',
      leadId: 'lead-1',
      leadName: 'Smith Residence',
      status: 'Ordered',
      dateOrdered: '2025-01-15',
      deliveryDate: '2025-01-22',
      totalCost: 8450,
      items: [
        { name: 'Owens Corning Duration Shingles', quantity: 35, unit: 'sq', unitPrice: 95 },
        { name: 'Synthetic Underlayment', quantity: 10, unit: 'roll', unitPrice: 125 },
        { name: 'Ridge Cap Shingles', quantity: 5, unit: 'bundle', unitPrice: 45 }
      ],
      notes: 'Deliver to job site, contact foreman on arrival'
    },
    {
      id: '2',
      poNumber: 'PO-2025-002',
      supplier: 'Home Depot Pro',
      leadId: 'lead-2',
      leadName: 'Johnson Commercial',
      status: 'In Transit',
      dateOrdered: '2025-01-10',
      deliveryDate: '2025-01-18',
      totalCost: 12300,
      items: [
        { name: 'GAF Timberline HDZ Shingles', quantity: 50, unit: 'sq', unitPrice: 98 },
        { name: 'Ice & Water Shield', quantity: 8, unit: 'roll', unitPrice: 85 }
      ],
      notes: 'Priority delivery'
    },
    {
      id: '3',
      poNumber: 'PO-2025-003',
      supplier: 'Beacon Building Products',
      leadId: 'lead-3',
      leadName: 'Martinez Property',
      status: 'Delivered',
      dateOrdered: '2025-01-05',
      deliveryDate: '2025-01-12',
      totalCost: 5600,
      items: [
        { name: 'CertainTeed Landmark Shingles', quantity: 25, unit: 'sq', unitPrice: 92 }
      ],
      notes: 'Completed successfully'
    }
  ];

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Ordered': 'bg-blue-100 text-blue-700',
    'In Transit': 'bg-purple-100 text-purple-700',
    'Delivered': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="text-blue-600" />
            Material Orders
          </h1>
          <p className="text-slate-500 mt-1">Manage purchase orders and material deliveries</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          New PO
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by PO number, job, or supplier..."
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
          <option>All</option>
          <option>Pending</option>
          <option>Ordered</option>
          <option>In Transit</option>
          <option>Delivered</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">PO Number</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Job</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Delivery Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Cost</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900">{order.poNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700">{order.leadName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700">{order.supplier}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={16} className="text-slate-400" />
                      {new Date(order.deliveryDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-900">${order.totalCost.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                <h2 className="text-2xl font-bold text-slate-900">{selectedOrder.poNumber}</h2>
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
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</label>
                  <p className="text-slate-900 font-medium mt-1">{selectedOrder.supplier}</p>
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
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Date</label>
                  <p className="text-slate-900 font-medium mt-1">
                    {new Date(selectedOrder.deliveryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.quantity} {item.unit} × ${item.unitPrice}</p>
                      </div>
                      <p className="font-semibold text-slate-900">${(item.quantity * item.unitPrice).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">Total Cost</span>
                  <span className="text-2xl font-bold text-blue-600">${selectedOrder.totalCost.toLocaleString()}</span>
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

export default MaterialOrders;
