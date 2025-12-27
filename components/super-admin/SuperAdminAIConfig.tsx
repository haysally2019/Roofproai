import React, { useState, useEffect } from 'react';
import { Company, AgentConfig } from '../../types';
import { createVoiceAgent, updateVoiceAgent, getAvailableVoices } from '../../services/elevenLabsService';
import {
  Mic, Volume2, Save, Loader2, Clock, Globe, Zap, ChevronLeft, Play, Settings,
  MessageSquare, Phone, Brain, Sliders, Search, Filter, Book, Webhook,
  TestTube, AlertCircle, Plus, X, ChevronDown, Pause, BarChart3, Database
} from 'lucide-react';

interface Props {
  companies: Company[];
  updateCompany: (c: Partial<Company>) => void;
  addToast: (msg: string, type: 'success'|'error') => void;
}

type ConfigTab = 'voice' | 'conversation' | 'knowledge' | 'advanced' | 'webhooks' | 'business-hours';

const SuperAdminAIConfig: React.FC<Props> = ({ companies, updateCompany, addToast }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string, category: string}[]>([]);
  const [activeTab, setActiveTab] = useState<ConfigTab>('voice');
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<string>('all');
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  useEffect(() => { getAvailableVoices().then(setAvailableVoices); }, []);

  const selectCompany = (company: Company) => {
      setSelectedCompanyId(company.id);
      setAgentForm(company.agentConfig || {
        id: `ag-${company.id}`,
        elevenLabsAgentId: '',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        name: `${company.name} AI Assistant`,
        systemPrompt: `You are a helpful AI assistant for ${company.name}. Your role is to assist customers with their inquiries, provide information about services, and help schedule appointments. Be professional, friendly, and concise.`,
        firstMessage: `Hello! I'm the ${company.name} AI assistant. How can I help you today?`,
        isActive: false,
        language: 'en',
        responseDelay: 0.5,
        interruptionThreshold: 100,
        maxDuration: 600,
        temperature: 0.7,
        stability: 0.5,
        similarityBoost: 0.75,
        conversationStarters: [],
        fallbackMessage: "I apologize, but I didn't quite understand that. Could you please rephrase?",
        transferMessage: "Let me transfer you to a team member who can better assist you.",
        endCallPhrases: ["goodbye", "thank you", "that's all"],
        pronunciationDictionary: [],
        customVocabulary: [],
        knowledgeBase: '',
        webhookUrl: '',
        webhookEvents: [],
        businessHours: {
          enabled: true,
          start: "09:00",
          end: "17:00",
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          timezone: "America/New_York"
        }
      });
  };

  const handleSave = async () => {
    if (!agentForm || !selectedCompanyId) return;
    setIsProvisioning(true);
    try {
      updateCompany({ id: selectedCompanyId, agentConfig: agentForm });
      addToast("Agent configuration saved successfully", "success");
    } catch (error) {
      addToast("Failed to save configuration", "error");
    }
    setIsProvisioning(false);
  };

  const playVoicePreview = (voiceId: string) => {
    setVoicePreviewPlaying(voiceId);
    setTimeout(() => setVoicePreviewPlaying(null), 2000);
  };

  const addConversationStarter = () => {
    const starters = agentForm?.conversationStarters || [];
    setAgentForm({...agentForm!, conversationStarters: [...starters, '']});
  };

  const updateConversationStarter = (index: number, value: string) => {
    const starters = [...(agentForm?.conversationStarters || [])];
    starters[index] = value;
    setAgentForm({...agentForm!, conversationStarters: starters});
  };

  const removeConversationStarter = (index: number) => {
    const starters = agentForm?.conversationStarters?.filter((_, i) => i !== index) || [];
    setAgentForm({...agentForm!, conversationStarters: starters});
  };

  const addPronunciation = () => {
    const dict = agentForm?.pronunciationDictionary || [];
    setAgentForm({...agentForm!, pronunciationDictionary: [...dict, { word: '', pronunciation: '' }]});
  };

  const updatePronunciation = (index: number, field: 'word' | 'pronunciation', value: string) => {
    const dict = [...(agentForm?.pronunciationDictionary || [])];
    dict[index][field] = value;
    setAgentForm({...agentForm!, pronunciationDictionary: dict});
  };

  const removePronunciation = (index: number) => {
    const dict = agentForm?.pronunciationDictionary?.filter((_, i) => i !== index) || [];
    setAgentForm({...agentForm!, pronunciationDictionary: dict});
  };

  const filteredVoices = availableVoices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(voiceSearch.toLowerCase());
    const matchesFilter = voiceFilter === 'all' || voice.category.toLowerCase() === voiceFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (!selectedCompanyId) {
      return (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">AI Agent Configuration</h2>
              <p className="text-slate-500 mt-1">Configure voice AI agents for your companies</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map(c => (
                    <div
                      key={c.id}
                      onClick={() => selectCompany(c)}
                      className="bg-white p-6 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Mic size={20} className="text-slate-600 group-hover:text-blue-600"/>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${c.agentConfig?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {c.agentConfig?.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {c.agentConfig?.name || 'Not configured'}
                        </p>
                    </div>
                ))}
            </div>
          </div>
      );
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="animate-fade-in">
        <div className="mb-6">
          <button
            onClick={() => setSelectedCompanyId(null)}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16}/> Back to Companies
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedCompany?.name}</h2>
              <p className="text-slate-500 mt-1">Configure AI voice agent settings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTestPanel(!showTestPanel)}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-300 rounded-lg font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <TestTube size={18}/>
                Test Agent
              </button>
              <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 border-slate-300 rounded-lg hover:border-blue-500 transition-colors">
                <input
                  type="checkbox"
                  checked={agentForm?.isActive}
                  onChange={e => setAgentForm({...agentForm!, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">Agent Active</span>
              </label>
              <button
                onClick={handleSave}
                disabled={isProvisioning}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                  {isProvisioning ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                  {isProvisioning ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {showTestPanel && (
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <TestTube size={18} className="text-blue-600"/>
                  Test Your Agent
                </h3>
                <p className="text-sm text-slate-600 mt-1">Make a test call to validate your configuration</p>
              </div>
              <button onClick={() => setShowTestPanel(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="tel"
                value={testPhoneNumber}
                onChange={e => setTestPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Phone size={18}/>
                Call Now
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-2 sticky top-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'voice' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mic size={18}/>
                  <span>Voice & Identity</span>
                </button>
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'conversation' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare size={18}/>
                  <span>Conversation</span>
                </button>
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'knowledge' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Book size={18}/>
                  <span>Knowledge Base</span>
                </button>
                <button
                  onClick={() => setActiveTab('advanced')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'advanced' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sliders size={18}/>
                  <span>Advanced Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab('webhooks')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'webhooks' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Webhook size={18}/>
                  <span>Webhooks</span>
                </button>
                <button
                  onClick={() => setActiveTab('business-hours')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'business-hours' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock size={18}/>
                  <span>Business Hours</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-xl border border-slate-200">

              {activeTab === 'voice' && (
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Agent Name</label>
                    <input
                      value={agentForm?.name || ''}
                      onChange={e => setAgentForm({...agentForm!, name: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g., Customer Support Assistant"
                    />
                    <p className="text-xs text-slate-500 mt-1">This is how the agent identifies itself</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Voice Selection</label>

                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                          type="text"
                          value={voiceSearch}
                          onChange={e => setVoiceSearch(e.target.value)}
                          placeholder="Search voices..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <select
                        value={voiceFilter}
                        onChange={e => setVoiceFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="all">All Categories</option>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="conversational">Conversational</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                      {filteredVoices.length > 0 ? (
                        filteredVoices.map(voice => (
                          <div
                            key={voice.id}
                            onClick={() => setAgentForm({...agentForm!, voiceId: voice.id})}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              agentForm?.voiceId === voice.id
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  agentForm?.voiceId === voice.id ? 'bg-blue-100' : 'bg-slate-100'
                                }`}>
                                  <Volume2 size={20} className={agentForm?.voiceId === voice.id ? 'text-blue-600' : 'text-slate-600'}/>
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900">{voice.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{voice.category}</div>
                                  <div className="flex gap-1 mt-2">
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Professional</span>
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Clear</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.id); }}
                                className={`p-3 rounded-lg transition-colors ${
                                  voicePreviewPlaying === voice.id
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                {voicePreviewPlaying === voice.id ? (
                                  <Pause size={18}/>
                                ) : (
                                  <Play size={18}/>
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500">
                          <Volume2 size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>No voices found</p>
                          <div className="mt-4 p-4 border-2 border-slate-200 rounded-lg">
                            <select
                              value={agentForm?.voiceId}
                              onChange={e => setAgentForm({...agentForm!, voiceId: e.target.value})}
                              className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="21m00Tcm4TlvDq8ikWAM">Rachel - Default Voice</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Stability</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={agentForm?.stability || 0.5}
                        onChange={e => setAgentForm({...agentForm!, stability: parseFloat(e.target.value)})}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Variable</span>
                        <span className="font-medium text-slate-700">{(agentForm?.stability || 0.5).toFixed(2)}</span>
                        <span>Stable</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Higher values make the voice more consistent</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Similarity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={agentForm?.similarityBoost || 0.75}
                        onChange={e => setAgentForm({...agentForm!, similarityBoost: parseFloat(e.target.value)})}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Low</span>
                        <span className="font-medium text-slate-700">{(agentForm?.similarityBoost || 0.75).toFixed(2)}</span>
                        <span>High</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">How closely the AI follows the original voice</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
                    <select
                      value={agentForm?.language || 'en'}
                      onChange={e => setAgentForm({...agentForm!, language: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'conversation' && (
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Message</label>
                    <textarea
                      value={agentForm?.firstMessage || ''}
                      onChange={e => setAgentForm({...agentForm!, firstMessage: e.target.value})}
                      className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                      placeholder="What the agent says when answering the call..."
                    />
                    <p className="text-xs text-slate-500 mt-1">The greeting message when a call is answered</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">System Prompt</label>
                    <textarea
                      value={agentForm?.systemPrompt || ''}
                      onChange={e => setAgentForm({...agentForm!, systemPrompt: e.target.value})}
                      className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none transition-all"
                      placeholder="Define the agent's personality, knowledge, and behavior..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Instructions that define how the agent should behave and respond</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700">Conversation Starters</label>
                      <button
                        onClick={addConversationStarter}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus size={16}/>
                        Add Starter
                      </button>
                    </div>
                    <div className="space-y-2">
                      {agentForm?.conversationStarters?.map((starter, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={starter}
                            onChange={e => updateConversationStarter(index, e.target.value)}
                            placeholder="e.g., How can I help you with your roofing needs?"
                            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            onClick={() => removeConversationStarter(index)}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={18}/>
                          </button>
                        </div>
                      ))}
                      {(!agentForm?.conversationStarters || agentForm.conversationStarters.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                          No conversation starters added yet
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Fallback Message</label>
                      <textarea
                        value={agentForm?.fallbackMessage || ''}
                        onChange={e => setAgentForm({...agentForm!, fallbackMessage: e.target.value})}
                        className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Message when agent doesn't understand..."
                      />
                      <p className="text-xs text-slate-500 mt-1">Shown when the agent doesn't understand</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Transfer Message</label>
                      <textarea
                        value={agentForm?.transferMessage || ''}
                        onChange={e => setAgentForm({...agentForm!, transferMessage: e.target.value})}
                        className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Message before transferring to human..."
                      />
                      <p className="text-xs text-slate-500 mt-1">Said before transferring to a human</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'knowledge' && (
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Knowledge Base</label>
                    <textarea
                      value={agentForm?.knowledgeBase || ''}
                      onChange={e => setAgentForm({...agentForm!, knowledgeBase: e.target.value})}
                      className="w-full h-96 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none"
                      placeholder="Add information your agent should know about your business, services, pricing, policies, etc..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Provide context and information that helps your agent answer questions accurately</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700">Pronunciation Dictionary</label>
                      <button
                        onClick={addPronunciation}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus size={16}/>
                        Add Word
                      </button>
                    </div>
                    <div className="space-y-2">
                      {agentForm?.pronunciationDictionary?.map((entry, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={entry.word}
                            onChange={e => updatePronunciation(index, 'word', e.target.value)}
                            placeholder="Word"
                            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <input
                            value={entry.pronunciation}
                            onChange={e => updatePronunciation(index, 'pronunciation', e.target.value)}
                            placeholder="Pronunciation (phonetic)"
                            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            onClick={() => removePronunciation(index)}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={18}/>
                          </button>
                        </div>
                      ))}
                      {(!agentForm?.pronunciationDictionary || agentForm.pronunciationDictionary.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                          No custom pronunciations added yet
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Teach the agent how to pronounce specific words, names, or technical terms</p>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Response Delay (seconds)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={agentForm?.responseDelay || 0.5}
                        onChange={e => setAgentForm({...agentForm!, responseDelay: parseFloat(e.target.value)})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">Delay before agent starts responding</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Max Call Duration (seconds)</label>
                      <input
                        type="number"
                        step="60"
                        min="60"
                        max="3600"
                        value={agentForm?.maxDuration || 600}
                        onChange={e => setAgentForm({...agentForm!, maxDuration: parseInt(e.target.value)})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">Maximum call length</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={agentForm?.temperature || 0.7}
                        onChange={e => setAgentForm({...agentForm!, temperature: parseFloat(e.target.value)})}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Focused (0.0)</span>
                        <span className="font-medium text-slate-700">{agentForm?.temperature || 0.7}</span>
                        <span>Creative (1.0)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Controls response randomness and creativity</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Interruption Sensitivity</label>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="10"
                        value={agentForm?.interruptionThreshold || 100}
                        onChange={e => setAgentForm({...agentForm!, interruptionThreshold: parseInt(e.target.value)})}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>More sensitive</span>
                        <span className="font-medium text-slate-700">{agentForm?.interruptionThreshold || 100}</span>
                        <span>Less sensitive</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">How easily the agent can be interrupted</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">End Call Phrases</label>
                    <div className="flex flex-wrap gap-2">
                      {agentForm?.endCallPhrases?.map((phrase, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                          {phrase}
                          <button
                            onClick={() => {
                              const phrases = agentForm?.endCallPhrases?.filter((_, i) => i !== index) || [];
                              setAgentForm({...agentForm!, endCallPhrases: phrases});
                            }}
                            className="ml-1 text-slate-400 hover:text-red-600"
                          >
                            <X size={14}/>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder='Add phrase like "goodbye" or "thank you"'
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            const phrases = [...(agentForm?.endCallPhrases || []), e.currentTarget.value];
                            setAgentForm({...agentForm!, endCallPhrases: phrases});
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Phrases that trigger call ending (press Enter to add)</p>
                  </div>
                </div>
              )}

              {activeTab === 'webhooks' && (
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Webhook Integration</h4>
                        <p className="text-sm text-blue-700">Receive real-time events from your AI agent to your server. Perfect for logging calls, updating CRM, or triggering workflows.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Webhook URL</label>
                    <input
                      value={agentForm?.webhookUrl || ''}
                      onChange={e => setAgentForm({...agentForm!, webhookUrl: e.target.value})}
                      placeholder="https://your-domain.com/api/webhook"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Your endpoint URL that will receive webhook events</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Events to Send</label>
                    <div className="space-y-2">
                      {[
                        { id: 'call.started', name: 'Call Started', desc: 'When a call is initiated' },
                        { id: 'call.ended', name: 'Call Ended', desc: 'When a call is completed' },
                        { id: 'call.recording', name: 'Recording Available', desc: 'When call recording is ready' },
                        { id: 'agent.transfer', name: 'Transfer Requested', desc: 'When agent requests human transfer' },
                        { id: 'agent.error', name: 'Agent Error', desc: 'When an error occurs during the call' }
                      ].map(event => (
                        <label key={event.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={agentForm?.webhookEvents?.includes(event.id) || false}
                            onChange={e => {
                              const events = agentForm?.webhookEvents || [];
                              const newEvents = e.target.checked
                                ? [...events, event.id]
                                : events.filter(ev => ev !== event.id);
                              setAgentForm({...agentForm!, webhookEvents: newEvents});
                            }}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{event.name}</div>
                            <div className="text-xs text-slate-500">{event.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business-hours' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-slate-900">Enable Business Hours</div>
                      <div className="text-sm text-slate-500">Only accept calls during specific hours</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agentForm?.businessHours?.enabled}
                        onChange={e => setAgentForm({
                          ...agentForm!,
                          businessHours: {...agentForm!.businessHours!, enabled: e.target.checked}
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {agentForm?.businessHours?.enabled && (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                          <input
                            type="time"
                            value={agentForm?.businessHours?.start || '09:00'}
                            onChange={e => setAgentForm({
                              ...agentForm!,
                              businessHours: {...agentForm!.businessHours!, start: e.target.value}
                            })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">End Time</label>
                          <input
                            type="time"
                            value={agentForm?.businessHours?.end || '17:00'}
                            onChange={e => setAgentForm({
                              ...agentForm!,
                              businessHours: {...agentForm!.businessHours!, end: e.target.value}
                            })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Active Days</label>
                        <div className="grid grid-cols-7 gap-2">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <button
                              key={day}
                              onClick={() => {
                                const days = agentForm?.businessHours?.days || [];
                                const newDays = days.includes(day)
                                  ? days.filter(d => d !== day)
                                  : [...days, day];
                                setAgentForm({
                                  ...agentForm!,
                                  businessHours: {...agentForm!.businessHours!, days: newDays}
                                });
                              }}
                              className={`p-3 rounded-lg font-medium text-sm transition-all ${
                                agentForm?.businessHours?.days?.includes(day)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Timezone</label>
                        <select
                          value={agentForm?.businessHours?.timezone || 'America/New_York'}
                          onChange={e => setAgentForm({
                            ...agentForm!,
                            businessHours: {...agentForm!.businessHours!, timezone: e.target.value}
                          })}
                          className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="America/Phoenix">Arizona Time</option>
                          <option value="America/Anchorage">Alaska Time</option>
                          <option value="Pacific/Honolulu">Hawaii Time</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
export default SuperAdminAIConfig;
