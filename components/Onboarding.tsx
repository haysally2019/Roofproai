import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { ArrowRight, MapPin, Phone, Building, CheckCircle, Sparkles, Zap, ChevronRight } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, companies, updateCompany, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Configuration State
  const [setupPhase, setSetupPhase] = useState(0); // 0: Init, 1: AI, 2: Database, 3: Done

  // Data State
  const myCompany = companies.find(c => c.id === currentUser?.companyId);
  const [form, setForm] = useState({
     companyName: '',
     address: '',
     phone: '',
  });

  // Load existing data if available
  useEffect(() => {
      if (myCompany) {
          setForm(prev => ({ ...prev, companyName: myCompany.name }));
      }
  }, [myCompany]);

  // Handle Step Transitions
  const nextStep = () => {
      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
          if (step === 2) startConfigurationSequence();
      }, 400);
  };

  // Simulate "AI Building the System"
  const startConfigurationSequence = () => {
      const phases = [
          "Initializing your AI Receptionist...",
          "Generating local price book for " + (form.address.split(',')[1] || "your area") + "...",
          "Configuring material templates...",
          "Finalizing workspace..."
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
              setSetupPhase(3); // Done
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
            addToast("Workspace Ready", "success");
        } catch (error) {
            console.error(error);
            addToast("Connection issue, please refresh.", "error");
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
       
       {/* Ambient Background */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
       </div>

       {/* Content Container */}
       <div className={`relative z-10 w-full max-w-3xl px-6 transition-all duration-500 ease-out ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
           
           {/* STEP 1: IDENTITY */}
           {step === 1 && (
               <div className="space-y-12">
                   <div className="space-y-4">
                       <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide">
                           <Sparkles size={12} /> SETUP WIZARD
                       </div>
                       <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                           Let's set up <br/>
                           <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                               {form.companyName || 'your company'}
                           </span>.
                       </h1>
                       <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
                           We're creating a dedicated AI environment for your team. Just confirm a few details to get started.
                       </p>
                   </div>

                   <div className="space-y-8">
                       <div className="group">
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Company Name</label>
                           <div className="relative flex items-center">
                               <Building className="absolute left-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={24} />
                               <input 
                                   autoFocus
                                   value={form.companyName}
                                   onChange={e => setForm({...form, companyName: e.target.value})}
                                   className="w-full bg-transparent border-b-2 border-slate-800 text-3xl md:text-4xl py-4 pl-14 text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                                   placeholder="Type name..."
                               />
                           </div>
                       </div>
                   </div>

                   <div className="pt-8">
                       <button 
                           onClick={nextStep}
                           disabled={!form.companyName}
                           className="group flex items-center gap-4 text-xl font-medium text-white hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           Next Step 
                           <span className="w-12 h-12 rounded-full bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center transition-all group-hover:scale-110">
                               <ArrowRight size={24} />
                           </span>
                       </button>
                   </div>
               </div>
           )}

           {/* STEP 2: LOCALIZATION */}
           {step === 2 && (
               <div className="space-y-12">
                   <div className="space-y-4">
                       <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium tracking-wide">
                           <MapPin size={12} /> LOCALIZATION
                       </div>
                       <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                           Where do you operate?
                       </h1>
                       <p className="text-lg text-slate-400 max-w-xl">
                           Altus uses your location to automatically pull local material prices, labor rates, and building codes.
                       </p>
                   </div>

                   <div className="space-y-10 max-w-xl">
                       <div className="group">
                           <div className="relative flex items-center">
                               <MapPin className="absolute left-0 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={28} />
                               <input 
                                   autoFocus
                                   value={form.address}
                                   onChange={e => setForm({...form, address: e.target.value})}
                                   className="w-full bg-transparent border-b border-slate-700 text-2xl py-4 pl-12 text-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-700"
                                   placeholder="Business Address"
                               />
                           </div>
                       </div>

                       <div className="group">
                           <div className="relative flex items-center">
                               <Phone className="absolute left-0 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={28} />
                               <input 
                                   value={form.phone}
                                   onChange={e => setForm({...form, phone: e.target.value})}
                                   className="w-full bg-transparent border-b border-slate-700 text-2xl py-4 pl-12 text-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-700"
                                   placeholder="Main Office Phone"
                               />
                           </div>
                       </div>
                   </div>

                   <div className="pt-8 flex items-center gap-8">
                       <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors">Back</button>
                       <button 
                           onClick={nextStep}
                           disabled={!form.address}
                           className="group flex items-center gap-4 text-xl font-medium text-white hover:text-blue-300 transition-colors disabled:opacity-50"
                       >
                           Launch System
                           <span className="w-12 h-12 rounded-full bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center transition-all group-hover:scale-110">
                               <ChevronRight size={24} />
                           </span>
                       </button>
                   </div>
               </div>
           )}

           {/* STEP 3: CONFIGURATION (THE MAGIC) */}
           {step === 3 && (
               <div className="text-center space-y-10">
                   
                   {/* Animation Container */}
                   <div className="relative w-40 h-40 mx-auto">
                       {setupPhase < 3 ? (
                           <>
                               <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                               <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 animate-spin"></div>
                               <div className="absolute inset-0 flex items-center justify-center">
                                   <Zap className="text-indigo-500 animate-pulse" size={48} fill="currentColor" />
                               </div>
                           </>
                       ) : (
                           <div className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center animate-scale-in">
                               <CheckCircle className="text-white" size={64} />
                           </div>
                       )}
                   </div>

                   <div className="space-y-4">
                       <h2 className="text-3xl font-bold text-white">
                           {setupPhase < 3 ? 'Building Workspace...' : 'You are all set!'}
                       </h2>
                       <div className="h-8">
                           {setupPhase < 3 && (
                               <p className="text-indigo-300 font-mono text-sm animate-pulse">
                                   {`> ${loadingText}`}
                               </p>
                           )}
                           {setupPhase === 3 && (
                               <p className="text-slate-400">
                                   Your 7-day free trial has officially started.
                               </p>
                           )}
                       </div>
                   </div>

                   {setupPhase === 3 && (
                       <div className="pt-8 animate-fade-in-up">
                           <button 
                               onClick={() => window.location.reload()} 
                               className="px-10 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg shadow-white/10 flex items-center gap-2 mx-auto"
                           >
                               Enter Dashboard <ArrowRight size={20} />
                           </button>
                       </div>
                   )}
               </div>
           )}

       </div>

       {/* Simple Progress Dots */}
       <div className="absolute bottom-10 left-0 w-full flex justify-center gap-3">
           {[1, 2, 3].map(s => (
               <div 
                   key={s} 
                   className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-8 bg-indigo-500' : 'w-1.5 bg-slate-800'}`}
               />
           ))}
       </div>

    </div>
  );
};

export default Onboarding;