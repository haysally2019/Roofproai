
import React, { useState, useRef } from 'react';
import { Lead, LeadStatus, LeadDocument, ProductionStep, LogicArgument, Company } from '../types';
import {
  X, MapPin, Phone, Mail, Shield, Briefcase, FileText, Image as ImageIcon,
  CheckSquare, Calendar, DollarSign, Upload, MoreVertical, Hammer, AlertTriangle,
  BrainCircuit, ArrowRight, Send, MessageSquare, Clock, Download, Package, ListChecks,
  Receipt, ClipboardList, Ruler
} from 'lucide-react';
import { analyzeScopeOfLoss, generateSupplementArgument, draftClientEmail } from '../services/geminiService';
import { EstimateTemplate } from './EstimateTemplate';
import { generateEstimatePDF } from '../lib/pdfGenerator';
import { useStore } from '../lib/store';

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDraftEmail: (lead: Lead) => void;
}

const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({ lead, onClose, onUpdate, onDraftEmail }) => {
  const { companies, currentUser, addToast, proposals, measurements, orders, tasks, events, invoices } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'claim' | 'intelligence' | 'production' | 'financials' | 'communication' | 'proposals' | 'measurements' | 'materials' | 'tasks' | 'calendar'>('overview');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>(lead);

  // Claim Analysis State
  const [scopeText, setScopeText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Supplement Strategist State
  const [denialItem, setDenialItem] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [argument, setArgument] = useState<LogicArgument | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Email Drafting State
  const [emailTopic, setEmailTopic] = useState('');
  const [emailTone, setEmailTone] = useState<'professional' | 'friendly' | 'urgent'>('professional');
  const [emailDraftContent, setEmailDraftContent] = useState('');
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);

  // PDF Generation State
  const [downloadingEstimateId, setDownloadingEstimateId] = useState<string | null>(null);
  const pdfTemplateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleSave = () => {
    onUpdate({ ...lead, ...editData } as Lead);
    setEditMode(false);
  };

  const handleConvertLead = () => {
      onUpdate({ 
          ...lead, 
          status: LeadStatus.CLAIM_FILED, 
          projectType: 'Insurance',
          productionSteps: [
                {id: '1', name: 'Sign Contingency', status: 'Pending'},
                {id: '2', name: 'Adjuster Meeting', status: 'Pending'},
                {id: '3', name: 'Insurance Scope', status: 'Pending'},
                {id: '4', name: 'Order Materials', status: 'Pending'},
                {id: '5', name: 'Build Day', status: 'Pending'},
                {id: '6', name: 'Final Payment', status: 'Pending'}
          ]
      });
  };

  const handleFileUpload = () => {
    // Mock file upload
    const newDoc: LeadDocument = {
      id: Date.now().toString(),
      name: `Site_Photo_${Math.floor(Math.random()*100)}.jpg`,
      type: 'Photo',
      uploadedAt: new Date().toLocaleDateString()
    };
    const updatedDocs = [...(lead.documents || []), newDoc];
    onUpdate({ ...lead, documents: updatedDocs });
  };

  const toggleProductionStep = (stepId: string) => {
    const steps = lead.productionSteps || [];
    const updatedSteps = steps.map(s => 
      s.id === stepId 
        ? { ...s, status: s.status === 'Completed' ? 'Pending' : 'Completed' } 
        : s
    );
    onUpdate({ ...lead, productionSteps: updatedSteps as ProductionStep[] });
  };

  const runScopeAnalysis = async () => {
    if(!scopeText) return;
    setIsAnalyzing(true);
    const result = await analyzeScopeOfLoss(scopeText);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const runSupplementStrategy = async () => {
    if(!denialItem || !denialReason) return;
    setIsThinking(true);
    setArgument(null);
    const result = await generateSupplementArgument(denialReason, denialItem);
    setArgument(result);
    setIsThinking(false);
  };

  const handleGenerateEmail = async () => {
    if (!emailTopic) return;
    setIsDraftingEmail(true);
    const draft = await draftClientEmail(lead.name, emailTopic, emailTone);
    setEmailDraftContent(draft);
    setIsDraftingEmail(false);
  };

  const handleDownloadEstimate = async (estimateId: string) => {
    const estimate = lead.estimates?.find(e => e.id === estimateId);
    if (!estimate) return;

    const company = companies.find(c => c.id === currentUser?.companyId);
    if (!company) {
      addToast("Company information not found", "error");
      return;
    }

    setDownloadingEstimateId(estimateId);
    try {
      const templateElement = pdfTemplateRefs.current[estimateId];
      if (templateElement) {
        const fileName = `${estimate.name?.replace(/\s+/g, '_') || 'Estimate'}_${lead.name.replace(/\s+/g, '_')}.pdf`;
        await generateEstimatePDF(templateElement, fileName);
        addToast("PDF downloaded successfully", "success");
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      addToast("Failed to generate PDF", "error");
    } finally {
      setDownloadingEstimateId(null);
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap">{status}</span>;
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white w-full md:max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* HEADER */}
        <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start sticky top-0 z-10">
          <div className="flex gap-3 md:gap-4 overflow-hidden">
             <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm shrink-0">
                {lead.name.substring(0,2).toUpperCase()}
             </div>
             <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{lead.name}</h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm text-slate-500 mt-1">
                   <span className="flex items-center gap-1 truncate max-w-[150px]"><MapPin size={14}/> {lead.address}</span>
                   {getStatusBadge(lead.status)}
                </div>
             </div>
          </div>
          <div className="flex gap-1 md:gap-2 items-center">
            {(lead.status === LeadStatus.NEW || lead.status === LeadStatus.INSPECTION) && (
                <button 
                    onClick={handleConvertLead}
                    className="hidden md:block mr-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                    Convert to Claim
                </button>
            )}
            <button onClick={() => onDraftEmail(lead)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200" title="Quick Draft">
                <Mail size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* MOBILE CONVERT BUTTON */}
        {(lead.status === LeadStatus.NEW || lead.status === LeadStatus.INSPECTION) && (
             <div className="md:hidden p-2 bg-white border-b border-slate-100">
                 <button 
                    onClick={handleConvertLead}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm"
                >
                    Convert to Claim
                </button>
             </div>
        )}

        {/* TABS - Scrollable on mobile */}
        <div className="px-4 md:px-6 border-b border-slate-200 flex gap-6 overflow-x-auto no-scrollbar bg-white shrink-0">
           {[
             {id: 'overview', label: 'Overview', icon: FileText},
             {id: 'proposals', label: 'Proposals', icon: ClipboardList},
             {id: 'measurements', label: 'Measurements', icon: Ruler},
             {id: 'docs', label: 'Photos', icon: ImageIcon},
             {id: 'materials', label: 'Materials', icon: Package},
             {id: 'tasks', label: 'Tasks', icon: ListChecks},
             {id: 'calendar', label: 'Events', icon: Calendar},
             {id: 'communication', label: 'Comm', icon: MessageSquare},
             {id: 'claim', label: 'Claim', icon: Shield},
             {id: 'intelligence', label: 'Intelligence', icon: BrainCircuit},
             {id: 'production', label: 'Production', icon: Hammer},
             {id: 'financials', label: 'Financials', icon: DollarSign},
           ].map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
                <tab.icon size={16}/> {tab.label}
             </button>
           ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 custom-scrollbar pb-24 md:pb-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Client Details</h3>
                 {editMode ? (
                   <div className="flex gap-2">
                     <button
                       onClick={() => { setEditMode(false); setEditData(lead); }}
                       className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={handleSave}
                       className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                     >
                       Save Changes
                     </button>
                   </div>
                 ) : (
                   <button
                     onClick={() => setEditMode(true)}
                     className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                   >
                     Edit Details
                   </button>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <label className="text-xs text-slate-400 font-medium uppercase">Phone</label>
                      {editMode ? (
                        <input className="w-full mt-1 p-1 border rounded" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                      ) : (
                        <p className="font-medium text-slate-800 flex items-center gap-2 mt-1"><Phone size={14} className="text-slate-400"/> {lead.phone}</p>
                      )}
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <label className="text-xs text-slate-400 font-medium uppercase">Email</label>
                      {editMode ? (
                        <input className="w-full mt-1 p-1 border rounded" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                      ) : (
                        <p className="font-medium text-slate-800 flex items-center gap-2 mt-1"><Mail size={14} className="text-slate-400"/> {lead.email || 'No email'}</p>
                      )}
                  </div>
                  <div className="col-span-1 md:col-span-2 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <label className="text-xs text-slate-400 font-medium uppercase">Notes</label>
                      {editMode ? (
                        <textarea className="w-full mt-1 p-1 border rounded h-20" value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} />
                      ) : (
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{lead.notes || 'No notes added.'}</p>
                      )}
                  </div>
              </div>

              {/* ACTIVITY LOG (New Feature) */}
              <div className="mt-8">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Activity Timeline</h3>
                   <div className="relative border-l border-slate-200 ml-3 space-y-6">
                        {lead.history && lead.history.length > 0 ? (
                            lead.history.map(activity => (
                                <div key={activity.id} className="relative pl-6">
                                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm"></div>
                                    <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{activity.user}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="pl-6 text-sm text-slate-400 italic">No activity recorded yet.</div>
                        )}
                   </div>
              </div>
            </div>
          )}

          {/* COMMUNICATION TAB */}
          {activeTab === 'communication' && (
             <div className="space-y-6">
                 <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                     <Mail className="text-indigo-600 mt-1" size={20} />
                     <div>
                        <h3 className="font-bold text-indigo-900 text-sm">AI Email Composer</h3>
                        <p className="text-xs text-indigo-700">Draft professional client communications in seconds using Gemini.</p>
                     </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Topic</label>
                            <input 
                                value={emailTopic}
                                onChange={(e) => setEmailTopic(e.target.value)}
                                placeholder="e.g. Schedule Adjuster Meeting"
                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['Inspection Reminder', 'Claim Update', 'Estimate Ready', 'Follow Up'].map(topic => (
                                    <button 
                                        key={topic}
                                        onClick={() => setEmailTopic(topic)}
                                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tone</label>
                            <select 
                                value={emailTone}
                                onChange={(e) => setEmailTone(e.target.value as any)}
                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="professional">Professional</option>
                                <option value="friendly">Friendly</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                     </div>
                     
                     <button 
                        onClick={handleGenerateEmail}
                        disabled={!emailTopic || isDraftingEmail}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {isDraftingEmail ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Drafting...
                            </>
                        ) : (
                            <>
                                <SparklesIcon /> Generate Draft
                            </>
                        )}
                     </button>
                 </div>

                 {emailDraftContent && (
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                         <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                             <span className="text-xs font-bold text-slate-500 uppercase">Draft Preview</span>
                             <button onClick={() => setEmailDraftContent('')} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                         </div>
                         <textarea 
                            value={emailDraftContent}
                            onChange={(e) => setEmailDraftContent(e.target.value)}
                            className="w-full h-64 p-4 text-sm text-slate-700 leading-relaxed outline-none resize-none"
                         />
                         <div className="p-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                             <button className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
                                 Copy Text
                             </button>
                             <button 
                                onClick={() => { alert(`Email sent to ${lead.email || 'Client'}`); setEmailDraftContent(''); }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                             >
                                 <Send size={14}/> Send Email
                             </button>
                         </div>
                     </div>
                 )}
             </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Project Files</h3>
                 <button onClick={handleFileUpload} className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                    <Upload size={14}/> Upload
                 </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {lead.documents?.map(doc => (
                   <div key={doc.id} className="group relative bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <div className="aspect-square bg-slate-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                         {doc.type === 'Photo' ? <ImageIcon className="text-slate-400" size={32}/> : <FileText className="text-slate-400" size={32}/>}
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.uploadedAt}</p>
                   </div>
                ))}
                {(!lead.documents || lead.documents.length === 0) && (
                   <div className="col-span-2 md:col-span-3 py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                      No documents or photos yet.
                   </div>
                )}
              </div>
            </div>
          )}

          {/* CLAIM TAB */}
          {activeTab === 'claim' && (
            <div className="space-y-6">
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-3">
                     <Shield size={16}/> Insurance Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                     <div>
                        <span className="text-blue-400 text-xs uppercase">Carrier</span>
                        <p className="font-semibold text-blue-900">{lead.insuranceCarrier || 'N/A'}</p>
                     </div>
                     <div>
                        <span className="text-blue-400 text-xs uppercase">Claim #</span>
                        <p className="font-semibold text-blue-900">{lead.claimNumber || 'Pending'}</p>
                     </div>
                     <div>
                        <span className="text-blue-400 text-xs uppercase">Adjuster</span>
                        <p className="font-semibold text-blue-900">{lead.adjusterName || 'Unassigned'}</p>
                     </div>
                  </div>
               </div>

               {/* Gemini Scope Analysis */}
               <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                     <AlertTriangle size={16} className="text-amber-500"/>
                     AI Supplement Detector
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Paste the insurance scope text below. Gemini will look for missing line items (O&P, Code Upgrades).</p>
                  
                  <textarea 
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono h-24 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                     placeholder="Paste scope items here..."
                     value={scopeText}
                     onChange={(e) => setScopeText(e.target.value)}
                  />
                  
                  <button 
                     onClick={runScopeAnalysis}
                     disabled={isAnalyzing || !scopeText}
                     className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                     {isAnalyzing ? 'Analyzing...' : 'Scan for Supplements'}
                  </button>

                  {analysisResult && (
                     <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-900 whitespace-pre-wrap">
                        {analysisResult}
                     </div>
                  )}
               </div>
            </div>
          )}

          {/* INTELLIGENCE TAB (NEW) */}
          {activeTab === 'intelligence' && (
              <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                          <BrainCircuit className="text-indigo-600 mt-1" size={24} />
                          <div>
                              <h3 className="font-bold text-indigo-900">Supplement Strategist</h3>
                              <p className="text-xs text-indigo-700 mt-1">
                                  Use Gemini 2.5 "Thinking" model to construct logical arguments against insurance denials.
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Item Denied</label>
                          <input 
                            value={denialItem}
                            onChange={(e) => setDenialItem(e.target.value)}
                            placeholder="e.g. Overhead & Profit on 3 trades"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Adjuster's Reasoning</label>
                          <input 
                            value={denialReason}
                            onChange={(e) => setDenialReason(e.target.value)}
                            placeholder="e.g. Job is not complex enough"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50"
                          />
                      </div>
                      <button 
                        onClick={runSupplementStrategy}
                        disabled={isThinking || !denialItem || !denialReason}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                         {isThinking ? 'Reasoning...' : 'Generate Argument'}
                         {isThinking && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      </button>
                  </div>

                  {argument && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-fade-in space-y-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          
                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Core Argument</h4>
                              <p className="font-bold text-slate-800 text-lg mt-1">{argument.point}</p>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Logic & Reasoning</h4>
                              <p className="text-sm text-slate-700 leading-relaxed">{argument.reasoning}</p>
                          </div>

                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                                  Recommended Action <ArrowRight size={12}/>
                              </h4>
                              <p className="text-sm font-medium text-indigo-700 mt-1">{argument.action}</p>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* PRODUCTION TAB */}
          {activeTab === 'production' && (
             <div className="space-y-6">
                 {(!lead.productionSteps || lead.productionSteps.length === 0) ? (
                    <div className="text-center py-8">
                       <p className="text-slate-500 text-sm">No production schedule active.</p>
                       <button 
                          onClick={() => {
                             const steps: ProductionStep[] = [
                                {id: '1', name: 'Sign Contingency', status: 'Completed'},
                                {id: '2', name: 'Order Materials', status: 'Pending'},
                                {id: '3', name: 'Schedule Crew', status: 'Pending'},
                                {id: '4', name: 'Permit Approval', status: 'Pending'},
                                {id: '5', name: 'Dumpster Delivery', status: 'Pending'},
                                {id: '6', name: 'Install Day', status: 'Pending'},
                                {id: '7', name: 'Final Inspection', status: 'Pending'},
                             ];
                             onUpdate({...lead, productionSteps: steps});
                          }}
                          className="mt-2 text-indigo-600 text-sm font-medium hover:underline"
                       >
                          Generate Standard Workflow
                       </button>
                    </div>
                 ) : (
                    <div className="space-y-2">
                       {lead.productionSteps.map((step, idx) => (
                          <div 
                             key={step.id} 
                             onClick={() => toggleProductionStep(step.id)}
                             className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${step.status === 'Completed' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                          >
                             <div className={`w-5 h-5 rounded flex items-center justify-center border ${step.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                <CheckSquare size={14} />
                             </div>
                             <span className={`text-sm font-medium ${step.status === 'Completed' ? 'text-emerald-900 line-through' : 'text-slate-700'}`}>
                                {step.name}
                             </span>
                          </div>
                       ))}
                    </div>
                 )}
             </div>
          )}

           {/* PROPOSALS TAB */}
           {activeTab === 'proposals' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Proposals</h3>
                </div>
                {proposals.filter(p => p.leadId === lead.id).length > 0 ? (
                   <div className="space-y-3">
                      {proposals.filter(p => p.leadId === lead.id).map(proposal => (
                         <div key={proposal.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                               <div>
                                  <p className="text-sm font-bold text-slate-800">{proposal.title}</p>
                                  <p className="text-xs text-slate-500">#{proposal.number}</p>
                               </div>
                               <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  proposal.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                  proposal.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                  proposal.status === 'Viewed' ? 'bg-amber-100 text-amber-700' :
                                  proposal.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                               }`}>{proposal.status}</span>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">{proposal.projectDescription}</p>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                               <span>Created: {new Date(proposal.createdDate).toLocaleDateString()}</span>
                               {proposal.sentDate && <span>Sent: {new Date(proposal.sentDate).toLocaleDateString()}</span>}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100">
                               <p className="text-xs font-medium text-slate-700">{proposal.options.length} Options • Valid until {new Date(proposal.validUntil).toLocaleDateString()}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <ClipboardList className="mx-auto text-slate-300 mb-2" size={32}/>
                      <p className="text-sm text-slate-400">No proposals created for this lead yet.</p>
                   </div>
                )}
             </div>
           )}

           {/* MEASUREMENTS TAB */}
           {activeTab === 'measurements' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Roof Measurements</h3>
                </div>
                {measurements.filter(m => m.leadId === lead.id).length > 0 ? (
                   <div className="space-y-3">
                      {measurements.filter(m => m.leadId === lead.id).map(measurement => (
                         <div key={measurement.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                               <div>
                                  <p className="text-sm font-bold text-slate-800">{measurement.address}</p>
                                  <p className="text-xs text-slate-500">Measured: {new Date(measurement.measurementDate).toLocaleDateString()}</p>
                               </div>
                               <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  measurement.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                  measurement.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-700'
                               }`}>{measurement.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                               <div className="p-2 bg-slate-50 rounded">
                                  <p className="text-[10px] text-slate-500 uppercase">Total Area</p>
                                  <p className="text-sm font-bold text-slate-800">{measurement.totalAreaSqft.toLocaleString()} sq ft</p>
                               </div>
                               <div className="p-2 bg-slate-50 rounded">
                                  <p className="text-[10px] text-slate-500 uppercase">Pitch</p>
                                  <p className="text-sm font-bold text-slate-800">{measurement.pitch || 'N/A'}</p>
                               </div>
                               <div className="p-2 bg-slate-50 rounded">
                                  <p className="text-[10px] text-slate-500 uppercase">Perimeter</p>
                                  <p className="text-sm font-bold text-slate-800">{measurement.perimeter.toFixed(1)} ft</p>
                               </div>
                               <div className="p-2 bg-slate-50 rounded">
                                  <p className="text-[10px] text-slate-500 uppercase">Segments</p>
                                  <p className="text-sm font-bold text-slate-800">{measurement.segments.length}</p>
                               </div>
                            </div>
                            <div className="text-xs text-slate-500">
                               <p>Source: {measurement.imagerySource} • Waste: {measurement.wasteFactor}%</p>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <Ruler className="mx-auto text-slate-300 mb-2" size={32}/>
                      <p className="text-sm text-slate-400">No measurements created for this lead yet.</p>
                   </div>
                )}
             </div>
           )}

           {/* MATERIALS TAB */}
           {activeTab === 'materials' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Material Orders</h3>
                </div>
                {orders.filter(o => o.leadId === lead.id).length > 0 ? (
                   <div className="space-y-3">
                      {orders.filter(o => o.leadId === lead.id).map(order => (
                         <div key={order.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                               <div>
                                  <p className="text-sm font-bold text-slate-800">PO #{order.poNumber}</p>
                                  <p className="text-xs text-slate-500">Ordered: {new Date(order.dateOrdered).toLocaleDateString()}</p>
                               </div>
                               <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'Ordered' ? 'bg-blue-100 text-blue-700' :
                                  'bg-red-100 text-red-700'
                               }`}>{order.status}</span>
                            </div>
                            <div className="mb-2">
                               <p className="text-xs text-slate-500 mb-1">Items:</p>
                               <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                     <div key={idx} className="text-xs text-slate-700 flex justify-between">
                                        <span>{item.description} ({item.quantity} {item.unit})</span>
                                        <span className="font-medium">${item.total.toFixed(2)}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-xs">
                               <p className="text-slate-600">Delivery: {new Date(order.deliveryDate).toLocaleDateString()}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <Package className="mx-auto text-slate-300 mb-2" size={32}/>
                      <p className="text-sm text-slate-400">No material orders for this lead yet.</p>
                   </div>
                )}
             </div>
           )}

           {/* TASKS TAB */}
           {activeTab === 'tasks' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Tasks</h3>
                </div>
                {tasks.filter(t => t.relatedLeadId === lead.id).length > 0 ? (
                   <div className="space-y-2">
                      {tasks.filter(t => t.relatedLeadId === lead.id).map(task => (
                         <div key={task.id} className={`p-3 rounded-lg border flex items-start gap-3 ${
                            task.status === 'Done' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'
                         }`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border mt-0.5 shrink-0 ${
                               task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'
                            }`}>
                               {task.status === 'Done' && <CheckSquare size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`text-sm font-medium ${task.status === 'Done' ? 'text-emerald-900 line-through' : 'text-slate-800'}`}>
                                  {task.title}
                               </p>
                               {task.description && (
                                  <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                               )}
                               <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  <span className={`px-1.5 py-0.5 rounded ${
                                     task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                     task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                     'bg-slate-100 text-slate-600'
                                  }`}>{task.priority}</span>
                                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <ListChecks className="mx-auto text-slate-300 mb-2" size={32}/>
                      <p className="text-sm text-slate-400">No tasks created for this lead yet.</p>
                   </div>
                )}
             </div>
           )}

           {/* CALENDAR TAB */}
           {activeTab === 'calendar' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Scheduled Events</h3>
                </div>
                {events.filter(e => e.leadId === lead.id).length > 0 ? (
                   <div className="space-y-2">
                      {events.filter(e => e.leadId === lead.id).map(event => (
                         <div key={event.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex items-start gap-3">
                               <div style={{backgroundColor: event.color}} className="w-1 h-full rounded-full shrink-0"></div>
                               <div className="flex-1">
                                  <p className="text-sm font-bold text-slate-800">{event.title}</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                     {new Date(event.start).toLocaleDateString()} at {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                  </p>
                                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                     {event.type}
                                  </span>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <Calendar className="mx-auto text-slate-300 mb-2" size={32}/>
                      <p className="text-sm text-slate-400">No events scheduled for this lead yet.</p>
                   </div>
                )}
             </div>
           )}

           {/* FINANCIALS TAB */}
           {activeTab === 'financials' && (
             <div className="space-y-4">
                 <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase">Estimated Value</p>
                        <h3 className="text-2xl font-bold text-emerald-900">${lead.estimatedValue.toLocaleString()}</h3>
                    </div>
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <DollarSign size={20}/>
                    </div>
                 </div>

                 <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-2">Saved Estimates</h3>
                    {lead.estimates && lead.estimates.length > 0 ? (
                       <div className="space-y-2">
                          {lead.estimates.map(est => (
                             <div key={est.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                   <p className="text-sm font-medium text-slate-800">{est.name || 'Unnamed Estimate'}</p>
                                   <p className="text-xs text-slate-500">{est.createdAt} • {est.status || 'Draft'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                   <span className="font-bold text-slate-700">${est.total.toFixed(2)}</span>
                                   <button
                                     onClick={() => handleDownloadEstimate(est.id)}
                                     disabled={downloadingEstimateId === est.id}
                                     className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                     title="Download PDF"
                                   >
                                     {downloadingEstimateId === est.id ? (
                                       <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                     ) : (
                                       <Download size={16} />
                                     )}
                                   </button>
                                </div>
                             </div>
                          ))}
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg text-right border-t border-slate-200">
                                <span className="text-sm font-medium text-slate-500 mr-2">Total Quoted:</span>
                                <span className="text-lg font-bold text-slate-800">
                                    ${lead.estimates.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
                                </span>
                          </div>
                       </div>
                    ) : (
                       <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                           <p className="text-sm text-slate-400 italic">No estimates saved for this lead.</p>
                       </div>
                    )}
                 </div>

                 <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-2">Invoices & Payments</h3>
                    {invoices.filter(inv => inv.leadId === lead.id).length > 0 ? (
                       <div className="space-y-2">
                          {invoices.filter(inv => inv.leadId === lead.id).map(invoice => (
                             <div key={invoice.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <p className="text-sm font-bold text-slate-800">Invoice #{invoice.number}</p>
                                      <p className="text-xs text-slate-500">Issued: {new Date(invoice.dateIssued).toLocaleDateString()}</p>
                                   </div>
                                   <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                      invoice.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' :
                                      invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                      invoice.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-700'
                                   }`}>{invoice.status}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                   <span className="text-xs text-slate-600">Due: {new Date(invoice.dateDue).toLocaleDateString()}</span>
                                   <span className="text-sm font-bold text-slate-800">${invoice.total.toFixed(2)}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          <Receipt className="mx-auto text-slate-300 mb-2" size={24}/>
                          <p className="text-xs text-slate-400">No invoices created for this lead.</p>
                       </div>
                    )}
                 </div>
             </div>
          )}

        </div>

        {/* Hidden PDF Templates for saved estimates */}
        <div className="fixed -left-[9999px] top-0">
          {lead.estimates?.map(estimate => {
            const company = companies.find(c => c.id === currentUser?.companyId);
            if (!company) return null;

            return (
              <div key={estimate.id}>
                <EstimateTemplate
                  ref={(el) => { pdfTemplateRefs.current[estimate.id] = el; }}
                  estimate={estimate}
                  lead={lead}
                  company={company}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper Icon for button
const SparklesIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.39 8.26L20 10.5L14.39 12.74L12 19L9.61 12.74L4 10.5L9.61 8.26L12 2Z" fill="currentColor"/>
    </svg>
)

export default LeadDetailPanel;