import React, { useState } from 'react';
import { Invoice, Lead, User } from '../types';
import { Receipt, Plus, Download, Send, CheckCircle, FileText, DollarSign, Calendar, Clock, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';

interface InvoiceSystemProps {
  invoices: Invoice[];
  leads: Lead[];
  currentUser: User;
  onCreateInvoice: (invoice: Invoice) => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => void;
}

const InvoiceSystem: React.FC<InvoiceSystemProps> = ({ invoices, leads, currentUser, onCreateInvoice, onUpdateStatus }) => {
  const { companies, addToast } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [lineItems, setLineItems] = useState<{desc: string, cost: number}[]>([{desc: 'Roof Replacement Deposit', cost: 5000}]);
  
  // Check QB Status (PATCHED: Added safe navigation)
  const currentCompany = companies.find(c => c.id === currentUser.companyId);
  const isQBConnected = currentCompany?.integrations?.quickbooks?.isConnected;

  const handleCreateSubmit = () => {
    if (!selectedLeadId) return;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    const subtotal = lineItems.reduce((acc, item) => acc + item.cost, 0);
    const tax = subtotal * 0.08;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      leadId: lead.id,
      leadName: lead.name,
      number: `INV-${Math.floor(Math.random() * 10000)}`,
      status: 'Draft',
      dateIssued: new Date().toISOString().split('T')[0],
      dateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: lineItems.map((l, i) => ({
        id: i.toString(),
        description: l.desc,
        quantity: 1,
        unitPrice: l.cost,
        total: l.cost
      })),
      subtotal,
      tax,
      total: subtotal + tax
    };

    onCreateInvoice(newInvoice);
    setIsCreating(false);
    setSelectedLeadId('');
    setLineItems([{desc: 'Roof Replacement Deposit', cost: 5000}]);
  };

  const syncInvoiceToQB = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(!isQBConnected) {
          addToast("Please connect QuickBooks in Settings first.", "error");
          return;
      }
      addToast("Syncing Invoice to QuickBooks...", "info");
      setTimeout(() => {
          addToast("Success: Invoice exported to QuickBooks Online", "success");
      }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'Sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const totalOutstanding = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium">Collected (YTD)</p>
                <h3 className="text-2xl font-bold text-emerald-600">${totalCollected.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={24}/></div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium">Outstanding</p>
                <h3 className="text-2xl font-bold text-blue-600">${totalOutstanding.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><FileText size={24}/></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">Invoices</h2>
                {isQBConnected && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                        <CheckCircle size={10}/> QB Active
                    </span>
                )}
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
                <Plus size={16} /> <span className="hidden md:inline">Create Invoice</span><span className="md:hidden">New</span>
            </button>
        </div>
        
        {/* Mobile List View */}
        <div className="md:hidden p-4 space-y-4">
            {invoices.map(invoice => (
                <div key={invoice.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                         <div>
                            <span className="font-mono text-xs text-slate-500">{invoice.number}</span>
                            <h4 className="font-bold text-slate-800">{invoice.leadName}</h4>
                         </div>
                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                         </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-3">
                         <span className="flex items-center gap-1"><Calendar size={12}/> {invoice.dateIssued}</span>
                         <span className="flex items-center gap-1"><Clock size={12}/> Due {invoice.dateDue}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                        <span className="text-lg font-bold text-slate-800">${invoice.total.toLocaleString()}</span>
                        <div className="flex gap-2">
                             <button className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-full" title="Download"><Download size={16}/></button>
                             {invoice.status === 'Draft' && (
                                <button onClick={() => onUpdateStatus(invoice.id, 'Sent')} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full" title="Send"><Send size={16}/></button>
                             )}
                             {invoice.status === 'Sent' && (
                                <button onClick={() => onUpdateStatus(invoice.id, 'Paid')} className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 rounded-full" title="Mark Paid"><CheckCircle size={16}/></button>
                             )}
                        </div>
                    </div>
                </div>
            ))}
            {invoices.length === 0 && <div className="text-center text-slate-400 italic py-8">No invoices created yet.</div>}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                    <tr>
                        <th className="px-6 py-4">Invoice #</th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Date Issued</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-mono text-slate-600">{invoice.number}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{invoice.leadName}</td>
                            <td className="px-6 py-4 text-slate-500">{invoice.dateIssued}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">${invoice.total.toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                                    {invoice.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button 
                                    onClick={(e) => syncInvoiceToQB(e)}
                                    className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-green-50" 
                                    title="Push to QuickBooks"
                                >
                                    <RefreshCw size={16}/>
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded" title="Download PDF"><Download size={16}/></button>
                                {invoice.status === 'Draft' && (
                                    <button onClick={() => onUpdateStatus(invoice.id, 'Sent')} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Send to Client"><Send size={16}/></button>
                                )}
                                {invoice.status === 'Sent' && (
                                    <button onClick={() => onUpdateStatus(invoice.id, 'Paid')} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded" title="Mark Paid"><CheckCircle size={16}/></button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {invoices.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-400 italic">No invoices created yet.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Receipt size={20}/> New Invoice</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Client</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={selectedLeadId}
                            onChange={(e) => setSelectedLeadId(e.target.value)}
                        >
                            <option value="">-- Choose Lead --</option>
                            {leads.map(l => (
                                <option key={l.id} value={l.id}>{l.name} - {l.address}</option>
                            ))}
                        </select>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
                        {lineItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input 
                                    value={item.desc}
                                    onChange={(e) => {
                                        const newItems = [...lineItems];
                                        newItems[idx].desc = e.target.value;
                                        setLineItems(newItems);
                                    }}
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm" 
                                    placeholder="Description" 
                                />
                                <input 
                                    type="number"
                                    value={item.cost}
                                    onChange={(e) => {
                                        const newItems = [...lineItems];
                                        newItems[idx].cost = Number(e.target.value);
                                        setLineItems(newItems);
                                    }}
                                    className="w-24 p-2 border border-slate-300 rounded-lg text-sm" 
                                    placeholder="Price" 
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-bold text-lg">Total: ${(lineItems.reduce((a,b) => a + b.cost, 0) * 1.08).toFixed(2)}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleCreateSubmit} disabled={!selectedLeadId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Generate Invoice</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceSystem;