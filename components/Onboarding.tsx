import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { ArrowRight, Check, MapPin, Phone, Building2, Sparkles, ChevronRight, Command } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, companies, updateCompany, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Magic Loading State
  const [setupPhase, setSetupPhase] = useState(0); 
  const [loadingText, setLoadingText] = useState('');

  // Data State
  const myCompany = companies.find(c => c.id === currentUser?.companyId);
  const [form, setForm] = useState({
     companyName: '',
     address: '',
     phone: '',
  });

  // Auto-focus refs
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (myCompany) {
          setForm(prev => ({ ...prev, companyName: myCompany.name }));
      }
  }, [myCompany]);

  // Focus input on step change
  useEffect(() => {
      if (!isAnimating && setupPhase === 0) {
          setTimeout(() => inputRef.current?.focus(), 100);
      }
  }, [step, isAnimating, setupPhase]);

  const nextStep = () => {
      if (step === 1 && !form.companyName) return;
      if (step === 2 && (!form.address || !form.phone)) return;

      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
          if (step === 2) startConfigurationSequence();
      }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          nextStep();
      }
  };

  const startConfigurationSequence = () => {
      const phases = [
          "Analyzing local market rates...",
          "Calibrating material price list...",
          "Provisioning AI Receptionist...",
          "Securing workspace..."
      ];

      let current = 0;
      setSetupPhase(1);
      setLoadingText(phases[0]);

      const interval = setInterval(() => {
          current++;
          if (current < phases.length) {
              setLoadingText(phases[current]);
          } else {
              clearInterval(interval);
              setSetupPhase(3); 
              handleFinalSave();
          }
      }, 1500);
  };

  const handleFinalSave = async () => {
    if (currentUser?.companyId) {
        try {
            await updateCompany({
                id: currentUser.companyId,
                name: form.companyName,
                address: form.address,
                phone: form.phone,
                setupComplete: true
            });
            addToast("Setup Complete", "success");
        } catch (error) {
            console.error(error);
        }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden relative">
       
       {/* --- Ambient Background Effects --- */}
       <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{animationDuration: '8s'}}></div>
       <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{animationDuration: '10s'}}></div>
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

       {/* --- Top Progress --- */}
       <div className="fixed top-0 left-0 w-full z-50 p-8 flex justify-between items-center">
           <div className="flex items-center gap-2 font-bold tracking-tight text-slate-400">
               <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                   <Sparkles size={14} className="text-indigo-400" />
               </div>
               <span className="opacity-50">Altus AI Setup</span>
           </div>
           <div className="flex gap-2">
               {[1, 2, 3].map(s => (
                   <div key={s} className={`h-1 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500' : 'bg-white/10'}`} />
               ))}
           </div>
       </div>

       {/* --- Main Stage --- */}
       <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto px-6">
           <div className={`w-full transition-all duration-700 ease-out transform ${isAnimating ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
               
               {/* STEP 1: IDENTITY */}
               {step === 1 && (
                   <div className="space-y-12">
                       <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                           Let's start with the basics. <br/>
                           <span className="text-slate-500">What is your company name?</span>
                       </h1>
                       
                       <div className="relative group">
                           <input 
                               ref={inputRef}
                               value={form.companyName}
                               onChange={e => setForm({...form, companyName: e.target.value})}
                               onKeyDown={handleKeyDown}
                               className="w-full bg-transparent text-4xl md:text-6xl py-6 border-b-2 border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors font-medium text-white"
                               placeholder="Type name here..."
                           />
                           <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 transition-colors group-focus-within:text-indigo-500" size={48} strokeWidth={1.5} />
                       </div>

                       <div className="flex items-center gap-4 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                           <button 
                               onClick={nextStep}
                               disabled={!form.companyName}
                               className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                           >
                               Continue <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform"/>
                           </button>
                           <span className="text-slate-500 text-sm font-medium flex items-center gap-1 ml-4 hidden md:flex">
                               Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Enter ↵</kbd>
                           </span>
                       </div>
                   </div>
               )}

               {/* STEP 2: DETAILS */}
               {step === 2 && (
                   <div className="space-y-12">
                       <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                           Where is <span className="text-indigo-400">{form.companyName}</span> located?
                           <br/><span className="text-slate-500 text-2xl md:text-3xl font-normal block mt-4">We use this to pull local building codes & pricing.</span>
                       </h1>
                       
                       <div className="space-y-8 max-w-2xl">
                           <div className="relative group">
                               <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={32} />
                               <input 
                                   ref={inputRef}
                                   value={form.address}
                                   onChange={e => setForm({...form, address: e.target.value})}
                                   className="w-full bg-transparent text-2xl md:text-3xl py-4 pl-12 border-b border-slate-800 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors text-white"
                                   placeholder="Business Address..."
                               />
                           </div>

                           <div className="relative group">
                               <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={32} />
                               <input 
                                   value={form.phone}
                                   onChange={e => setForm({...form, phone: e.target.value})}
                                   onKeyDown={handleKeyDown}
                                   className="w-full bg-transparent text-2xl md:text-3xl py-4 pl-12 border-b border-slate-800 focus:border-indigo-500 outline-none placeholder:text-slate-800 transition-colors text-white"
                                   placeholder="Office Phone..."
                               />
                           </div>
                       </div>

                       <div className="flex items-center gap-4 animate-fade-in-up">
                           <button 
                               onClick={nextStep}
                               disabled={!form.address || !form.phone}
                               className="group flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-full text-xl font-bold hover:bg-indigo-500 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
                           >
                               Launch Workspace <ChevronRight size={24} />
                           </button>
                       </div>
                   </div>
               )}

               {/* STEP 3: THE BUILDER (Magic Moment) */}
               {step === 3 && (
                   <div className="flex flex-col items-center justify-center text-center space-y-12">
                       
                       {/* Loader Animation */}
                       <div className="relative w-32 h-32">
                           {setupPhase < 3 ? (
                               <>
                                   <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" style={{animationDuration: '1s'}}></div>
                                   <div className="absolute inset-2 border-r-2 border-purple-500 rounded-full animate-spin" style={{animationDuration: '1.5s'}}></div>
                                   <div className="absolute inset-4 border-b-2 border-blue-500 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                       <Sparkles className="text-white animate-pulse" size={40} />
                                   </div>
                               </>
                           ) : (
                               <div className="w-full h-full bg-emerald-500 rounded-full flex items-center justify-center animate-[scale-in_0.4s_ease-out]">
                                   <Check className="text-white w-16 h-16" strokeWidth={3} />
                               </div>
                           )}
                       </div>

                       {/* Status Text */}
                       <div className="space-y-4">
                           <h2 className="text-4xl md:text-5xl font-bold">
                               {setupPhase < 3 ? 'Building System...' : 'Ready for Takeoff'}
                           </h2>
                           <div className="h-8 flex items-center justify-center">
                               {setupPhase < 3 ? (
                                   <p className="text-indigo-400 font-mono text-lg animate-pulse flex items-center gap-2">
                                       <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                       {loadingText}
                                   </p>
                               ) : (
                                   <p className="text-slate-400 text-xl">Your environment has been successfully provisioned.</p>
                               )}
                           </div>
                       </div>

                       {/* Success Action */}
                       {setupPhase === 3 && (
                           <div className="animate-[fade-in-up_0.5s_ease-out]">
                               <button 
                                   onClick={() => window.location.reload()} 
                                   className="px-12 py-5 bg-white text-black rounded-2xl font-bold text-xl hover:bg-slate-200 transition-all flex items-center gap-3 shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)]"
                               >
                                   Enter Dashboard <ArrowRight size={24} />
                               </button>
                           </div>
                       )}
                   </div>
               )}

           </div>
       </div>
    </div>
  );
};

export default Onboarding;