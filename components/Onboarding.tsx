import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { ArrowRight, Check, MapPin, Phone, Loader2, Sparkles, Building, ChevronRight } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, companies, updateCompany, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Find the company created during the funnel
  const myCompany = companies.find(c => c.id === currentUser?.companyId);

  const [form, setForm] = useState({
     companyName: '',
     address: '',
     phone: '',
  });

  // Load existing data naturally
  useEffect(() => {
      if (myCompany) {
          setForm(prev => ({ 
              ...prev, 
              companyName: myCompany.name 
          }));
      }
  }, [myCompany]);

  // Smooth transition handler
  const nextStep = () => {
      setIsAnimating(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsAnimating(false);
      }, 300); // Wait for fade out
  };

  const handleFinish = async () => {
    if (currentUser?.companyId) {
        setSaving(true);
        try {
            await updateCompany({
                id: currentUser.companyId,
                name: form.companyName,
                address: form.address,
                phone: form.phone,
                setupComplete: true // This is the Key to unlock Dashboard
            });
            // Small delay to show the "Success" state before unmounting
            setTimeout(() => {
               addToast("Welcome to your new workspace!", "success");
            }, 500);
        } catch (error) {
            addToast('Connection error. Please try again.', 'error');
            setSaving(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
       {/* Background Subtle Elements */}
       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10"></div>
       <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
       <div className="absolute top-1/2 left-10 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

       {/* Top Bar */}
       <div className="w-full max-w-5xl mx-auto p-8 flex justify-between items-center z-20">
           <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg opacity-50">
               <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                   <Sparkles size={16} className="text-indigo-600" />
               </div>
               Altus Setup
           </div>
           <div className="text-sm font-medium text-slate-400">
               Step {step} of 3
           </div>
       </div>

       {/* Main Content Container */}
       <div className="flex-1 flex flex-col items-center justify-center z-20 px-6">
           <div className={`w-full max-w-2xl transition-all duration-500 ease-in-out transform ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
               
               {/* STEP 1: WELCOME / NAME CONFIRMATION */}
               {step === 1 && (
                   <div className="space-y-8">
                       <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                           Welcome to the future of roofing, <br/>
                           <span className="text-indigo-600">{currentUser?.name.split(' ')[0]}</span>.
                       </h1>
                       <p className="text-xl text-slate-500 font-light">
                           We have set up a secure workspace for <strong className="text-slate-800 font-semibold">{form.companyName}</strong>. 
                           Does the name look right?
                       </p>
                       
                       <div className="group relative max-w-lg">
                           <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                           <input 
                               autoFocus
                               value={form.companyName}
                               onChange={(e) => setForm({...form, companyName: e.target.value})}
                               className="w-full text-2xl p-6 pl-14 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none shadow-xl shadow-slate-100/50 transition-all font-medium text-slate-800"
                               placeholder="Company Name"
                           />
                       </div>

                       <div className="pt-4">
                           <button 
                               onClick={nextStep}
                               disabled={!form.companyName}
                               className="bg-indigo-600 text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                           >
                               Yes, that's us <ArrowRight size={20} />
                           </button>
                       </div>
                   </div>
               )}

               {/* STEP 2: LOCATION & CONTACT */}
               {step === 2 && (
                   <div className="space-y-8">
                       <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                           Where should we send your <br/> <span className="text-indigo-600">Smart Estimates</span>?
                       </h2>
                       <p className="text-lg text-slate-500">
                           Our AI uses your location to calculate material pricing and labor rates accurately.
                       </p>

                       <div className="space-y-4 max-w-xl">
                           <div className="group relative">
                               <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                               <input 
                                   autoFocus
                                   value={form.address}
                                   onChange={(e) => setForm({...form, address: e.target.value})}
                                   className="w-full text-xl p-5 pl-14 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none shadow-md shadow-slate-100/50 transition-all text-slate-800"
                                   placeholder="Business Address (e.g. 123 Main St)"
                               />
                           </div>
                           
                           <div className="group relative">
                               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                               <input 
                                   value={form.phone}
                                   onChange={(e) => setForm({...form, phone: e.target.value})}
                                   className="w-full text-xl p-5 pl-14 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none shadow-md shadow-slate-100/50 transition-all text-slate-800"
                                   placeholder="Office Phone"
                               />
                           </div>
                       </div>

                       <div className="pt-6 flex gap-4">
                           <button onClick={() => setStep(1)} className="px-6 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                               Back
                           </button>
                           <button 
                               onClick={nextStep}
                               disabled={!form.address}
                               className="bg-indigo-600 text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                           >
                               Continue <ChevronRight size={24} />
                           </button>
                       </div>
                   </div>
               )}

               {/* STEP 3: FINALIZATION */}
               {step === 3 && (
                   <div className="text-center space-y-8 max-w-xl mx-auto">
                       <div className="relative w-32 h-32 mx-auto">
                           <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
                           <div className="relative w-full h-full bg-white border-4 border-emerald-100 rounded-full flex items-center justify-center shadow-xl">
                               {saving ? (
                                   <Loader2 className="text-indigo-600 animate-spin" size={48} />
                               ) : (
                                   <Check className="text-emerald-500" size={64} strokeWidth={3} />
                               )}
                           </div>
                       </div>

                       <div>
                           <h2 className="text-3xl font-bold text-slate-900 mb-2">
                               {saving ? 'Creating your workspace...' : 'You are all set!'}
                           </h2>
                           <p className="text-slate-500 text-lg">
                               {saving 
                                   ? 'We are configuring your AI assistant and price books.' 
                                   : 'Your 7-day free trial starts now. No credit card needed.'}
                           </p>
                       </div>

                       {!saving && (
                           <button 
                               onClick={handleFinish}
                               className="bg-slate-900 text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 w-full"
                           >
                               Enter Dashboard <ArrowRight size={24} />
                           </button>
                       )}
                   </div>
               )}

           </div>
       </div>

       {/* Bottom Progress Line */}
       <div className="w-full bg-slate-100 h-1 mt-auto">
           <div 
               className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ease-out" 
               style={{ width: `${(step / 3) * 100}%` }}
           ></div>
       </div>
    </div>
  );
};

export default Onboarding;