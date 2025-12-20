import React, { useState, useRef, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { stripeProducts } from '../stripe-config'; // <--- Uses your existing config

// 1. CONFIGURATION
const STRIPE_PUBLIC_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'; 
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.origin + '/dashboard' },
            redirect: 'if_required' 
        });

        if (error) {
            setMessage(error.message || "Payment failed.");
            setIsProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
            <PaymentElement />
            {message && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} /> {message}
                </div>
            )}
            <button disabled={isProcessing || !stripe || !elements} className="w-full bg-indigo-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck size={12}/> Secure Payment via Stripe
            </p>
        </form>
    );
};

export default function TrialFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  
  // Dynamic Plan State
  const [selectedPlan, setSelectedPlan] = useState(stripeProducts[2]); // Default to Starter

  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // 2. DETECT PLAN FROM URL
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const planName = params.get('plan'); // e.g. ?plan=professional
      
      if (planName) {
          const found = stripeProducts.find(p => p.name.toLowerCase() === planName.toLowerCase());
          if (found) setSelectedPlan(found);
      }
  }, []);

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // A. Register User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;
        
        // B. Create Company
        if (authData.user) {
             await supabase.from('users').insert({
                id: authData.user.id,
                name: formData.name,
                email: formData.email,
                role: 'Company Owner'
            });
            
            // Save the selected tier to the company record
            await supabase.from('companies').insert({
                name: formData.companyName,
                status: 'Pending', 
                tier: selectedPlan.name // <--- Saves 'Starter', 'Professional', etc.
            });
        }

        // C. Initialize Stripe Subscription with Selected Price
        const response = await supabase.functions.invoke('create-embedded-subscription', {
            body: { 
                priceId: selectedPlan.priceId, // <--- Sends dynamic ID
                email: formData.email 
            }
        });

        if (response.error) {
            const errBody = await response.error.context.json().catch(() => ({}));
            throw new Error(errBody.error || "Payment service unavailable");
        }

        if (!response.data?.clientSecret) {
            throw new Error("Failed to initialize payment");
        }

        setClientSecret(response.data.clientSecret);
        setLoading(false);
        setStep(2);

    } catch (error: any) {
        console.error("Setup Error:", error);
        alert(`Setup Failed: ${error.message}`);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          
          {/* Header */}
          <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
                  <Sparkles size={20} fill="currentColor" />
                  <span className="text-sm font-bold uppercase tracking-widest">
                      {selectedPlan.name} Plan
                  </span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">
                  {step === 1 ? 'Create Workspace' : 'Activate Trial'}
              </h2>
              <p className="text-slate-500 mt-2">
                  {step === 1 ? 'Get started with your 7-day free trial.' : `Total due today: $0.00`}
              </p>
          </div>

          {step === 1 && (
              <form onSubmit={handleAccountCreation} className="space-y-5 animate-fade-in">
                  <div className="space-y-4">
                      <div className="relative group">
                          <Building2 className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                          <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Company Name" />
                      </div>
                      <div className="relative group">
                          <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Full Name" />
                      </div>
                      <div className="relative group">
                          <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Email Address" />
                      </div>
                      <div className="relative group">
                          <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                          <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Password" />
                      </div>
                  </div>
                  <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 disabled:opacity-70 transition-all shadow-lg hover:shadow-xl">
                      {loading ? <Loader2 className="animate-spin" /> : <>Next Step <ArrowRight /></>}
                  </button>
              </form>
          )}

          {step === 2 && clientSecret && (
              <div className="animate-fade-in">
                  <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                      <div className="flex justify-between items-center text-sm mb-1">
                          <span className="text-slate-600">Selected Plan</span>
                          <span className="font-bold text-slate-900">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">After 7 days</span>
                          <span className="font-bold text-slate-900">${selectedPlan.price_per_unit}/mo</span>
                      </div>
                  </div>
                  
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5' } } }}>
                      <CheckoutForm onSuccess={() => navigate('/dashboard')} />
                  </Elements>
              </div>
          )}
      </div>
    </div>
  );
}