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
  
  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: ''
  });

  // Redirect to dashboard immediately upon successful registration
  useEffect(() => {
      if (currentUser) {
          window.location.href = '/';
      }
  }, [currentUser]);

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
    } catch (error) {
      console.error(error);
      addToast('Registration failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col relative font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Background Ambience (Light Mode) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-50 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-50 rounded-full blur-[100px] animate-pulse pointer-events-none delay-1000"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 pointer-events-none mix-blend-multiply"></div>

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
          <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-indigo-600">
              <Sparkles size={16} fill="currentColor" />
              <span>Free Trial Setup</span>
          </div>
          <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              ))}
          </div>
      </div>

      {/* Main Content Area - Fully Centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto px-6">
          <div className={`w-full transition-all duration-700 ease-out transform ${isAnimating ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
              
              {/* STEP 1: COMPANY */}
              {step === 1 && (
                  <div className="space-y-12">
                      <div className="space-y-4">
                          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Let's digitalize your <br/>
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Roofing Business</span>.
                          </h1>
                          <p className="text-xl text-slate-500 max-w-2xl font-medium">
                              Start your 7-day free trial. Full CRM access. No credit card required.
                          </p>
                      </div>

                      <div className="relative group max-w-3xl">
                          <input 
                              ref={inputRef}
                              autoFocus
                              value={formData.companyName}
                              onChange={e => setFormData({...formData, companyName: e.target.value})}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent text-4xl md:text-6xl py-6 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors font-bold text-slate-900"
                              placeholder="Your Company Name"
                          />
                          <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-600" size={48} strokeWidth={1.5} />
                      </div>

                      <div className="flex items-center gap-6 pt-8">
                          <button 
                              onClick={handleNext}
                              disabled={!formData.companyName}
                              className="group flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-slate-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-slate-200"
                          >
                              Start <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform"/>
                          </button>
                          <span className="text-slate-400 text-sm font-bold uppercase tracking-wide hidden md:block">
                              Press <strong>Enter ↵</strong>
                          </span>
                      </div>
                  </div>
              )}

              {/* STEP 2: ADMIN USER */}
              {step === 2 && (
                  <div className="space-y-12">
                      <div className="space-y-4">
                          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Who is the <br/>
                              <span className="text-indigo-600">Super Admin</span>?
                          </h1>
                          <p className="text-xl text-slate-500 font-medium">
                              You'll have full control over team permissions and AI agents.
                          </p>
                      </div>

                      <div className="space-y-8 max-w-2xl">
                          <div className="relative group">
                              <User className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={32} />
                              <input 
                                  ref={inputRef}
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  className="w-full bg-transparent text-2xl md:text-4xl py-4 pl-12 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold"
                                  placeholder="Full Name"
                              />
                          </div>
                          <div className="relative group">
                              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={32} />
                              <input 
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                  onKeyDown={handleKeyDown}
                                  type="email"
                                  className="w-full bg-transparent text-2xl md:text-4xl py-4 pl-12 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold"
                                  placeholder="Work Email"
                              />
                          </div>
                      </div>

                      <div className="flex items-center gap-6 pt-8">
                          <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-900 transition-colors text-lg font-bold">Back</button>
                          <button 
                              onClick={handleNext}
                              disabled={!formData.name || !formData.email}
                              className="group flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200"
                          >
                              Next Step <ChevronRight size={24} />
                          </button>
                      </div>
                  </div>
              )}

              {/* STEP 3: PASSWORD */}
              {step === 3 && (
                  <div className="space-y-12">
                      <div className="space-y-6">
                          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-2 border border-indigo-100">
                              <Zap className="text-indigo-600" size={32} fill="currentColor" />
                          </div>
                          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-slate-900">
                              Secure your <br/>
                              <span className="text-slate-900">Command Center</span>.
                          </h1>
                          <p className="text-xl text-slate-500 font-medium">
                              Set a password to protect your client data.
                          </p>
                      </div>

                      <div className="max-w-2xl relative group">
                          <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={32} />
                          <input 
                              ref={inputRef}
                              type="password"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent text-3xl md:text-5xl py-4 pl-12 border-b-2 border-slate-200 focus:border-indigo-600 outline-none placeholder:text-slate-300 transition-colors text-slate-900 font-bold tracking-widest"
                              placeholder="••••••••"
                          />
                      </div>

                      <div className="flex flex-col gap-8 max-w-md pt-4">
                          <div className="flex gap-6 text-sm text-slate-600 font-bold uppercase tracking-wide">
                              <div className="flex items-center gap-2"><Check size={18} className="text-emerald-500" strokeWidth={3}/> No Credit Card</div>
                              <div className="flex items-center gap-2"><Check size={18} className="text-emerald-500" strokeWidth={3}/> 7-Day Free Trial</div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-900 transition-colors text-lg font-bold">Back</button>
                              <button 
                                  onClick={handleRegister}
                                  disabled={!formData.password || loading}
                                  className="flex-1 bg-slate-900 text-white px-8 py-5 rounded-full text-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-300 flex items-center justify-center gap-3 disabled:opacity-70 hover:scale-105"
                              >
                                  {loading ? 'Creating Account...' : 'Launch Dashboard'} 
                                  {!loading && <ArrowRight size={24} />}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 w-full text-center z-20">
          <p className="text-slate-400 text-sm font-medium">
              Already have an account? 
              <button onClick={onSwitchToLogin} className="ml-2 text-indigo-600 hover:text-indigo-700 font-bold transition-colors">Log In</button>
          </p>
      </div>
    </div>
  );
};

export default TrialFunnel;