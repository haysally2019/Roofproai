import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  sort_order: number;
}

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
  currentCredits: number;
}

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete,
  currentCredits
}) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('measurement_credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading packages:', err);
      setError('Failed to load credit packages');
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('No company found');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-measurement-credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          companyId: userData.company_id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      const result = await response.json();

      if (result.url) {
        window.location.href = result.url;
      } else {
        onPurchaseComplete();
        onClose();
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to process purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Purchase Measurement Credits</h2>
            <p className="text-blue-100 mt-1">Current Balance: <span className="font-bold">{currentCredits} credits</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                  selectedPackage?.id === pkg.id
                    ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {pkg.credits >= 50 && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={12} />
                    BEST VALUE
                  </div>
                )}

                <div className="mb-3">
                  <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">${(pkg.price_cents / 100).toFixed(2)}</span>
                    <span className="text-slate-500">/ {pkg.credits} credits</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    ${((pkg.price_cents / 100) / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 text-sm">
                  <Check size={16} className="text-emerald-600" />
                  <span>DIY roof measurements</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 text-sm mt-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>High-resolution satellite imagery</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 text-sm mt-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>Accurate square footage calculations</span>
                </div>

                {selectedPackage?.id === pkg.id && (
                  <div className="absolute top-3 left-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-slate-900 mb-3">How Credits Work</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Each credit allows you to create one detailed roof measurement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Mark pivot points to outline roof sections and get accurate measurements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Credits never expire and can be used anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>All measurements are saved to your account for future reference</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!selectedPackage || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              {loading ? 'Processing...' : selectedPackage ? `Purchase ${selectedPackage.credits} Credits` : 'Select a Package'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchaseModal;
