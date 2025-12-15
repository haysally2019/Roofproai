import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { ArrowRight, CheckCircle, Zap, Sparkles, Command } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, companies, updateCompany, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [setupPhase, setSetupPhase] = useState(0); 

  const myCompany = companies.find(c => c.id === currentUser?.companyId);
  const [form, setForm] = useState({
     companyName: '',
     address: '',
     phone: '',
  });

  useEffect(() => {
      if (myCompany) {
          setForm(prev => ({ ...prev, companyName: myCompany.name }));
      }
  }, [myCompany]);

  const nextStep = () => {
      if (step === 1 && !form.companyName) return;
      if (step === 2 && (!form.address || !form.phone)) return;

      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
          if (step === 2) startConfigurationSequence();
      }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          nextStep();
      }
  };

  const startConfigurationSequence = () => {
      const phases = [
          "Analyzing local market data...",
          "Building material price list for " + (form.address.split(',')[1] || "your region") + "...",
          "Configuring AI Receptionist scripts...",
          "Finalizing secure workspace..."
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
      }, 1200);
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
            addToast("Workspace Ready", "success");
        } catch (error) {
            console.error(error);
            addToast("Connection issue, please refresh.", "error");
        }
    }
  };

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-100 overflow-hidden">
       
       {/* Minimal Header */}
       <header className="w-full p-8 flex justify-between items-center shrink-0 z-20">
           <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-tight">
               <Sparkles size={18} /> Altus AI
           </div>
           <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
               Setup {step}/3
           </div>
       </header>

       {/* Progress Bar (Top) */}
       <div className="w-full h-1 bg-slate-100 shrink-0">
           <div className="h-full bg-indigo-600 transition-all duration-700 ease-out" style={{ width: `${(step/3)*100}%` }}></div>
       </div>

       {/* Main Stage */}
       <main className="flex-1 flex flex-col justify-center items-center max-w-3xl mx-auto w-full px-6 relative z-10">
           
           <div className={`w-full transition-all duration-500 ease-in-out transform ${isAnimating ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
               
               {/* STEP 1: COMPANY NAME */}
               {step === 1 && (
                   <div className="space-y-10">
                       <div className="space-y-4">
                           <span className="text-indigo-600 font-bold text-sm tracking-wide flex items-center gap-2">
                               <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs">1</span> 
                               WELCOME
                           </span>
                           <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                               Let’s confirm. <br/> What is your <span className="text-indigo-600">company name</span>?
                           </h1>
                       </div>

                       <div className="relative">
                           <input 
                               autoFocus
                               value={form.companyName}
                               onChange={e => setForm({...form, companyName: e.target.value})}
                               onKeyDown={handleKeyDown}
                               className="w-full bg-transparent text-3xl md:text-5xl border-b-2 border-slate-200 focus:border-indigo-600 py-4 outline-none text-slate-800 placeholder:text-slate-300 transition-colors font-bold"
                               placeholder="Type your company name..."
                           />
                           <p className="mt-4 text-slate-400 text-sm flex items-center gap-1 font-medium">
                               <Command size={14} /> Press <strong>Enter</strong> to continue
                           </p>
                       </div>

                       <div className="pt-8">
                           <button 
                               onClick={nextStep}
                               disabled={!form.companyName}
                               className="group flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                           >
                               OK <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                           </button>
                       </div>
                   </div>
               )}

               {/* STEP 2: DETAILS */}
               {step === 2 && (
                   <div className="space-y-10">
                       <div className="space-y-4">
                           <span className="text-blue-600 font-bold text-sm tracking-wide flex items-center gap-2">
                               <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">2</span> 
                               DETAILS
                           </span>
                           <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                               Where is <strong>{form.companyName}</strong> located?
                           </h1>
                           <p className="text-xl text-slate-500 max-w-xl font-medium">
                               We use this to pull local building codes and material pricing.
                           </p>
                       </div>

                       <div className="space-y-8 max-w-xl">
                           <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Address</label>
                               <input 
                                   autoFocus
                                   value={form.address}
                                   onChange={e => setForm({...form, address: e.target.value})}
                                   className="w-full bg-transparent text-2xl font-bold border-b-2 border-slate-200 focus:border-blue-500 py-3 outline-none text-slate-800 placeholder:text-slate-300 transition-colors"
                                   placeholder="e.g. 123 Main St, Austin, TX"
                               />
                           </div>

                           <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Office Phone</label>
                               <input 
                                   value={form.phone}
                                   onChange={e => setForm({...form, phone: e.target.value})}
                                   onKeyDown={handleKeyDown}
                                   className="w-full bg-transparent text-2xl font-bold border-b-2 border-slate-200 focus:border-blue-500 py-3 outline-none text-slate-800 placeholder:text-slate-300 transition-colors"
                                   placeholder="(555) 123-4567"
                               />
                           </div>
                       </div>

                       <div className="pt-8 flex items-center gap-6">
                           <button 
                               onClick={nextStep}
                               disabled={!form.address || !form.phone}
                               className="group flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                           >
                               Complete Setup <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                           </button>
                           <p className="text-slate-400 text-sm flex items-center gap-1 font-medium">
                               or press <strong>Enter</strong>
                           </p>
                       </div>
                   </div>
               )}

               {/* STEP 3: LOADING / SUCCESS */}
               {step === 3 && (
                   <div className="text-center space-y-8">
                       <div className="relative mx-auto w-24 h-24">
                           {setupPhase < 3 ? (
                               <div className="absolute inset-0 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                           ) : (
                               <div className="absolute inset-0 bg-emerald-100 rounded-full flex items-center justify-center animate-scale-in">
                                   <CheckCircle className="text-emerald-600" size={48} />
                               </div>
                           )}
                           <div className="absolute inset-0 flex items-center justify-center">
                               {setupPhase < 3 && <Zap className="text-indigo-600 animate-pulse" size={32} />}
                           </div>
                       </div>

                       <div className="space-y-4">
                           <h2 className="text-3xl font-extrabold text-slate-900">
                               {setupPhase < 3 ? 'Building your workspace...' : 'You are all set!'}
                           </h2>
                           <p className="text-xl text-slate-500 h-8 font-medium">
                               {setupPhase < 3 ? loadingText : 'Redirecting you to the dashboard...'}
                           </p>
                       </div>

                       {setupPhase === 3 && (
                           <div className="animate-fade-in-up">
                               <button 
                                   onClick={() => window.location.reload()} 
                                   className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2 mx-auto"
                               >
                                   Go to Dashboard <ArrowRight size={20} />
                               </button>
                           </div>
                       )}
                   </div>
               )}

           </div>
       </main>
    </div>
  );
};

export default Onboarding;