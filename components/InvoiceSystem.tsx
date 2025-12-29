import React, { useState } from 'react';
import { Invoice, Lead, User, Payment } from '../types';
import {
  CreditCard, Plus, Download, Send, CheckCircle, FileText, DollarSign,
  Calendar, Clock, RefreshCw, Link as LinkIcon, Eye, X, TrendingUp,
  ArrowUpRight, AlertCircle, Copy
} from 'lucide-react';
import { useStore } from '../lib/store';

interface InvoiceSystemProps {
  invoices: Invoice[];
  leads: Lead[];
  currentUser: User;
  onCreateInvoice: (invoice: Invoice) => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => void;
}

const InvoiceSystem: React.FC<InvoiceSystemProps> = ({
  invoices,
  leads,
  currentUser,
  onCreateInvoice,
  onUpdateStatus
}) => {
  const { companies, addToast } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [lineItems, setLineItems] = useState<{desc: string, cost: number}[]>([
    {desc: 'Roof Replacement Deposit', cost: 5000}
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'ACH' | 'Check' | 'Cash'>('Card');

  const currentCompany = companies.find(c => c.id === currentUser.companyId);
  const isQBConnected = currentCompany?.integrations?.quickbooks?.isConnected;

  const handleCreateSubmit = () => {
    if (!selectedLeadId) return;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    const subtotal = lineItems.reduce((acc, item) => acc + item.cost, 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

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
      total,
      amountPaid: 0,
      payments: [],
      paymentLink: `https://pay.rafterai.com/i/${Date.now()}`
    };

    onCreateInvoice(newInvoice);
    addToast('Invoice created successfully', 'success');
    setIsCreating(false);
    setSelectedLeadId('');
    setLineItems([{desc: 'Roof Replacement Deposit', cost: 5000}]);
  };

  const handleCollectPayment = () => {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const processingFee = amount * 0.029 + 0.30;
    const platformFee = amount * 0.02;
    const netAmount = amount - processingFee - platformFee;

    const newPayment: Payment = {
      id: Date.now().toString(),
      invoiceId: selectedInvoice.id,
      amount,
      method: paymentMethod,
      status: 'Completed',
      date: new Date().toISOString(),
      stripePaymentId: `ch_${Math.random().toString(36).substr(2, 9)}`,
      processingFee,
      platformFee,
      netAmount
    };

    const updatedInvoice = {
      ...selectedInvoice,
      amountPaid: (selectedInvoice.amountPaid || 0) + amount,
      payments: [...(selectedInvoice.payments || []), newPayment]
    };

    if (updatedInvoice.amountPaid >= updatedInvoice.total) {
      onUpdateStatus(selectedInvoice.id, 'Paid');
    } else {
      onUpdateStatus(selectedInvoice.id, 'Partially Paid');
    }

    addToast(`Payment of $${amount.toLocaleString()} collected successfully`, 'success');
    setShowPaymentModal(false);
    setPaymentAmount('');
    setSelectedInvoice(null);
  };

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    addToast('Payment link copied to clipboard', 'success');
  };

  const syncInvoiceToQB = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isQBConnected) {
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
      case 'Partially Paid': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalCollected = invoices
    .reduce((acc, i) => acc + (i.amountPaid || 0), 0);

  const totalOutstanding = invoices
    .filter(i => i.status !== 'Paid')
    .reduce((acc, i) => acc + (i.total - (i.amountPaid || 0)), 0);

  const platformFeesEarned = invoices
    .reduce((acc, invoice) => {
      const payments = invoice.payments || [];
      return acc + payments.reduce((sum, p) => sum + p.platformFee, 0);
    }, 0);

  const processingVolume = invoices
    .reduce((acc, i) => acc + (i.amountPaid || 0), 0);

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="text-blue-600" />
            Invoices & Payments
          </h1>
          <p className="text-slate-500 mt-1">Create invoices and collect payments seamlessly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Collected (YTD)</p>
            <h3 className="text-2xl font-bold text-emerald-600">${totalCollected.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <DollarSign size={24}/>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Outstanding</p>
            <h3 className="text-2xl font-bold text-blue-600">${totalOutstanding.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={24}/>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Processing Volume</p>
            <h3 className="text-2xl font-bold text-slate-900">${processingVolume.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
            <TrendingUp size={24}/>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 md:p-6 rounded-xl shadow-lg flex items-center justify-between relative overflow-hidden">
          <div>
            <p className="text-blue-100 text-sm font-medium">Platform Fees</p>
            <h3 className="text-2xl font-bold text-white">${platformFeesEarned.toFixed(2)}</h3>
            <p className="text-blue-200 text-xs mt-1">2% per transaction</p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg text-white">
            <ArrowUpRight size={24}/>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Revenue Share Model (Platform Fees)</p>
          <p>Rafter AI earns 2% of each transaction processed. Your customers pay standard Stripe fees (2.9% + $0.30), and we take 2% as a platform fee. You receive 98% of the payment minus processing fees. This allows us to provide this powerful software at no monthly cost.</p>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} /> <span className="hidden md:inline">Create Invoice</span><span className="md:hidden">New</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date Issued</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Paid</th>
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
                  <td className="px-6 py-4 font-semibold text-emerald-600">${(invoice.amountPaid || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {invoice.status !== 'Draft' && invoice.paymentLink && (
                      <button
                        onClick={() => copyPaymentLink(invoice.paymentLink!)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Copy Payment Link"
                      >
                        <Copy size={16}/>
                      </button>
                    )}
                    {(invoice.status === 'Sent' || invoice.status === 'Partially Paid' || invoice.status === 'Overdue') && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowPaymentModal(true);
                          setPaymentAmount(((invoice.total - (invoice.amountPaid || 0))).toString());
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50"
                        title="Collect Payment"
                      >
                        <DollarSign size={16}/>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                      title="View Details"
                    >
                      <Eye size={16}/>
                    </button>
                    {invoice.status === 'Draft' && (
                      <button
                        onClick={() => onUpdateStatus(invoice.id, 'Sent')}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Send to Client"
                      >
                        <Send size={16}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 italic">No invoices created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText size={20}/> New Invoice
            </h3>
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
                <button
                  onClick={() => setLineItems([...lineItems, {desc: '', cost: 0}])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-bold text-lg">Total: ${(lineItems.reduce((a,b) => a + b.cost, 0) * 1.08).toFixed(2)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSubmit}
                    disabled={!selectedLeadId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Generate Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <DollarSign size={20}/> Collect Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 mb-1">Invoice: {selectedInvoice.number}</p>
              <p className="text-sm text-slate-600 mb-1">Client: {selectedInvoice.leadName}</p>
              <p className="text-sm text-slate-600">Remaining Balance: <span className="font-bold text-slate-900">${(selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toLocaleString()}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Card">Credit/Debit Card</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {paymentAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-900 mb-1">Fee Breakdown:</p>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span className="font-semibold">${parseFloat(paymentAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee (2.9% + $0.30):</span>
                      <span>-${(parseFloat(paymentAmount) * 0.029 + 0.30).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee (2%):</span>
                      <span>-${(parseFloat(paymentAmount) * 0.02).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-300 font-bold">
                      <span>You Receive:</span>
                      <span className="text-emerald-600">
                        ${(parseFloat(paymentAmount) - (parseFloat(paymentAmount) * 0.029 + 0.30) - (parseFloat(paymentAmount) * 0.02)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectPayment}
                  disabled={!paymentAmount}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Collect Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && !showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{selectedInvoice.number}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Client</label>
                  <p className="text-slate-900 font-medium mt-1">{selectedInvoice.leadName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-sm text-slate-500">{item.quantity} × ${item.unitPrice}</p>
                      </div>
                      <p className="font-semibold text-slate-900">${item.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>${selectedInvoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>${selectedInvoice.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Amount Paid:</span>
                  <span>${(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                {(selectedInvoice.amountPaid || 0) < selectedInvoice.total && (
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>Remaining Balance:</span>
                    <span>${(selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h4>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div key={payment.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-emerald-900">${payment.amount.toLocaleString()}</p>
                            <p className="text-sm text-emerald-700">{payment.method} • {new Date(payment.date).toLocaleDateString()}</p>
                            <p className="text-xs text-emerald-600 mt-1">
                              Net: ${payment.netAmount.toFixed(2)} (Platform Fee: ${payment.platformFee.toFixed(2)})
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceSystem;
