import React, { useState } from 'react';
import { 
    ArrowRight, Building2, User, Mail, Lock, 
    CheckCircle2, Star, ShieldCheck, HelpCircle, 
    ChevronDown, ChevronUp, ArrowLeft, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../src/stripe-config'; 

// --- STATIC DATA FOR UI ---
const TESTIMONIALS = [
    {
        name: "Mike Stevenson",
        role: "Owner, Apex Roofing",
        text: "RoofPro AI automated our entire lead intake. We went from missing 30% of calls to capturing every single lead. It paid for itself in day one."
    }
];

const FAQS = [
    {
        question: "Is the 7-day trial really free?",
        answer: "Yes! You won't be charged a single cent during your 7-day trial. You can cancel instantly from your dashboard at any time."
    },
    {
        question: "What happens after the trial?",
        answer: "If you love RoofPro, your subscription will automatically continue so you don't lose access. We'll email you before your trial ends as a reminder."
    },
    {
        question: "Can I change plans later?",
        answer: "Absolutely. You can upgrade or downgrade your plan at any time to fit your business needs."
    }
];

export default function TrialFunnel() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Data State
  const sortedProducts = [...stripeProducts].sort((a, b) => a.price_per_unit - b.price_per_unit);
  const [selectedPlan, setSelectedPlan] = useState(sortedProducts.find(p => p.popular) || sortedProducts[1]); 
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Handle Account Creation + Redirect
  const handleCheckout = async () => {
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

        // 2. Create Company & User Records
        const { data: companyData } = await supabase.from('companies').insert({
            name: formData.companyName,
            status: 'Pending', 
            tier: selectedPlan.name,
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
                priceId: selectedPlan.priceId,
                email: formData.email,
                redirectUrl: window.location.origin
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Checkout failed");
        
        // 4. Redirect User to Stripe
        window.location.href = result.url;

    } catch (err: any) {
        setError(err.message || "Setup failed. Please try again.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HERO HEADER --- */}
      <div className="bg-indigo-700 pt-12 pb-24 px-4 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                  Automate Your Roofing Business Today
              </h1>
              <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto">
                  Join 500+ roofing pros who use RoofPro AI to capture leads, analyze damage, and close deals faster.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm font-medium text-indigo-200">
                  <span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400"/> No Credit Card Charge Today</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400"/> Cancel Anytime</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400"/> 7-Day Free Trial</span>
              </div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* --- LEFT COLUMN: STEPS & FORM --- */}
              <div className="lg:col-span-7 space-y-6">
                  
                  {/* STEP 1: ACCOUNT */}
                  <div className={`bg-white rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 ${step === 1 ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-200 opacity-60'}`}>
                      <div className="p-6 md:p-8">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-bold flex items-center gap-3">
                                  <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                  Create Account
                              </h2>
                              {step === 2 && <button onClick={() => setStep(1)} className="text-sm text-indigo-600 font-medium hover:underline">Edit</button>}
                          </div>

                          {step === 1 && (
                              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-5 animate-fade-in">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                                          <div className="relative"><Building2 className="absolute left-3 top-3 text-slate-400" size={18} /><input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Apex Roofing LLC" /></div>
                                      </div>
                                      <div className="space-y-1">
                                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                          <div className="relative"><User className="absolute left-3 top-3 text-slate-400" size={18} /><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" /></div>
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Work Email</label>
                                      <div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18} /><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="john@apexroofing.com" /></div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                      <div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={18} /><input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" /></div>
                                  </div>
                                  <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg mt-4 text-lg">
                                      Continue to Plans <ArrowRight />
                                  </button>
                              </form>
                          )}
                      </div>
                  </div>

                  {/* STEP 2: PLAN SELECTION */}
                  <div className={`bg-white rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 ${step === 2 ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-200 opacity-60'}`}>
                      <div className="p-6 md:p-8">
                          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
                              Select Your Plan
                          </h2>

                          {step === 2 && (
                              <div className="animate-fade-in space-y-6">
                                  {/* Plan List */}
                                  <div className="space-y-4">
                                      {sortedProducts.map((plan) => (
                                          <div 
                                            key={plan.id} 
                                            onClick={() => setSelectedPlan(plan)}
                                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan.id === plan.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                                          >
                                              <div className="flex items-center gap-4">
                                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan.id === plan.id ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                      {selectedPlan.id === plan.id && <div className="w-3 h-3 bg-indigo-600 rounded-full"/>}
                                                  </div>
                                                  <div>
                                                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                                          {plan.name} 
                                                          {plan.popular && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Most Popular</span>}
                                                      </h3>
                                                      <p className="text-sm text-slate-500 hidden md:block">{plan.description}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className="font-extrabold text-xl text-slate-900">${plan.price_per_unit}<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>

                                  {/* Selected Plan Details */}
                                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                      <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Included in {selectedPlan.name}:</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                                          {selectedPlan.features?.map((feat, i) => (
                                              <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/>
                                                  {feat}
                                              </div>
                                          )) || <span className="text-sm text-slate-400">All core features included.</span>}
                                      </div>
                                  </div>
                                  
                                  {/* Error Message */}
                                  {error && (
                                      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                          <ShieldCheck size={16}/> {error}
                                      </div>
                                  )}

                                  {/* CTA */}
                                  <button 
                                    onClick={handleCheckout} 
                                    disabled={loading}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                                  >
                                      {loading ? <span className="animate-pulse">Processing...</span> : 'Start My 7-Day Free Trial'}
                                  </button>
                                  <p className="text-xs text-center text-slate-400">
                                      You will be redirected to Stripe for secure checkout. No charge today.
                                  </p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* --- RIGHT COLUMN: SOCIAL PROOF --- */}
              <div className="lg:col-span-5 space-y-8">
                  
                  {/* Testimonial Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                      <div className="flex gap-1 mb-4">
                          {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="#FBBF24" className="text-amber-400"/>)}
                      </div>
                      <p className="text-slate-700 italic mb-4 leading-relaxed">"{TESTIMONIALS[0].text}"</p>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">MS</div>
                          <div>
                              <div className="font-bold text-slate-900 text-sm">{TESTIMONIALS[0].name}</div>
                              <div className="text-xs text-slate-500">{TESTIMONIALS[0].role}</div>
                          </div>
                      </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="bg-slate-100 rounded-xl p-6 text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Secure & Trusted</p>
                      <div className="flex justify-center items-center gap-6 opacity-60 grayscale">
                          {/* Using Text for logos as generic placeholders */}
                          <span className="font-bold text-xl text-slate-600 flex items-center gap-1"><ShieldCheck size={20}/> SSL Secure</span>
                          <span className="font-bold text-xl text-slate-600 italic">Stripe</span>
                      </div>
                  </div>

                  {/* FAQ */}
                  <div className="space-y-3">
                      <h3 className="font-bold text-slate-800 px-2">Common Questions</h3>
                      {FAQS.map((faq, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                              <button 
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 transition-colors"
                              >
                                  <span className="font-medium text-sm text-slate-700">{faq.question}</span>
                                  {openFaq === idx ? <ChevronUp size={16} className="text-indigo-500"/> : <ChevronDown size={16} className="text-slate-400"/>}
                              </button>
                              {openFaq === idx && (
                                  <div className="px-4 pb-4 text-sm text-slate-500 leading-relaxed bg-slate-50 border-t border-slate-100">
                                      {faq.answer}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
}