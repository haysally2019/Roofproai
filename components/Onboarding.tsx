import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle, Zap, Loader2 } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentUser, companies, updateCompany, addToast } = useStore();
  const [phase, setPhase] = useState(0); 
  const [text, setText] = useState('Initializing workspace...');

  useEffect(() => {
      const runAutoSetup = async () => {
          if (!currentUser?.companyId) return;

          // Simulation of "Building" the CRM
          const steps = [
              "Creating database...",
              "Activating AI Estimator...",
              "Configuring Receptionist...",
              "Finalizing Setup..."
          ];

          for (let i = 0; i < steps.length; i++) {
              setText(steps[i]);
              setPhase(i);
              await new Promise(r => setTimeout(r, 800)); // Fast 800ms delays
          }

          // Real API Call to unlock dashboard
          try {
              await updateCompany({
                  id: currentUser.companyId,
                  setupComplete: true
              });
              addToast("Workspace Ready!", "success");
              // App.tsx will detect the change and unmount this component automatically
          } catch (e) {
              console.error(e);
              addToast("Error configuring workspace. Please refresh.", "error");
          }
      };

      runAutoSetup();
  }, [currentUser]);

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col items-center justify-center font-sans">
       
       <div className="relative w-32 h-32 mb-8">
           <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
           <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
               <Zap className="text-indigo-600 animate-pulse" size={40} fill="currentColor" />
           </div>
       </div>

       <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-900">
           Building your CRM
       </h2>
       
       <p className="text-lg text-slate-500 font-medium animate-pulse">
           {text}
       </p>

       <div className="mt-8 flex gap-2">
           {[0, 1, 2, 3].map(i => (
               <div key={i} className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${phase >= i ? 'bg-indigo-600' : 'bg-slate-100'}`} />
           ))}
       </div>

    </div>
  );
};

export default Onboarding;