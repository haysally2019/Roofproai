import React, { useState, useRef, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
// FIX: Updated import path to point to src folder
import { stripeProducts } from '../src/stripe-config'; 

// Load Stripe using Vite env var
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// --- CHECKOUT FORM ---
const CheckoutForm = ({ onSuccess, clientSecret }: { onSuccess: () => void, clientSecret: string }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (stripe && elements) {
            setIsReady(true);
        }
    }, [stripe, elements]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) {
            setMessage("Payment system not ready. Please wait or refresh the page.");
            return;
        }

        setIsProcessing(true);
        setMessage(null);

        try {
            let result;
            // Detect if this is a Trial (Setup) or Payment (Payment Intent)
            if (clientSecret.startsWith('seti_')) {
                result = await stripe.confirmSetup({
                    elements,
                    confirmParams: { return_url: window.location.origin + '/dashboard' },
                    redirect: 'if_required'
                });
            } else if (clientSecret.startsWith('pi_')) {
                result = await stripe.confirmPayment({
                    elements,
                    confirmParams: { return_url: window.location.origin + '/dashboard' },
                    redirect: 'if_required'
                });
            } else {
                throw new Error("Invalid payment setup");
            }

            if (result.error) {
                setMessage(result.error.message || "An unexpected error occurred.");
                setIsProcessing(false);
            } else {
                onSuccess();
            }
        } catch (err: any) {
            setMessage(err.message || "Payment processing failed");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {!isReady && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="ml-3 text-slate-600">Loading payment form...</span>
                </div>
            )}
            <div className={!isReady ? 'opacity-0 h-0 overflow-hidden' : ''}>
                <PaymentElement onReady={() => setIsReady(true)} />
            </div>
            {message && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={16} /> {message}
                </div>
            )}
            <button
                disabled={isProcessing || !isReady}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck size={12}/> Secure Payment via Stripe
            </p>
        </form>
    );
};

// --- MAIN FUNNEL ---
export default function TrialFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  
  // Sort plans by price
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts[0]); 

  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Step 1 -> 2
  const handleIdentitySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!formData.companyName || !formData.email || !formData.password || !formData.name) return;
      setStep(2);
  };

  // Step 2 -> 3 (Create Account & Initialize Stripe)
  const handlePlanSelection = async (plan: typeof sortedProducts[0]) => {
    setSelectedPlan(plan);
    setLoading(true);

    try {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration failed");

        // 2. Create Company First (CRITICAL STEP)
        const { data: companyData, error: companyError } = await supabase.from('companies').insert({
            name: formData.companyName,
            status: 'Trial', // Set to Trial so they can access limited features if needed
            tier: plan.name,
            setup_complete: false // Webhook will set this to true upon payment
        }).select().single();

        if (companyError) throw companyError;

        // 3. Create User Profile Linked to Company
        const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            role: 'Company Owner',
            company_id: companyData.id // LINKING HAPPENS HERE
        });

        if (userError) throw userError;

        // 4. Initialize Stripe
        const response = await supabase.functions.invoke('create-embedded-subscription', {
            body: { 
                priceId: plan.priceId,
                email: formData.email 
            }
        });

        if (response.error) throw new Error("Payment service unavailable");
        if (!response.data?.clientSecret) throw new Error("Failed to initialize payment");

        setClientSecret(response.data.clientSecret);
        setLoading(false);
        setStep(3);

    } catch (error: any) {
        console.error("Setup Error:", error);
        alert(`Setup Failed: ${error.message}`);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all duration-500 ${step === 2 ? 'max-w-4xl' : 'max-w-lg'}`}>
          <div className="mb-8 text-center relative">
              {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="absolute left-0 top-1 text-slate-400 hover:text-slate-600">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
                  <Sparkles size={20} fill="currentColor" />
                  <span className="text-sm font-bold uppercase tracking-widest">Step {step} of 3</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {step === 1 && "Create Your Account"}
                  {step === 2 && "Choose Your Plan"}
                  {step === 3 && "Secure Checkout"}
              </h2>
          </div>

          {step === 1 && (
              <form onSubmit={handleIdentitySubmit} className="space-y-5 animate-fade-in">
                  <div className="space-y-4">
                      <div className="relative group">
                          <Building2 className="absolute left-3 top-3.5 text-slate-400" size={20} />
                          <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl" placeholder="Company Name" />
                      </div>
                      <div className="relative group">
                          <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl" placeholder="Full Name" />
                      </div>
                      <div className="relative group">
                          <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
                          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl" placeholder="Email Address" />
                      </div>
                      <div className="relative group">
                          <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                          <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl" placeholder="Password" />
                      </div>
                  </div>
                  <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg mt-6">
                      Select Plan <ArrowRight />
                  </button>
              </form>
          )}

          {step === 2 && (
              <div className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sortedProducts.map((plan) => (
                          <div key={plan.id} className="relative p-6 rounded-xl border-2 hover:border-indigo-300 hover:shadow-lg bg-white flex flex-col text-center transition-all">
                              <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                              <div className="my-4">
                                  <span className="text-3xl font-extrabold text-slate-900">${plan.price_per_unit}</span>
                                  <span className="text-sm text-slate-500 font-medium">/mo</span>
                              </div>
                              <button onClick={() => handlePlanSelection(plan)} disabled={loading} className="w-full py-3 rounded-lg font-bold text-sm bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100">
                                {loading && selectedPlan.id === plan.id ? <Loader2 className="animate-spin mx-auto"/> : 'Select Plan'}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {step === 3 && clientSecret && (
              <div className="animate-fade-in max-w-md mx-auto">
                  <div className="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-200">
                      <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-slate-600 font-medium">Selected Plan</span>
                          <span className="font-bold text-indigo-700">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">7-Day Free Trial</span>
                          <span className="font-bold text-slate-900">$0.00</span>
                      </div>
                  </div>
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5', borderRadius: '12px' } } }}>
                      <CheckoutForm clientSecret={clientSecret} onSuccess={() => window.location.href = '/'} />
                  </Elements>
              </div>
          )}
      </div>
    </div>
  );
}