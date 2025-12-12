
import React, { useState } from 'react';
import { EstimateItem, Lead, Supplier } from '../types';
import { useStore } from '../lib/store';
import { Truck, CheckCircle, Package, Calendar, Loader2, X } from 'lucide-react';

interface MaterialOrderModalProps {
  items: EstimateItem[];
  lead: Lead;
  onClose: () => void;
}

const MaterialOrderModal: React.FC<MaterialOrderModalProps> = ({ items, lead, onClose }) => {
  const { suppliers, addOrder } = useStore();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [instructions, setInstructions] = useState('Roof Load if possible. Call 30 mins before arrival.');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendOrder = () => {
    if (!selectedSupplierId || !deliveryDate) return;
    
    setIsSending(true);
    
    // Simulate API delay
    setTimeout(() => {
        addOrder({
            id: Date.now().toString(),
            poNumber: `PO-${Math.floor(Math.random() * 10000)}`,
            supplierId: selectedSupplierId,
            leadId: lead.id,
            status: 'Ordered',
            dateOrdered: new Date().toISOString(),
            deliveryDate: deliveryDate,
            items: items,
            instructions: instructions
        });
        setIsSending(false);
        setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
      return (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                      <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Order Sent Successfully!</h3>
                  <p className="text-slate-500 mb-6">The supplier has received your purchase order. You will receive a confirmation email shortly.</p>
                  <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors">
                      Close
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-indigo-600" /> Order Materials
                    </h2>
                    <p className="text-sm text-slate-500">Send purchase order directly to supplier.</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X size={24}/>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Supplier Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Select Supplier</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {suppliers.map(sup => (
                            <div 
                                key={sup.id}
                                onClick={() => setSelectedSupplierId(sup.id)}
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-24 hover:bg-slate-50 ${selectedSupplierId === sup.id ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-200'}`}
                            >
                                <div 
                                    className="font-black text-lg" 
                                    style={{ color: sup.color }}
                                >
                                    {sup.logo}
                                </div>
                                <div className="text-xs text-slate-400">{sup.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delivery Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Job Site (Delivery)</label>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                            {lead.address}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Requested Date</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Delivery Instructions</label>
                    <textarea 
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                    />
                </div>

                {/* Material Summary */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                        <span>Material List</span>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{items.length} Items</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {items.map((item, i) => (
                            <div key={i} className="px-4 py-3 flex justify-between text-sm">
                                <span className="font-medium text-slate-700">{item.description}</span>
                                <span className="text-slate-500 whitespace-nowrap">{item.quantity} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    Cancel
                </button>
                <button 
                    onClick={handleSendOrder}
                    disabled={!selectedSupplierId || !deliveryDate || isSending}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isSending ? <Loader2 className="animate-spin" size={18}/> : <Package size={18}/>}
                    {isSending ? 'Sending Order...' : 'Submit Purchase Order'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default MaterialOrderModal;
