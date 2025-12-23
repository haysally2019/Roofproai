import React, { useState, useEffect } from 'react';
import { Company, User, UserRole, SoftwareLead } from '../types';
import { LayoutDashboard, Users, UserPlus, LogOut, Settings, DollarSign, Copy, CheckCircle, CreditCard, TrendingUp } from 'lucide-react';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

// Define Sales-Specific Tabs
enum SalesTab {
  OVERVIEW = 'overview',
  LEADS = 'leads',
  ACCOUNTS = 'accounts',
  PAYOUTS = 'payouts'
}

interface Commission {
  id: string;
  company_id: string;
  amount: number;
  amount_cents: number;
  currency: string;
  commission_rate: number;
  status: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

interface PayoutInfo {
  id?: string;
  account_holder_name: string;
  account_type: string;
  routing_number: string;
  account_number_last4: string;
  bank_name: string;
  payout_method: string;
  payout_email: string;
  verified: boolean;
}

interface Props {
  companies: Company[];
  users: User[];
  currentUser: User;
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SaaSRepDashboard: React.FC<Props> = ({
  companies,
  users,
  currentUser,
  onAddCompany,
  softwareLeads,
  onAddSoftwareLead,
  onUpdateSoftwareLead
}) => {
  const { logout } = useStore();
  const [activeTab, setActiveTab] = useState<SalesTab>(SalesTab.OVERVIEW);
  const [referralCode, setReferralCode] = useState<string>('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  useEffect(() => {
    loadDashboardData();
  }, [currentUser.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user's referral code
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (userData?.referral_code) {
        setReferralCode(userData.referral_code);
      }

      // Load commissions
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('*')
        .eq('rep_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (commissionsData) {
        setCommissions(commissionsData);
      }

      // Load payout info
      const { data: payoutData } = await supabase
        .from('payout_info')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (payoutData) {
        setPayoutInfo(payoutData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const savePayoutInfo = async (info: PayoutInfo) => {
    try {
      const dataToSave = {
        user_id: currentUser.id,
        ...info
      };

      if (payoutInfo?.id) {
        const { error } = await supabase
          .from('payout_info')
          .update(dataToSave)
          .eq('id', payoutInfo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payout_info')
          .insert([dataToSave]);

        if (error) throw error;
      }

      await loadDashboardData();
      alert('Payout information saved successfully!');
    } catch (error) {
      console.error('Error saving payout info:', error);
      alert('Failed to save payout information. Please try again.');
    }
  };

  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingEarnings = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const paidEarnings = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* --- SALES SIDEBAR --- */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-1">
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-extrabold text-lg tracking-tight">SALES PORTAL</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-bold ml-9">Rafter AI</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase mt-4 mb-2">My Workspace</p>

          <button
            onClick={() => setActiveTab(SalesTab.OVERVIEW)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.OVERVIEW ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <TrendingUp size={20} />
            <span className="font-bold">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab(SalesTab.LEADS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.LEADS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <UserPlus size={20} />
            <span className="font-bold">Software Leads</span>
          </button>

          <button
            onClick={() => setActiveTab(SalesTab.ACCOUNTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.ACCOUNTS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-bold">Active Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab(SalesTab.PAYOUTS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === SalesTab.PAYOUTS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <CreditCard size={20} />
            <span className="font-bold">Payouts</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center font-bold border border-emerald-700">
                    {currentUser.avatarInitials}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 truncate">Sales Representative</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-sm font-bold">
                <LogOut size={16} /> Sign Out
            </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-auto bg-[#F8FAFC] relative">
        <div className="max-w-7xl mx-auto p-8">
            {activeTab === SalesTab.OVERVIEW && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-slate-900">Sales Overview</h1>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Total Earnings</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${totalEarnings.toFixed(2)}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Pending</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${pendingEarnings.toFixed(2)}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Paid Out</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${paidEarnings.toFixed(2)}</p>
                  </div>
                </div>

                {/* Referral Link Section */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-8 text-white">
                  <h2 className="text-2xl font-bold mb-2">Your Referral Link</h2>
                  <p className="text-emerald-100 mb-6">Share this link to earn commissions on new signups</p>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
                    <code className="flex-1 text-white font-mono text-sm break-all">{referralUrl}</code>
                    <button
                      onClick={copyReferralLink}
                      className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2 shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <CheckCircle size={18} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-emerald-100 text-sm mt-4">
                    Your referral code: <span className="font-bold text-white">{referralCode}</span>
                  </p>
                </div>

                {/* Recent Commissions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Recent Commissions</h2>
                  </div>
                  <div className="overflow-x-auto">
                    {commissions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        No commissions yet. Start referring customers to earn!
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-700">Amount</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-700">Rate</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-700">Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commissions.slice(0, 10).map((commission) => (
                            <tr key={commission.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-4 text-sm text-slate-900">
                                {new Date(commission.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-sm font-semibold text-slate-900">
                                ${commission.amount.toFixed(2)}
                              </td>
                              <td className="p-4 text-sm text-slate-600">
                                {commission.commission_rate}%
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                  commission.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  commission.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                  commission.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {commission.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-slate-600">
                                {commission.period_start ? new Date(commission.period_start).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === SalesTab.LEADS && (
                <SuperAdminLeads
                    leads={softwareLeads}
                    users={users}
                    currentUser={currentUser}
                    onAddLead={onAddSoftwareLead}
                    onUpdateLead={onUpdateSoftwareLead}
                />
            )}

            {activeTab === SalesTab.ACCOUNTS && (
                <SuperAdminTenants
                    companies={companies}
                    users={users}
                    onAddCompany={onAddCompany}
                    onClearInitialData={() => {}}
                />
            )}

            {activeTab === SalesTab.PAYOUTS && (
              <PayoutInfoForm
                payoutInfo={payoutInfo}
                onSave={savePayoutInfo}
              />
            )}
        </div>
      </main>
    </div>
  );
};

const PayoutInfoForm: React.FC<{ payoutInfo: PayoutInfo | null; onSave: (info: PayoutInfo) => void }> = ({ payoutInfo, onSave }) => {
  const [formData, setFormData] = useState<PayoutInfo>(
    payoutInfo || {
      account_holder_name: '',
      account_type: 'individual',
      routing_number: '',
      account_number_last4: '',
      bank_name: '',
      payout_method: 'stripe',
      payout_email: '',
      verified: false
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Payout Information</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                value={formData.account_holder_name}
                onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Account Type
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payout Method
              </label>
              <select
                value={formData.payout_method}
                onChange={(e) => setFormData({ ...formData, payout_method: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="wire">Wire Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payout Email
              </label>
              <input
                type="email"
                value={formData.payout_email}
                onChange={(e) => setFormData({ ...formData, payout_email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Routing Number
              </label>
              <input
                type="text"
                value={formData.routing_number}
                onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Account Number (Last 4 Digits)
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.account_number_last4}
                onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="1234"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
            >
              Save Payout Information
            </button>
          </div>
        </form>

        {payoutInfo && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              {payoutInfo.verified ? (
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Your payout information has been verified
                </span>
              ) : (
                'Your payout information is pending verification'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaaSRepDashboard;