import React, { useState, useRef, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowRight, Building2, User, Mail, Lock, Sparkles, Loader2, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// IMPORTANT: Replace with your actual Stripe Public Key
const STRIPE_PUBLIC_KEY = 'pk_test_...'; 
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

// Use the price ID from your stripe-config.ts (Starter Plan)
const STARTER_PRICE_ID = 'price_1SgX3WPi0ycIAEpYb38zmYPK'; 

// --- SUB-COMPONENT: The Credit Card Form ---
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
            confirmParams: {
                return_url: window.location.origin + '/dashboard', 
            },
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
            {message && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{message}</div>}
            
            <button 
                disabled={isProcessing || !stripe || !elements} 
                className="w-full bg-indigo-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  
  const [formData, setFormData] = useState({ companyName: '', name: '', email: '', password: '' });

  // Handle Account Creation & Payment Setup
  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // 1. Sign Up User (Supabase Auth)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user created");

        // 2. Create Company Profile (Your Logic)
        await supabase.from('users').insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            role: 'Company Owner'
        });

        await supabase.from('companies').insert({
            name: formData.companyName,
            status: 'Pending', 
            tier: 'Starter'
        });

        // 3. Call Backend to get Stripe Secret
        const { data: subData, error: subError } = await supabase.functions.invoke('create-embedded-subscription', {
            body: { 
                priceId: STARTER_PRICE_ID, 
                email: formData.email 
            }
        });

        if (subError || !subData.clientSecret) throw new Error("Payment setup failed");

        setClientSecret(subData.clientSecret);
        setLoading(false);
        setStep(2); // Move to Payment Screen

    } catch (error: any) {
        console.error(error);
        alert(error.message);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          
          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
              <form onSubmit={handleAccountCreation} className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-slate-900">Setup Workspace</h2>
                      <p className="text-slate-500">Create your account to get started.</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                          <div className="flex items-center border-b-2 border-slate-200 py-2 focus-within:border-indigo-600">
                              <Building2 className="text-slate-400 mr-3"/>
                              <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full text-lg outline-none" placeholder="Apex Roofing" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <div className="flex items-center border-b-2 border-slate-200 py-2 focus-within:border-indigo-600">
                              <User className="text-slate-400 mr-3"/>
                              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full text-lg outline-none" placeholder="John Doe" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                          <div className="flex items-center border-b-2 border-slate-200 py-2 focus-within:border-indigo-600">
                              <Mail className="text-slate-400 mr-3"/>
                              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full text-lg outline-none" placeholder="john@apex.com" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                          <div className="flex items-center border-b-2 border-slate-200 py-2 focus-within:border-indigo-600">
                              <Lock className="text-slate-400 mr-3"/>
                              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full text-lg outline-none" placeholder="••••••••" />
                          </div>
                      </div>
                  </div>

                  <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 disabled:opacity-70">
                      {loading ? <Loader2 className="animate-spin" /> : <>Next <ArrowRight /></>}
                  </button>
              </form>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 2 && clientSecret && (
              <div className="animate-fade-in">
                  <div className="mb-6">
                      <div className="flex items-center gap-2 text-indigo-600 mb-2">
                          <Sparkles size={20} fill="currentColor" />
                          <span className="text-sm font-bold uppercase tracking-widest">7-Day Free Trial</span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">Activate Membership</h2>
                      <div className="bg-slate-50 p-4 rounded-lg mt-4 flex justify-between items-center text-sm">
                          <span className="text-slate-600">Due Today</span>
                          <span className="text-xl font-bold text-slate-900">$0.00</span>
                      </div>
                  </div>
                  
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                      <CheckoutForm onSuccess={() => navigate('/dashboard')} />
                  </Elements>
              </div>
          )}
      </div>
    </div>
  );
}