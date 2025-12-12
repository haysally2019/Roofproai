import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Phone, Clock, MessageSquare, Play, Pause, User, AlertTriangle, CheckCircle, Mic, Activity } from 'lucide-react';
import { CallLog } from '../types';

const AIReceptionist: React.FC = () => {
  const { callLogs, companies, currentUser } = useStore();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get current company config
  const currentCompany = companies.find(c => c.id === currentUser?.companyId);
  const agentConfig = currentCompany?.agentConfig;

  // Stats
  const totalCalls = callLogs.length;
  const actionRequired = callLogs.filter(c => c.status === 'Action Required').length;
  const missedCalls = callLogs.filter(c => c.status === 'Missed').length;

  if (!agentConfig) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Mic size={48} className="opacity-20" />
              <h2 className="text-xl font-bold text-slate-700">AI Receptionist Not Configured</h2>
              <p className="max-w-md text-center text-sm">Your AI receptionist has not been set up by the Super Admin yet. Please contact support to enable voice automation.</p>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Mic className="text-indigo-600" />
              AI Receptionist
           </h2>
           <p className="text-slate-500 text-sm">Powered by ElevenLabs Conversational AI</p>
        </div>
        <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${agentConfig.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${agentConfig.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {agentConfig.isActive ? 'Agent Online' : 'Agent Offline'}
            </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Total Calls</p>
                 <Phone size={16} className="text-indigo-500"/>
             </div>
             <h3 className="text-2xl font-bold text-slate-800">{totalCalls}</h3>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Action Needed</p>
                 <AlertTriangle size={16} className="text-amber-500"/>
             </div>
             <h3 className="text-2xl font-bold text-slate-800">{actionRequired}</h3>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Missed/VM</p>
                 <Activity size={16} className="text-red-400"/>
             </div>
             <h3 className="text-2xl font-bold text-slate-800">{missedCalls}</h3>
         </div>
         <div className="bg-indigo-900 p-4 rounded-xl border border-indigo-800 shadow-sm text-white">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-xs font-bold text-indigo-300 uppercase">Est. Saved</p>
                 <Clock size={16} className="text-white"/>
             </div>
             <h3 className="text-2xl font-bold">{totalCalls * 5} mins</h3>
         </div>
      </div>

      {/* Main Content: Logs & Detail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
         
         {/* Call List */}
         <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 text-sm">
                 Recent Activity
             </div>
             <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                 {callLogs.map(log => (
                     <div 
                        key={log.id} 
                        onClick={() => setSelectedCall(log)}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedCall?.id === log.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                     >
                         <div className="flex justify-between items-start mb-1">
                             <h4 className="font-bold text-slate-800 text-sm">{log.callerName || 'Unknown Caller'}</h4>
                             <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                         </div>
                         <p className="text-xs text-slate-500 mb-2">{log.callerNumber}</p>
                         <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'Action Required' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                 {log.status}
                             </span>
                             <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                 <Clock size={10}/> {log.duration}
                             </span>
                         </div>
                     </div>
                 ))}
             </div>
         </div>

         {/* Call Details */}
         <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             {selectedCall ? (
                 <>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {selectedCall.callerName || 'Unknown Caller'}
                                <span className="text-sm font-normal text-slate-400">{selectedCall.callerNumber}</span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{new Date(selectedCall.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">
                                Call Back
                            </button>
                            <button className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50">
                                Archive
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {/* Audio Player */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
                            >
                                {isPlaying ? <Pause size={20}/> : <Play size={20} className="ml-1"/>}
                            </button>
                            <div className="flex-1">
                                <div className="h-1 bg-slate-200 rounded-full w-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-1/3"></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                    <span>0:14</span>
                                    <span>{selectedCall.duration}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">AI Summary</h4>
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-900 leading-relaxed">
                                {selectedCall.summary}
                            </div>
                        </div>

                        {/* Transcript */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Full Transcript</h4>
                            <div className="space-y-4">
                                {selectedCall.transcript.split('\n').map((line, i) => {
                                    const isAgent = line.startsWith('Agent:');
                                    return (
                                        <div key={i} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAgent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                                {isAgent ? <Mic size={14}/> : <User size={14}/>}
                                            </div>
                                            <div className={`p-3 rounded-xl text-sm max-w-[80%] ${isAgent ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                                {line.replace(/^(Agent:|Caller:)/, '').trim()}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                 </>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                     <MessageSquare size={48} className="mb-4 opacity-20"/>
                     <p className="font-medium">Select a call log to view details</p>
                 </div>
             )}
         </div>

      </div>
      
      {/* Mini Config Footer for Company Admin */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Mic size={20} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-800">Current Voice Agent</h4>
                  <p className="text-xs text-slate-500">Configured by Super Admin</p>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
             <span className="text-xs font-medium px-3 py-1 bg-white rounded shadow-sm text-slate-700">{agentConfig.name}</span>
             {/* PATCH: Added fallback for substring to prevent crash on undefined ID */}
             <span className="text-[10px] text-slate-400 px-2">ID: {(agentConfig.elevenLabsAgentId || '').substring(0,8)}...</span>
          </div>
      </div>
    </div>
  );
};

export default AIReceptionist;