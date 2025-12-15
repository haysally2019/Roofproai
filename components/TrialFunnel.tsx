import React, { useState } from 'react';
import { ArrowRight, Check, Building2, User, Mail, Lock, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';

interface TrialFunnelProps {
  onSwitchToLogin: () => void;
}

const TrialFunnel: React.FC<TrialFunnelProps> = ({ onSwitchToLogin }) => {
  const { register, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData.companyName, formData.name, formData.email, formData.password);
      // Success will trigger App.tsx to reload currentUser and move to Onboarding
    } catch (error) {
      console.error(error);
      addToast('Registration failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-scale-in">
      {/* Funnel Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Start Your 7-Day Free Trial</h2>
          <p className="text-blue-100 text-sm">Full access. No credit card required.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1 ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'} transition-all duration-500`}></div>
        ))}
      </div>

      <form onSubmit={handleRegister} className="p-8 flex-1 flex flex-col">
        
        {/* STEP 1: Company Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in flex-1">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <Building2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Tell us about your business</h3>
              <p className="text-slate-500 text-sm">We'll customize your workspace for your team.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  autoFocus
                  required
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Summit Roofing & Solar"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
               <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
               <p className="text-xs text-blue-800 leading-relaxed">
                 <strong>Privacy Guarantee:</strong> Your data is encrypted and secure. We never share your client list with third parties.
               </p>
            </div>

            <button 
              type="button"
              disabled={!formData.companyName}
              onClick={() => setStep(2)}
              className="w-full mt-auto py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-slate-900"
            >
              Next Step <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: Personal Info */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in flex-1">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <User size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Who is the admin?</h3>
              <p className="text-slate-500 text-sm">You'll have full Super Admin access.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  autoFocus
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="john@summitroofing.com"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3.5 text-slate-500 font-bold hover:text-slate-700 transition-colors"
              >
                Back
              </button>
              <button 
                type="button"
                disabled={!formData.name || !formData.email}
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Last Step <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Security & Activate */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in flex-1">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Zap size={28} fill="currentColor" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Secure your account</h3>
              <p className="text-slate-500 text-sm">Set a password to start your engine.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  autoFocus
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
               <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="text-emerald-500" size={16} strokeWidth={3} />
                  <span>7-Day Free Trial (Pro Plan)</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="text-emerald-500" size={16} strokeWidth={3} />
                  <span>No credit card required today</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="text-emerald-500" size={16} strokeWidth={3} />
                  <span>Full AI & CRM Access</span>
               </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3.5 text-slate-500 font-bold hover:text-slate-700 transition-colors"
              >
                Back
              </button>
              <button 
                type="submit"
                disabled={!formData.password || loading}
                className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Launch Dashboard'}
              </button>
            </div>
          </div>
        )}

      </form>

      {/* Footer */}
      <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account? 
          <button onClick={onSwitchToLogin} className="ml-1 text-indigo-600 font-bold hover:underline">Log in here</button>
        </p>
      </div>
    </div>
  );
};

export default TrialFunnel;