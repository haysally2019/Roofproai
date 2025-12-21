import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, AlertCircle, ArrowLeft, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
// FIX: Corrected import path for config
import { stripeProducts } from '../src/stripe-config'; 

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// --- CHECKOUT FORM COMPONENT ---
const CheckoutForm = ({ onSuccess, clientSecret }: { onSuccess: () => void, clientSecret: string }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isReady, setIsReady] = useState(false); // Track if Stripe loaded

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            // Determine confirmation method based on secret type (pi_ = Payment, seti_ = Setup)
            const confirmFunction = clientSecret.startsWith('pi_') 
                ? stripe.confirmPayment 
                : stripe.confirmSetup;

            const { error } = await confirmFunction({
                elements,
                confirmParams: { return_url: window.location.origin + '/dashboard' },
                redirect: 'if_required'
            });

            if (error) {
                setMessage(error.message || "Payment failed. Please try again.");
                setIsProcessing(false);
            } else {
                onSuccess();
            }
        } catch (err: any) {
            setMessage("An unexpected error occurred. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Payment Element Container */}
            <div className="min-h-[100px]">
                <PaymentElement 
                    onReady={() => setIsReady(true)} 
                    options={{ layout: 'tabs' }} 
                />
            </div>

            {/* Error Message */}
            {message && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={16} /> {message}
                </div>
            )}

            {/* Submit Button */}
            <button 
                disabled={isProcessing || !stripe || !elements || !isReady} 
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

// --- MAIN FUNNEL COMPONENT ---
export default function TrialFunnel() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  
  // Data State
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts[0]); 
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });
  const [promoCode, setPromoCode] = useState(''); // NEW: Promo Code State

  // Step 2 -> 3 Handler
  const handlePlanSelection = async (plan: typeof sortedProducts[0]) => {
    setSelectedPlan(plan);
    setLoading(true);
    setError(null);

    try {
        // 1. Register User (if not already logged in)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;

        // 2. Create Company Record
        const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: formData.companyName,
                status: 'Pending', // Webhook sets to 'Active'/'Trial'
                tier: plan.name,
                setup_complete: false
            })
            .select()
            .single();

        if (companyError) throw new Error("Failed to create company record");

        // 3. Link User to Company
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: authData.user!.id,
                name: formData.name,
                email: formData.email,
                role: 'Company Owner',
                company_id: companyData.id
            });
        
        if (userError) throw new Error("Failed to create user profile");

        // 4. Call Stripe Function (Pass Promo Code)
        const response = await supabase.functions.invoke('create-embedded-subscription', {
            body: { 
                priceId: plan.priceId,
                email: formData.email,
                promoCode: promoCode // Sending promo code to backend
            }
        });

        if (response.error) {
            const err = await response.error.context.json();
            throw new Error(err.error || "Payment initialization failed");
        }

        if (!response.data?.clientSecret) throw new Error("No payment configuration returned");

        setClientSecret(response.data.clientSecret);
        setStep(3); // Proceed to checkout

    } catch (err: any) {
        console.error("Onboarding Error:", err);
        setError(err.message || "Failed to setup account. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all duration-500 ${step === 2 ? 'max-w-4xl' : 'max-w-lg'}`}>
          
          {/* Header & Back Button */}
          <div className="mb-8 text-center relative">
              {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="absolute left-0 top-1 text-slate-400 hover:text-slate-600">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {step === 1 && "Create Your Account"}
                  {step === 2 && "Choose Your Plan"}
                  {step === 3 && "Secure Checkout"}
              </h2>
              {error && (
                  <div className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-100">
                      {error}
                  </div>
              )}
          </div>

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-5 animate-fade-in">
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
                      Next Step <ArrowRight />
                  </button>
              </form>
          )}

          {/* STEP 2: PLAN & PROMO CODE */}
          {step === 2 && (
              <div className="animate-fade-in">
                  {/* Promo Code Input */}
                  <div className="mb-6 flex justify-end">
                      <div className="relative max-w-xs w-full">
                          <Tag className="absolute left-3 top-3 text-slate-400" size={16}/>
                          <input 
                             value={promoCode} 
                             onChange={e => setPromoCode(e.target.value)} 
                             className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                             placeholder="Have a promo code?"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sortedProducts.map((plan) => (
                          <div key={plan.id} className="relative p-6 rounded-xl border-2 hover:border-indigo-300 hover:shadow-lg bg-white flex flex-col text-center transition-all">
                              <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                              <div className="my-4">
                                  <span className="text-3xl font-extrabold text-slate-900">${plan.price_per_unit}</span>
                                  <span className="text-sm text-slate-500 font-medium">/mo</span>
                              </div>
                              <p className="text-sm text-slate-500 mb-6 flex-1">{plan.description}</p>
                              
                              <button 
                                onClick={() => handlePlanSelection(plan)}
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-bold text-sm bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100 flex items-center justify-center gap-2"
                              >
                                {loading && selectedPlan.id === plan.id ? <Loader2 className="animate-spin" /> : 'Select Plan'}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* STEP 3: CHECKOUT */}
          {step === 3 && clientSecret && (
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
                      {promoCode && (
                          <div className="flex justify-between items-center mt-1 text-emerald-600 text-xs font-medium">
                              <span>Promo Code Applied</span>
                              <span>{promoCode}</span>
                          </div>
                      )}
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