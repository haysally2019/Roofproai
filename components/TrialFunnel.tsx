import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    ArrowRight, Building2, User, Mail, Lock,
    Check, Sparkles, ShieldCheck, ArrowLeft, Loader2, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../src/stripe-config'; 

export default function TrialFunnel() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref'); // Capture ?ref= from URL

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Navigation Handlers
  const nextStep = (e: React.FormEvent) => {
      e.preventDefault();
      setStep(prev => prev + 1);
  };

  const prevStep = () => {
      setStep(prev => prev - 1);
  };

  const handleCheckout = async (plan: any) => {
    setLoading(true);
    setError(null);

    try {
        // 1. Resolve Referral Code (if exists)
        let referrerId = null;
        if (referralCode) {
            // Call the SQL function created in Phase 1
            const { data: resolved } = await supabase.rpc('resolve_referral_code', { code: referralCode });
            referrerId = resolved;
        }

        // 2. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;

        // 3. Create Company (Injecting referrerId)
        const { data: companyData } = await supabase.from('companies').insert({
            name: formData.companyName,
            status: 'Pending', 
            tier: plan.name,
            setup_complete: false,
            referred_by_user_id: referrerId // <--- Capture Attribution Here
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

        // 4. Initiate Hosted Checkout
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

  // Calculate Progress
  const progress = Math.min((step / 4) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* Header */}
      <div className="w-full bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="font-bold text-lg md:text-xl flex items-center gap-2 text-indigo-700">
              <Zap size={24} fill="currentColor"/> RAFTER AI
          </div>
          <div className="hidden md:block text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
              {referralCode ? 'Referral Offer Active' : 'BETA PRICING LIVE'}
          </div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-xl mx-auto w-full">
              {/* Progress Bar */}
              <div className="mb-8">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                      ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                      <span>Start</span>
                      <span>Account</span>
                      <span>Security</span>
                      <span>Plan</span>
                  </div>
              </div>

              {/* Card Container */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative">
                  
                  {/* Back Button (Internal) */}
                  {step > 1 && step < 5 && (
                      <button 
                        onClick={prevStep} 
                        className="absolute top-6 left-6 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      >
                          <ArrowLeft size={20} />
                      </button>
                  )}

                  <div className="p-8 md:p-10 min-h-[400px] flex flex-col justify-center">
                      
                      {/* --- STEP 1: COMPANY NAME --- */}
                      {step === 1 && (
                          <form onSubmit={nextStep} className="animate-fade-in flex flex-col gap-6">
                              <div className="text-center">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                      <Building2 size={24} />
                                  </div>
                                  <h2 className="text-2xl font-bold text-slate-900">What's your business called?</h2>
                                  <p className="text-slate-500 text-sm mt-1">We'll set up your workspace with this name.</p>
                              </div>

                              <div className="relative group">
                                  <input 
                                    autoFocus
                                    required 
                                    value={formData.companyName} 
                                    onChange={e => setFormData({...formData, companyName: e.target.value})} 
                                    className="w-full p-4 text-center text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-300" 
                                    placeholder="e.g. Apex Roofing" 
                                  />
                              </div>

                              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group">
                                  Next Step <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                              </button>
                          </form>
                      )}

                      {/* --- STEP 2: PERSONAL INFO --- */}
                      {step === 2 && (
                          <form onSubmit={nextStep} className="animate-fade-in flex flex-col gap-6">
                              <div className="text-center">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                      <User size={24} />
                                  </div>
                                  <h2 className="text-2xl font-bold text-slate-900">Who should we address?</h2>
                                  <p className="text-slate-500 text-sm mt-1">Your details for the admin account.</p>
                              </div>

                              <div className="space-y-4">
                                  <div className="relative">
                                      <User className="absolute left-4 top-4 text-slate-400" size={20} />
                                      <input 
                                        autoFocus
                                        required 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className="w-full pl-12 p-4 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none" 
                                        placeholder="Full Name" 
                                      />
                                  </div>
                                  <div className="relative">
                                      <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
                                      <input 
                                        required 
                                        type="email"
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        className="w-full pl-12 p-4 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none" 
                                        placeholder="Email Address" 
                                      />
                                  </div>
                              </div>

                              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group">
                                  Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                              </button>
                          </form>
                      )}

                      {/* --- STEP 3: SECURITY --- */}
                      {step === 3 && (
                          <form onSubmit={nextStep} className="animate-fade-in flex flex-col gap-6">
                              <div className="text-center">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                      <Lock size={24} />
                                  </div>
                                  <h2 className="text-2xl font-bold text-slate-900">Secure your account</h2>
                                  <p className="text-slate-500 text-sm mt-1">Create a strong password to protect your data.</p>
                              </div>

                              <div className="relative">
                                  <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                                  <input 
                                    autoFocus
                                    required 
                                    type="password"
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    className="w-full pl-12 p-4 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 outline-none text-lg tracking-widest" 
                                    placeholder="••••••••" 
                                  />
                              </div>

                              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group">
                                  View Beta Plans <Sparkles size={20} className="text-yellow-400 fill-yellow-400"/>
                              </button>
                          </form>
                      )}

                      {/* --- STEP 4: PLAN SELECTION --- */}
                      {step === 4 && (
                          <div className="animate-fade-in">
                              <div className="text-center mb-6">
                                  <h2 className="text-2xl font-bold text-slate-900">Choose your tier</h2>
                                  <p className="text-slate-500 text-sm mt-1">7-Day Free Trial. Cancel Anytime.</p>
                              </div>

                              {error && (
                                  <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 text-center">
                                      {error}
                                  </div>
                              )}

                              <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                  {sortedProducts.map((plan) => (
                                      <div 
                                        key={plan.id}
                                        onClick={() => handleCheckout(plan)}
                                        className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md ${plan.popular ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}
                                      >
                                          <div className="flex justify-between items-center">
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center group-hover:border-indigo-600 ${plan.popular ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                  </div>
                                                  <div>
                                                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                          {plan.name}
                                                          {plan.popular && <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Recommended</span>}
                                                      </h3>
                                                      <div className="text-slate-500 text-xs mt-0.5 flex gap-2">
                                                          {plan.features.slice(0, 2).map((f, i) => (
                                                              <span key={i} className="flex items-center gap-1"><Check size={10} className="text-emerald-500"/> {f}</span>
                                                          ))}
                                                          <span className="text-slate-400">+ more</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className="font-bold text-lg text-slate-900">${plan.price_per_unit}</div>
                                                  <div className="text-[10px] text-slate-500 uppercase font-medium">/month</div>
                                              </div>
                                          </div>
                                          {/* Hover Effect CTA */}
                                          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                              <span className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
                                                  {loading ? <Loader2 className="animate-spin" size={16}/> : <>Start Free Trial <ArrowRight size={16}/></>}
                                              </span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              
                              <div className="mt-6 text-center">
                                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                                      <ShieldCheck size={12}/> Secure 256-bit SSL Encrypted Payment
                                  </p>
                              </div>
                          </div>
                      )}

                  </div>
              </div>
              
              {/* Login Link */}
              <div className="text-center mt-6">
                <p className="text-sm text-slate-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => window.location.href = '/'}
                      className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors underline-offset-2 hover:underline"
                    >
                        Log in
                    </button>
                </p>
              </div>

          </div>
      </div>
    </div>
  );
}