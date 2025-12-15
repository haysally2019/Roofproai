import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, Building2, User, Mail, Lock, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';

interface TrialFunnelProps {
  onSwitchToLogin: () => void;
}

const TrialFunnel: React.FC<TrialFunnelProps> = ({ onSwitchToLogin }) => {
  const { register, addToast, currentUser } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: ''
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
      if (currentUser) window.location.href = '/';
  }, [currentUser]);
  
  // Auto-focus logic
  useEffect(() => {
      if (!isAnimating) setTimeout(() => inputRef.current?.focus(), 100);
  }, [step, isAnimating]);

  const handleNext = () => {
      if (step === 1 && (!formData.companyName || !formData.name)) {
          addToast("Please fill in both fields", "info");
          return;
      }
      
      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
      }, 300);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;
    
    setLoading(true);
    try {
      await register(formData.companyName, formData.name, formData.email, formData.password);
      // App.tsx takes over from here once currentUser is set
    } catch (error) {
      console.error(error);
      addToast('Registration failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (step === 1) handleNext();
          else handleRegister(e);
      }
  };

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header */}
      <header className="w-full p-8 flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-indigo-600">
              <Sparkles size={16} fill="currentColor" />
              <span>7-Day Free Trial</span>
          </div>
          <div className="flex gap-1">
              {[1, 2].map(s => (
                  <div key={s} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              ))}
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full max-w-2xl mx-auto px-6 z-10">
          
          <div className={`w-full transition-all duration-500 ease-out transform ${isAnimating ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'}`}>
              
              {/* STEP 1: IDENTITY */}
              {step === 1 && (
                  <div className="space-y-8">
                      <div className="space-y-2">
                          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                              Let's set up your workspace.
                          </h1>
                          <p className="text-lg text-slate-500 font-medium">
                              We'll configure your CRM and AI tools automatically.
                          </p>
                      </div>

                      <div className="space-y-6 bg-white p-1">
                          <div className="relative group">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Company Name</label>
                              <div className="flex items-center border-b-2 border-slate-200 focus-within:border-indigo-600 transition-colors py-2">
                                  <Building2 className="text-slate-400 mr-3" size={24} />
                                  <input 
                                      ref={inputRef}
                                      autoFocus
                                      value={formData.companyName}
                                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                                      onKeyDown={handleKeyDown}
                                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300 text-slate-900"
                                      placeholder="e.g. Apex Roofing"
                                  />
                              </div>
                          </div>

                          <div className="relative group">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Your Full Name</label>
                              <div className="flex items-center border-b-2 border-slate-200 focus-within:border-indigo-600 transition-colors py-2">
                                  <User className="text-slate-400 mr-3" size={24} />
                                  <input 
                                      value={formData.name}
                                      onChange={e => setFormData({...formData, name: e.target.value})}
                                      onKeyDown={handleKeyDown}
                                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300 text-slate-900"
                                      placeholder="e.g. John Doe"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="pt-4">
                          <button 
                              onClick={handleNext}
                              disabled={!formData.companyName || !formData.name}
                              className="w-full bg-slate-900 text-white py-5 rounded-xl text-xl font-bold hover:bg-slate-800 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl flex items-center justify-center gap-2"
                          >
                              Next Step <ArrowRight size={20} />
                          </button>
                      </div>
                  </div>
              )}

              {/* STEP 2: CREDENTIALS */}
              {step === 2 && (
                  <div className="space-y-8">
                      <div className="space-y-2">
                          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                              Last step. Secure your account.
                          </h1>
                          <p className="text-lg text-slate-500 font-medium">
                              You'll use this to log in to your Super Admin dashboard.
                          </p>
                      </div>

                      <div className="space-y-6">
                          <div className="relative group">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Work Email</label>
                              <div className="flex items-center border-b-2 border-slate-200 focus-within:border-indigo-600 transition-colors py-2">
                                  <Mail className="text-slate-400 mr-3" size={24} />
                                  <input 
                                      ref={inputRef}
                                      type="email"
                                      value={formData.email}
                                      onChange={e => setFormData({...formData, email: e.target.value})}
                                      onKeyDown={handleKeyDown}
                                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300 text-slate-900"
                                      placeholder="name@company.com"
                                  />
                              </div>
                          </div>

                          <div className="relative group">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Password</label>
                              <div className="flex items-center border-b-2 border-slate-200 focus-within:border-indigo-600 transition-colors py-2">
                                  <Lock className="text-slate-400 mr-3" size={24} />
                                  <input 
                                      type="password"
                                      value={formData.password}
                                      onChange={e => setFormData({...formData, password: e.target.value})}
                                      onKeyDown={handleKeyDown}
                                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300 text-slate-900 font-mono tracking-wide"
                                      placeholder="••••••••"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 space-y-4">
                          <button 
                              onClick={handleRegister}
                              disabled={!formData.email || !formData.password || loading}
                              className="w-full bg-indigo-600 text-white py-5 rounded-xl text-xl font-bold hover:bg-indigo-700 hover:scale-[1.02] transition-all disabled:opacity-70 shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
                          >
                              {loading ? <Loader2 className="animate-spin" /> : 'Create Account & Launch'} 
                              {!loading && <Sparkles size={20} fill="currentColor" />}
                          </button>
                          
                          <div className="flex justify-between items-center px-2">
                              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">Back</button>
                              <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> No Credit Card</span>
                                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500"/> Instant Access</span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 text-center shrink-0 z-20">
          <p className="text-slate-400 text-sm font-medium">
              Already have an account? 
              <button onClick={onSwitchToLogin} className="ml-2 text-indigo-600 hover:text-indigo-700 font-bold transition-colors">Log In</button>
          </p>
      </footer>
    </div>
  );
};

export default TrialFunnel;