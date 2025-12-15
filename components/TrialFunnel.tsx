import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, Building2, User, Mail, Lock, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';

interface TrialFunnelProps {
  onSwitchToLogin: () => void;
}

const TrialFunnel: React.FC<TrialFunnelProps> = ({ onSwitchToLogin }) => {
  const { register, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: ''
  });

  // Auto-focus logic
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
      if (!isAnimating) {
          setTimeout(() => inputRef.current?.focus(), 100);
      }
  }, [step, isAnimating]);

  const handleNext = () => {
      if (step === 1 && !formData.companyName) return;
      if (step === 2 && (!formData.name || !formData.email)) return;

      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
      }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (step < 3) handleNext();
          else handleRegister(e);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password) return;
    
    setLoading(true);
    try {
      await register(formData.companyName, formData.name, formData.email, formData.password);
      // App.tsx handles the redirect once currentUser is set
    } catch (error) {
      console.error(error);
      addToast('Registration failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 relative z-10 font-sans text-white">
      
      {/* Header / Progress */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-center opacity-50 mb-12">
          <div className="flex items-center gap-2 text-sm font-medium tracking-widest uppercase">
              <Sparkles size={14} className="text-indigo-400" />
              <span>7-Day Free Trial</span>
          </div>
          <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500' : 'bg-white/10'}`} />
              ))}
          </div>
      </div>

      <div className={`mt-24 transition-all duration-700 ease-out transform ${isAnimating ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
          
          {/* STEP 1: COMPANY IDENTITY */}
          {step === 1 && (
              <div className="space-y-10">
                  <div className="space-y-4">
                      <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                          Let's start your <br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Digital Transformation</span>.
                      </h1>
                      <p className="text-xl text-slate-400 max-w-2xl">
                          We'll build a custom AI workspace for your roofing business. <br/> No credit card required.
                      </p>
                  </div>

                  <div className="relative group max-w-2xl">
                      <input 
                          ref={inputRef}
                          autoFocus
                          value={formData.companyName}
                          onChange={e => setFormData({...formData, companyName: e.target.value})}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-transparent text-4xl md:text-5xl py-6 border-b-2 border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors font-medium text-white"
                          placeholder="Company Name..."
                      />
                      <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 transition-colors group-focus-within:text-indigo-500" size={40} strokeWidth={1.5} />
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                      <button 
                          onClick={handleNext}
                          disabled={!formData.companyName}
                          className="group flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full text-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                      >
                          Continue <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform"/>
                      </button>
                      <span className="text-slate-500 text-sm font-medium ml-4 hidden md:block">
                          Press <strong>Enter ↵</strong>
                      </span>
                  </div>
              </div>
          )}

          {/* STEP 2: ADMIN PROFILE */}
          {step === 2 && (
              <div className="space-y-10">
                  <div className="space-y-4">
                      <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                          Who will be the <br/>
                          <span className="text-indigo-400">Super Admin</span>?
                      </h1>
                      <p className="text-lg text-slate-400">
                          You will have full control over the CRM, AI Agents, and Integrations.
                      </p>
                  </div>

                  <div className="space-y-8 max-w-xl">
                      <div className="relative group">
                          <User className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={28} />
                          <input 
                              ref={inputRef}
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                              className="w-full bg-transparent text-2xl py-4 pl-12 border-b border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors text-white"
                              placeholder="Full Name"
                          />
                      </div>
                      <div className="relative group">
                          <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={28} />
                          <input 
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                              onKeyDown={handleKeyDown}
                              type="email"
                              className="w-full bg-transparent text-2xl py-4 pl-12 border-b border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors text-white"
                              placeholder="Work Email"
                          />
                      </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4">
                      <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors">Back</button>
                      <button 
                          onClick={handleNext}
                          disabled={!formData.name || !formData.email}
                          className="group flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-indigo-500 hover:scale-105 transition-all disabled:opacity-50"
                      >
                          Next Step <ChevronRight size={24} />
                      </button>
                  </div>
              </div>
          )}

          {/* STEP 3: SECURITY & LAUNCH */}
          {step === 3 && (
              <div className="space-y-10">
                  <div className="space-y-4">
                      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                          <Zap className="text-indigo-400" size={32} fill="currentColor" />
                      </div>
                      <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                          Secure your <br/>
                          <span className="text-white">Command Center</span>.
                      </h1>
                      <p className="text-lg text-slate-400">
                          Set a strong password to protect your client data and AI configurations.
                      </p>
                  </div>

                  <div className="max-w-xl">
                      <div className="relative group">
                          <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={28} />
                          <input 
                              ref={inputRef}
                              type="password"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent text-3xl py-4 pl-12 border-b border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors text-white font-mono"
                              placeholder="••••••••"
                          />
                      </div>
                  </div>

                  <div className="flex flex-col gap-4 max-w-md pt-4">
                      <div className="flex gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500"/> No Credit Card</div>
                          <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500"/> 7-Day Free Trial</div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4">
                          <button onClick={() => setStep(2)} className="text-slate-500 hover:text-white transition-colors">Back</button>
                          <button 
                              onClick={handleRegister}
                              disabled={!formData.password || loading}
                              className="flex-1 bg-white text-black px-8 py-5 rounded-full text-xl font-bold hover:bg-indigo-50 transition-all shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 disabled:opacity-70"
                          >
                              {loading ? 'Creating Account...' : 'Launch Dashboard'} 
                              {!loading && <ArrowRight size={24} />}
                          </button>
                      </div>
                  </div>
              </div>
          )}

      </div>

      <div className="absolute bottom-8 left-0 w-full text-center">
          <p className="text-slate-600 text-sm">
              Already have an account? 
              <button onClick={onSwitchToLogin} className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Log In</button>
          </p>
      </div>
    </div>
  );
};

export default TrialFunnel;