import React, { useState } from 'react';
import { 
    ArrowRight, Building2, User, Mail, Lock, 
    Check, Sparkles, ShieldCheck, ArrowLeft, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../src/stripe-config'; 

export default function TrialFunnel() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts.find(p => p.popular) || sortedProducts[1]); 
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  const handleCheckout = async (plan = selectedPlan) => {
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

        // 2. Create Company
        const { data: companyData } = await supabase.from('companies').insert({
            name: formData.companyName,
            status: 'Pending', 
            tier: plan.name,
            setup_complete: false
        }).select().single();

        if (companyData) {
             await supabase.from('users').insert({
                id: authData.user!.id,
                name: formData.name,
                email: formData.email,
                role: 'Company Owner',
                company_id: companyData.id
            });
        }

        // 3. Initiate Hosted Checkout
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
        if (!response.ok) throw new Error(result.error || "Checkout failed");
        
        window.location.href = result.url;

    } catch (err: any) {
        setError(err.message || "Setup failed. Please try again.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* Simple Header */}
      <div className="w-full bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center">
          <div className="font-bold text-xl flex items-center gap-2 text-indigo-700">
              <Sparkles size={20} fill="currentColor"/> RAFTER AI
          </div>
          <div className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
              BETA ACCESS ACTIVE
          </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col justify-center">
          
          <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
                  Start your 7-day free trial
              </h1>
              <p className="text-slate-500 max-w-xl mx-auto">
                  Get full access to RoofPro AI. No charge until your trial ends. Cancel anytime.
              </p>
          </div>

          {/* --- STEP 1: CREATE ACCOUNT --- */}
          {step === 1 && (
              <div className="max-w-md mx-auto w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fade-in">
                  <div className="mb-6 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-slate-800">Create Account</h2>
                      <span className="text-sm text-slate-400">Step 1 of 2</span>
                  </div>
                  
                  <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                          <div className="relative group">
                              <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Apex Roofing" />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                          <div className="relative group">
                              <User className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="John Doe" />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                          <div className="relative group">
                              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="john@company.com" />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                          <div className="relative group">
                              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
                          </div>
                      </div>

                      <button className="w-full mt-4 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          View Beta Pricing <ArrowRight size={18} />
                      </button>
                  </form>
              </div>
          )}

          {/* --- STEP 2: SELECT PLAN --- */}
          {step === 2 && (
              <div className="w-full animate-fade-in">
                  <div className="flex justify-center mb-8">
                        <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                            <ArrowLeft size={16}/> Back to Account
                        </button>
                  </div>

                  {error && (
                      <div className="max-w-md mx-auto mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 text-center">
                          {error}
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {sortedProducts.map((plan) => (
                          <div 
                            key={plan.id}
                            className={`relative bg-white rounded-2xl p-6 border-2 transition-all flex flex-col ${selectedPlan.id === plan.id ? 'border-indigo-600 shadow-xl scale-[1.02]' : 'border-slate-100 hover:border-indigo-200 hover:shadow-lg'}`}
                          >
                              {plan.popular && (
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                      Beta Favorite
                                  </div>
                              )}
                              
                              <div className="text-center mb-6">
                                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                  <div className="flex items-baseline justify-center gap-1 mt-2">
                                      <span className="text-3xl font-extrabold text-slate-900">${plan.price_per_unit}</span>
                                      <span className="text-slate-500 text-sm">/mo</span>
                                  </div>
                                  <p className="text-slate-500 text-xs mt-2">{plan.description}</p>
                              </div>

                              <div className="space-y-3 flex-1 mb-8">
                                  {plan.features.map((feat, i) => (
                                      <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                          <div className="mt-0.5 min-w-[16px]"><Check size={16} className="text-emerald-500" strokeWidth={3}/></div>
                                          {feat}
                                      </div>
                                  ))}
                              </div>

                              <button 
                                onClick={() => { setSelectedPlan(plan); handleCheckout(plan); }}
                                disabled={loading}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${selectedPlan.id === plan.id ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'}`}
                              >
                                {loading && selectedPlan.id === plan.id ? <Loader2 className="animate-spin" /> : 'Start Free Trial'}
                              </button>
                          </div>
                      ))}
                  </div>

                  <div className="mt-12 flex justify-center gap-8 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14}/> Secure Checkout</span>
                      <span className="flex items-center gap-1.5"><Building2 size={14}/> For Contractors</span>
                      <span className="flex items-center gap-1.5"><Sparkles size={14}/> Instant Access</span>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
}