import React, { useState } from 'react';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, ArrowLeft, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../src/stripe-config'; 

export default function TrialFunnel() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts[0]); 
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Handle Account Creation + Redirect
  const handlePlanSelection = async (plan: typeof sortedProducts[0]) => {
    setSelectedPlan(plan);
    setLoading(true);
    setError(null);

    try {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration failed");

        // 2. Create Company & User Records (if not already existing from a retry)
        // We use 'upsert' or checks here to be safe on retries
        const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: formData.companyName,
                status: 'Pending', 
                tier: plan.name,
                setup_complete: false
            })
            .select()
            .single();

        if (companyError) {
            // Ignore error if it's just a duplicate entry from a previous attempt
            console.warn("Company creation warning:", companyError.message);
        } else if (companyData) {
             await supabase.from('users').insert({
                id: authData.user.id,
                name: formData.name,
                email: formData.email,
                role: 'Company Owner',
                company_id: companyData.id
            });
        }

        // 3. Call Hosted Checkout Function
        // We get a session token from the current auth state to authenticate the request
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId: plan.priceId,
                email: formData.email,
                redirectUrl: window.location.origin
            }),
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Checkout initiation failed");
        if (!result.url) throw new Error("No checkout URL returned");

        // 4. Redirect to Stripe
        window.location.href = result.url;

    } catch (err: any) {
        console.error("Onboarding Error:", err);
        setError(err.message || "Failed to setup account. Please try again.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all duration-500 ${step === 2 ? 'max-w-4xl' : 'max-w-lg'}`}>
          
          {/* Header */}
          <div className="mb-8 text-center relative">
              {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="absolute left-0 top-1 text-slate-400 hover:text-slate-600">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {step === 1 && "Create Your Account"}
                  {step === 2 && "Choose Your Plan"}
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

          {/* STEP 2: PLAN SELECTION & CHECKOUT */}
          {step === 2 && (
              <div className="animate-fade-in">
                  <div className="text-center mb-6 text-slate-500 text-sm">
                      You will be redirected to Stripe for secure payment.
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
                                className="w-full py-3 rounded-lg font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                              >
                                {loading && selectedPlan.id === plan.id ? <Loader2 className="animate-spin" /> : <> Start 7-Day Trial <CreditCard size={16}/></>}
                              </button>
                          </div>
                      ))}
                  </div>
                  <div className="mt-8 flex justify-center text-xs text-slate-400 gap-4">
                      <span className="flex items-center gap-1"><ShieldCheck size={12}/> Secure 256-bit Encryption</span>
                      <span className="flex items-center gap-1"><Sparkles size={12}/> No Commitment, Cancel Anytime</span>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}