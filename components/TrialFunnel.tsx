import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, Building2, User, Mail, Lock, Zap, Sparkles, ChevronRight } from 'lucide-react';
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

  // Redirect if already logged in
  useEffect(() => {
      if (currentUser) {
          window.location.href = '/';
      }
  }, [currentUser]);
  
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
      }, 400);
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
    } catch (error) {
      console.error(error);
      addToast('Registration failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- Header (Static, No Overlap) --- */}
      <header className="w-full p-8 flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-indigo-600">
              <Sparkles size={16} fill="currentColor" />
              <span>Free Trial Setup</span>
          </div>
          <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              ))}
          </div>
      </header>

      {/* --- Main Content (Centered, Flexible) --- */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto px-6 z-10">
          
          {/* Background Ambience */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className={`w-full transition-all duration-500 ease-out transform ${isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
              
              {/* STEP 1: COMPANY */}
              {step === 1 && (
                  <div className="space-y-10">
                      <div className="space-y-4">
                          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Let's digitalize your <br/>
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Roofing Business</span>.
                          </h1>
                          <p className="text-lg text-slate-500 max-w-xl font-medium">
                              Full CRM access. AI Estimating. No credit card required.
                          </p>
                      </div>

                      <div className="relative group max-w-2xl">
                          <input 
                              ref={inputRef}
                              autoFocus
                              value={formData.companyName}
                              onChange={e => setFormData({...formData, companyName: e.target.value})}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent text-3xl md:text-5xl py-4 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors font-bold text-slate-900"
                              placeholder="Your Company Name"
                          />
                          <Building2 className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-600" size={32} strokeWidth={1.5} />
                      </div>

                      <div className="pt-6">
                          <button 
                              onClick={handleNext}
                              disabled={!formData.companyName}
                              className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-slate-200"
                          >
                              Start <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                          </button>
                      </div>
                  </div>
              )}

              {/* STEP 2: ADMIN USER */}
              {step === 2 && (
                  <div className="space-y-10">
                      <div className="space-y-4">
                          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Who is the <br/>
                              <span className="text-indigo-600">Super Admin</span>?
                          </h1>
                          <p className="text-lg text-slate-500 font-medium">
                              You'll have full control over permissions and AI agents.
                          </p>
                      </div>

                      <div className="space-y-6 max-w-xl">
                          <div className="relative group">
                              <User className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                              <input 
                                  ref={inputRef}
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  className="w-full bg-transparent text-xl md:text-3xl py-3 pl-10 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold"
                                  placeholder="Full Name"
                              />
                          </div>
                          <div className="relative group">
                              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                              <input 
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                  onKeyDown={handleKeyDown}
                                  type="email"
                                  className="w-full bg-transparent text-xl md:text-3xl py-3 pl-10 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold"
                                  placeholder="Work Email"
                              />
                          </div>
                      </div>

                      <div className="pt-6 flex items-center gap-6">
                          <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-900 transition-colors font-bold">Back</button>
                          <button 
                              onClick={handleNext}
                              disabled={!formData.name || !formData.email}
                              className="group flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200"
                          >
                              Next Step <ChevronRight size={20} />
                          </button>
                      </div>
                  </div>
              )}

              {/* STEP 3: PASSWORD */}
              {step === 3 && (
                  <div className="space-y-10">
                      <div className="space-y-4">
                          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
                              <Zap className="text-indigo-600" size={24} fill="currentColor" />
                          </div>
                          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Secure your <br/>
                              <span className="text-slate-900">Command Center</span>.
                          </h1>
                          <p className="text-lg text-slate-500 font-medium">
                              Set a password to protect your client data.
                          </p>
                      </div>

                      <div className="max-w-xl relative group">
                          <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                          <input 
                              ref={inputRef}
                              type="password"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent text-3xl md:text-4xl py-3 pl-10 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold tracking-widest"
                              placeholder="••••••••"
                          />
                      </div>

                      <div className="pt-6 flex flex-col gap-6">
                          <div className="flex gap-6 text-sm text-slate-600 font-bold uppercase tracking-wide">
                              <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500" strokeWidth={3}/> No Credit Card</div>
                              <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500" strokeWidth={3}/> 7-Day Free Trial</div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-900 transition-colors font-bold">Back</button>
                              <button 
                                  onClick={handleRegister}
                                  disabled={!formData.password || loading}
                                  className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-300 flex items-center justify-center gap-3 disabled:opacity-70 hover:scale-105"
                              >
                                  {loading ? 'Creating Account...' : 'Launch Dashboard'} 
                                  {!loading && <ArrowRight size={20} />}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </main>

      {/* --- Footer (Static) --- */}
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