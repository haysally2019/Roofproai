import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, CheckCircle, Clock, Search, Filter, Download, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface DBInvoice {
  id: string;
  company_id: string;
  lead_id: string;
  number: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Overdue';
  date_issued: string;
  date_due: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  leads: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface DBContract {
  id: string;
  number: string;
  total_amount: number;
  deposit_amount: number;
  payment_schedule: Array<{
    milestone: string;
    amount: number;
    status: string;
  }>;
  leads: {
    name: string;
  };
}

const PaymentsNew: React.FC = () => {
  const { currentUser, addToast } = useStore();
  const [invoices, setInvoices] = useState<DBInvoice[]>([]);
  const [contracts, setContracts] = useState<DBContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'invoices' | 'contracts'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<DBInvoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; email: string; phone: string; address: string }>>([]);
  const [newInvoice, setNewInvoice] = useState({
    leadId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax: 0
  });

  useEffect(() => {
    loadData();
    if (activeTab === 'invoices') {
      loadLeads();
    }
  }, [currentUser?.companyId, activeTab]);

  const loadLeads = async () => {
    if (!currentUser?.companyId) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, address')
        .eq('company_id', currentUser.companyId)
        .order('name');

      if (error) throw error;
      if (data) setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      if (activeTab === 'invoices') {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            leads (
              name,
              email,
              phone,
              address
            )
          `)
          .eq('company_id', currentUser.companyId)
          .order('date_issued', { ascending: false });

        if (error) throw error;
        if (data) setInvoices(data as unknown as DBInvoice[]);
      } else {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            number,
            total_amount,
            deposit_amount,
            payment_schedule,
            leads (
              name
            )
          `)
          .eq('company_id', currentUser.companyId)
          .in('status', ['Signed', 'Active'])
          .order('created_date', { ascending: false });

        if (error) throw error;
        if (data) setContracts(data as unknown as DBContract[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.leadId) {
      addToast('Please select a client', 'error');
      return;
    }

    const validItems = newInvoice.items.filter(item => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0) {
      addToast('Please add at least one invoice item', 'error');
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const subtotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const total = subtotal + newInvoice.tax;

      const itemsWithIds = validItems.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      }));

      const { error } = await supabase
        .from('invoices')
        .insert({
          company_id: currentUser!.companyId,
          lead_id: newInvoice.leadId,
          number: invoiceNumber,
          status: 'Draft',
          date_issued: new Date().toISOString(),
          date_due: newInvoice.dateDue,
          items: itemsWithIds,
          subtotal,
          tax: newInvoice.tax,
          total
        });

      if (error) throw error;

      addToast('Invoice created successfully', 'success');
      setShowCreateModal(false);
      setNewInvoice({
        leadId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tax: 0
      });
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      addToast('Failed to create invoice', 'error');
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      addToast('Please enter a payment amount', 'warning');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Please enter a valid amount', 'warning');
      return;
    }

    if (amount > selectedInvoice.total) {
      addToast('Payment amount cannot exceed invoice total', 'warning');
      return;
    }

    try {
      setProcessingPayment(true);

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      const { error: stripeError } = await stripe.redirectToCheckout({
        lineItems: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice ${selectedInvoice.number}`,
                description: `Payment for ${selectedInvoice.leads.name}`
              },
              unit_amount: Math.round(amount * 100)
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payments`
      });

      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Error processing payment:', error);
      addToast('Failed to process payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Partial': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Sent': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.leads.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === 'Paid').length,
    pendingInvoices: invoices.filter(i => i.status === 'Sent').length,
    overdueInvoices: invoices.filter(i => i.status === 'Overdue').length,
    totalRevenue: invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.total, 0),
    pendingRevenue: invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.total, 0)
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="text-blue-600" />
            Payments & Invoices
          </h1>
          <p className="text-slate-500 mt-1">Manage payments and track revenue</p>
        </div>
        {activeTab === 'invoices' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Invoice
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'invoices'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'contracts'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Contract Payments
        </button>
      </div>

      {activeTab === 'invoices' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalInvoices}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.paidInvoices}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueInvoices}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Pending Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${(stats.pendingRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Paid</option>
              <option>Partial</option>
              <option>Overdue</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
                <p>No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Invoice #</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Client</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Amount</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Due Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-blue-600">{invoice.number}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{invoice.leads.name}</p>
                          <p className="text-sm text-slate-500">{invoice.leads.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">${invoice.total.toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{new Date(invoice.date_due).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {invoice.status !== 'Paid' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentAmount(invoice.total.toString());
                                  setShowPaymentModal(true);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                              >
                                <DollarSign size={16} />
                                Collect
                              </button>
                            )}
                            {invoice.status === 'Paid' && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-2 text-sm">
                                <CheckCircle size={16} />
                                Paid
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'contracts' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                Loading contract payments...
              </div>
            ) : contracts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
                <p>No active contracts with payment schedules</p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                {contracts.map((contract) => (
                  <div key={contract.id} className="border border-slate-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Contract {contract.number}</h3>
                        <p className="text-sm text-slate-600">{contract.leads.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">${contract.total_amount.toLocaleString()}</p>
                        <p className="text-sm text-slate-600">Total Contract Value</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700">Payment Schedule</h4>
                      {contract.payment_schedule.map((payment, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between items-center p-4 rounded-lg ${
                            payment.status === 'Paid' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {payment.status === 'Paid' ? (
                              <CheckCircle size={20} className="text-emerald-600" />
                            ) : (
                              <Clock size={20} className="text-slate-400" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{payment.milestone}</p>
                              <p className="text-sm text-slate-600">{payment.status}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-slate-900">${payment.amount.toLocaleString()}</p>
                            {payment.status !== 'Paid' && (
                              <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                              >
                                <DollarSign size={16} />
                                Collect
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Collect Payment</h2>
              <p className="text-sm text-slate-600 mt-1">Invoice {selectedInvoice.number} - {selectedInvoice.leads.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-slate-600 mt-1">Invoice total: ${selectedInvoice.total.toLocaleString()}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Payment will be processed through Stripe. The client will be redirected to a secure payment page.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                  setPaymentAmount('');
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleCollectPayment}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Create New Invoice</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Client *</label>
                <select
                  value={newInvoice.leadId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a client</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} - {lead.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Due Date *</label>
                <input
                  type="date"
                  value={newInvoice.dateDue}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dateDue: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
                {newInvoice.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                    <input
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...newInvoice.items];
                        updated[idx].description = e.target.value;
                        setNewInvoice({ ...newInvoice, items: updated });
                      }}
                      className="col-span-5 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const updated = [...newInvoice.items];
                        updated[idx].quantity = parseInt(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items: updated });
                      }}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Qty"
                      min="1"
                    />
                    <div className="col-span-4 relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => {
                          const updated = [...newInvoice.items];
                          updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setNewInvoice({ ...newInvoice, items: updated });
                        }}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = newInvoice.items.filter((_, i) => i !== idx);
                        setNewInvoice({ ...newInvoice, items: updated.length > 0 ? updated : [{ description: '', quantity: 1, unitPrice: 0 }] });
                      }}
                      className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0 }] })}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus size={16} /> Add Line Item
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      ${newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-slate-700">Tax:</label>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={newInvoice.tax || ''}
                        onChange={(e) => setNewInvoice({ ...newInvoice, tax: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span>
                      ${(newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) + newInvoice.tax).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsNew;
