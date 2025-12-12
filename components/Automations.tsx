
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { AutomationRule, LeadStatus } from '../types';
import { Zap, Plus, Trash2, ArrowRight, CheckCircle, Circle, Briefcase, Mail, Bell } from 'lucide-react';

const Automations: React.FC = () => {
  const { automations, addAutomation, toggleAutomation, deleteAutomation } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
      name: '',
      triggerType: 'Status Change',
      triggerValue: LeadStatus.APPROVED,
      actionType: 'Create Task',
      actionConfig: { template: '' }
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRule.name) return;
      
      addAutomation({
          id: Date.now().toString(),
          name: newRule.name!,
          active: true,
          triggerType: newRule.triggerType as any,
          triggerValue: newRule.triggerValue as string,
          actionType: newRule.actionType as any,
          actionConfig: { template: newRule.actionConfig?.template || 'New Automation Action' }
      });
      setIsCreating(false);
      setNewRule({ name: '', triggerType: 'Status Change', triggerValue: LeadStatus.APPROVED, actionType: 'Create Task', actionConfig: { template: '' } });
  };

  const getActionIcon = (type: string) => {
      switch(type) {
          case 'Create Task': return <Briefcase size={16}/>;
          case 'Send Email': return <Mail size={16}/>;
          case 'Create Notification': return <Bell size={16}/>;
          default: return <Zap size={16}/>;
      }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Zap className="text-amber-500" fill="currentColor" /> Workflow Automation
            </h2>
            <p className="text-slate-500 text-sm">Automate repetitive tasks and communications.</p>
         </div>
         <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium shadow-sm"
         >
            <Plus size={18} /> New Workflow
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-auto content-start">
         {automations.map(rule => (
            <div key={rule.id} className={`bg-white p-6 rounded-xl border transition-all ${rule.active ? 'border-indigo-200 shadow-md' : 'border-slate-200 opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => toggleAutomation(rule.id)} className={`w-10 h-6 rounded-full transition-colors relative ${rule.active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rule.active ? 'left-5' : 'left-1'}`}></div>
                        </button>
                        <h3 className="font-bold text-slate-800">{rule.name}</h3>
                    </div>
                    <button onClick={() => deleteAutomation(rule.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">IF</span>
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Status is {rule.triggerValue}
                        </div>
                    </div>

                    <ArrowRight className="text-slate-300" size={24} />

                    <div className="flex-1 bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">THEN</span>
                        <div className="font-medium text-indigo-900 flex items-center gap-2">
                            {getActionIcon(rule.actionType)}
                            {rule.actionType}
                        </div>
                        <span className="text-xs text-indigo-600 italic">"{rule.actionConfig.template}"</span>
                    </div>
                </div>
            </div>
         ))}
         
         {automations.length === 0 && (
             <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                 <Zap className="mx-auto text-slate-300 mb-2" size={48} />
                 <p className="text-slate-500">No automations active. Create one to save time!</p>
             </div>
         )}
      </div>

      {isCreating && (
         <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg animate-fade-in">
                 <h3 className="text-xl font-bold text-slate-800 mb-6">Create New Workflow</h3>
                 <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Workflow Name</label>
                         <input 
                            required
                            value={newRule.name} 
                            onChange={e => setNewRule({...newRule, name: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="e.g. Production Alert"
                         />
                     </div>

                     <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                         <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                             <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs">IF</span> Trigger Event happens...
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Trigger Type</label>
                                <select className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm outline-none">
                                    <option>Status Change</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Status becomes...</label>
                                <select 
                                    value={newRule.triggerValue}
                                    onChange={e => setNewRule({...newRule, triggerValue: e.target.value})}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-md text-sm outline-none"
                                >
                                    {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                         </div>
                     </div>

                     <div className="flex justify-center">
                         <ArrowRight className="text-slate-300 rotate-90 lg:rotate-0" />
                     </div>

                     <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-4">
                         <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                             <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs">THEN</span> Perform this action...
                         </div>
                         <div>
                             <label className="block text-xs text-indigo-400 mb-1">Action Type</label>
                             <select 
                                value={newRule.actionType}
                                onChange={e => setNewRule({...newRule, actionType: e.target.value as any})}
                                className="w-full p-2 bg-white border border-indigo-200 rounded-md text-sm outline-none"
                             >
                                 <option value="Create Task">Create Task</option>
                                 <option value="Send Email">Send Email (Simulated)</option>
                                 <option value="Create Notification">System Notification</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs text-indigo-400 mb-1">Details (Task Name / Email Subject)</label>
                             <input 
                                value={newRule.actionConfig?.template}
                                onChange={e => setNewRule({...newRule, actionConfig: { ...newRule.actionConfig, template: e.target.value }})}
                                className="w-full p-2 bg-white border border-indigo-200 rounded-md text-sm outline-none"
                                placeholder="e.g. Send Welcome Packet"
                             />
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4">
                         <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                         <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Create Workflow</button>
                     </div>
                 </form>
             </div>
         </div>
      )}
    </div>
  );
};

export default Automations;
