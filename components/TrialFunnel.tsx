import React, { useState, useRef, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { stripeProducts } from '../src/stripe-config';

// Load Stripe using Vite env var
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <PaymentElement />
            {message && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
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
  
  // Default to Starter (lowest price)
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts[0]); 

  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Detect plan from URL (optional)
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const planName = params.get('plan');
      if (planName) {
          const found = stripeProducts.find(p => p.name.toLowerCase() === planName.toLowerCase());
          if (found) setSelectedPlan(found);
      }
  }, []);

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // 1. Register User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;
        
        // 2. Create Company
        if (authData.user) {
             await supabase.from('users').insert({
                id: authData.user.id,
                name: formData.name,
                email: formData.email,
                role: 'Company Owner'
            });
            
            await supabase.from('companies').insert({
                name: formData.companyName,
                status: 'Pending', 
                tier: selectedPlan.name
            });
        }

        // 3. Initialize Subscription
        const response = await supabase.functions.invoke('create-embedded-subscription', {
            body: { 
                priceId: selectedPlan.priceId,
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all">
          
          {/* Header */}
          <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
                  <Sparkles size={20} fill="currentColor" />
                  <span className="text-sm font-bold uppercase tracking-widest">
                      {step === 1 ? 'Build Your Business' : 'Final Step'}
                  </span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {step === 1 ? 'Choose Your Plan' : 'Secure Checkout'}
              </h2>
          </div>

          {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                  
                  {/* PLAN SELECTION GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sortedProducts.map((plan) => (
                          <div 
                              key={plan.id}
                              onClick={() => setSelectedPlan(plan)}
                              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${
                                  selectedPlan.id === plan.id 
                                  ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600 shadow-md transform scale-[1.02]' 
                                  : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                              }`}
                          >
                              {selectedPlan.id === plan.id && (
                                  <div className="absolute -top-3 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                      <CheckCircle2 size={12} /> SELECTED
                                  </div>
                              )}
                              <h3 className="font-bold text-slate-800">{plan.name}</h3>
                              <div className="my-2">
                                  <span className="text-2xl font-bold text-slate-900">${plan.price_per_unit}</span>
                                  <span className="text-xs text-slate-500 font-medium">/mo</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-snug">{plan.description}</p>
                          </div>
                      ))}
                  </div>

                  {/* FORM */}
                  <form onSubmit={handleAccountCreation} className="space-y-4 max-w-md mx-auto">
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
                      <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 disabled:opacity-70 transition-all shadow-lg mt-6">
                          {loading ? <Loader2 className="animate-spin" /> : <>Create Account <ArrowRight /></>}
                      </button>
                  </form>
              </div>
          )}

          {step === 2 && clientSecret && (
              <div className="animate-fade-in max-w-md mx-auto">
                  <div className="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-200">
                      <div className="flex justify-between items-center text-sm mb-2 pb-2 border-b border-slate-200">
                          <span className="text-slate-600 font-medium">Selected Plan</span>
                          <span className="font-bold text-indigo-700">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">7-Day Free Trial</span>
                          <span className="font-bold text-slate-900">$0.00 <span className="text-[10px] font-normal text-slate-500">due today</span></span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                          <span className="text-slate-500 text-xs">Then monthly</span>
                          <span className="font-bold text-slate-900">${selectedPlan.price_per_unit}</span>
                      </div>
                  </div>
                  
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5', borderRadius: '12px' } } }}>
                      <CheckoutForm onSuccess={() => navigate('/dashboard')} />
                  </Elements>
              </div>
          )}
      </div>
    </div>
  );
}