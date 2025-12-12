
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Building2, ArrowRight, Check, Users, Shield } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, updateCompany, updateUser } = useStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
     companyName: '',
     address: '',
     phone: '',
     role: currentUser?.role || ''
  });

  const handleNext = () => {
    if (step === 3) {
        // Complete
        if (currentUser?.companyId) {
            updateCompany({
                id: currentUser.companyId,
                name: form.companyName,
                address: form.address,
                phone: form.phone,
                setupComplete: true
            });
        }
        updateUser({ role: 'Company Owner' as any }); // Force role update if needed
    } else {
        setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 w-full">
             <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(step/3)*100}%` }}></div>
          </div>

          <div className="p-8 md:p-12 flex-1">
             
             {step === 1 && (
                <div className="animate-fade-in space-y-6">
                   <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                      <Building2 size={32} />
                   </div>
                   <h1 className="text-3xl font-bold text-slate-900">Welcome to RoofPro</h1>
                   <p className="text-slate-500 text-lg">Let's set up your company workspace. What should we call your organization?</p>
                   
                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                         <input 
                            autoFocus
                            value={form.companyName}
                            onChange={(e) => setForm({...form, companyName: e.target.value})}
                            className="w-full text-lg p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Apex Roofing & Restoration"
                         />
                      </div>
                   </div>
                </div>
             )}

             {step === 2 && (
                <div className="animate-fade-in space-y-6">
                   <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6">
                      <Shield size={32} />
                   </div>
                   <h1 className="text-3xl font-bold text-slate-900">Contact Details</h1>
                   <p className="text-slate-500 text-lg">Where are you located? This will appear on your automated estimates and invoices.</p>
                   
                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                         <input 
                            value={form.address}
                            onChange={(e) => setForm({...form, address: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="123 Builder Lane"
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Office Phone</label>
                         <input 
                            value={form.phone}
                            onChange={(e) => setForm({...form, phone: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="(555) 123-4567"
                         />
                      </div>
                   </div>
                </div>
             )}

             {step === 3 && (
                <div className="animate-fade-in space-y-6 text-center">
                   <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                      <Check size={40} />
                   </div>
                   <h1 className="text-3xl font-bold text-slate-900">All Set!</h1>
                   <p className="text-slate-500 text-lg">Your workspace is ready. You can now invite your team, add leads, and start estimating.</p>
                   
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left mt-6">
                      <h3 className="font-bold text-slate-800 mb-2">Next Steps:</h3>
                      <ul className="space-y-2 text-slate-600">
                         <li className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</div> Import your existing leads</li>
                         <li className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</div> Set up your price book</li>
                         <li className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</div> Connect your email</li>
                      </ul>
                   </div>
                </div>
             )}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end">
             <button 
                onClick={handleNext}
                disabled={step === 1 && !form.companyName}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
             >
                {step === 3 ? 'Go to Dashboard' : 'Continue'} <ArrowRight size={20} />
             </button>
          </div>
       </div>
    </div>
  );
};

export default Onboarding;
