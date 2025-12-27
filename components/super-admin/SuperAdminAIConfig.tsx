import React, { useState, useEffect } from 'react';
import { Company, AgentConfig } from '../../types';
import { createVoiceAgent, updateVoiceAgent, getAvailableVoices } from '../../services/elevenLabsService';
import { Mic, Volume2, Save, Loader2, Clock, Globe, Zap, ChevronLeft, Play, Settings, MessageSquare, Phone, Brain, Sliders } from 'lucide-react';

interface Props {
  companies: Company[];
  updateCompany: (c: Partial<Company>) => void;
  addToast: (msg: string, type: 'success'|'error') => void;
}

type ConfigTab = 'voice' | 'conversation' | 'advanced' | 'business-hours';

const SuperAdminAIConfig: React.FC<Props> = ({ companies, updateCompany, addToast }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentConfig | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{id: string, name: string, category: string}[]>([]);
  const [activeTab, setActiveTab] = useState<ConfigTab>('voice');
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);

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

  const playVoicePreview = () => {
    setVoicePreviewPlaying(true);
    setTimeout(() => setVoicePreviewPlaying(false), 2000);
  };

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
              <label className="flex items-center gap-2 cursor-pointer">
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

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-2">
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
                  onClick={() => setActiveTab('advanced')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'advanced' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sliders size={18}/>
                  <span>Advanced Settings</span>
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

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-xl border border-slate-200">

              {/* Voice & Identity Tab */}
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
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Voice Selection</label>
                    <div className="grid grid-cols-1 gap-3">
                      {availableVoices.length > 0 ? (
                        availableVoices.map(voice => (
                          <div
                            key={voice.id}
                            onClick={() => setAgentForm({...agentForm!, voiceId: voice.id})}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              agentForm?.voiceId === voice.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  agentForm?.voiceId === voice.id ? 'bg-blue-100' : 'bg-slate-100'
                                }`}>
                                  <Volume2 size={18} className={agentForm?.voiceId === voice.id ? 'text-blue-600' : 'text-slate-600'}/>
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900">{voice.name}</div>
                                  <div className="text-xs text-slate-500">{voice.category}</div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); playVoicePreview(); }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Play size={16} className={voicePreviewPlaying ? 'text-blue-600' : 'text-slate-400'}/>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 border-2 border-slate-200 rounded-lg">
                          <select
                            value={agentForm?.voiceId}
                            onChange={e => setAgentForm({...agentForm!, voiceId: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="21m00Tcm4TlvDq8ikWAM">Rachel - Default Voice</option>
                          </select>
                        </div>
                      )}
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
                    </select>
                  </div>
                </div>
              )}

              {/* Conversation Tab */}
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
                </div>
              )}

              {/* Advanced Settings Tab */}
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
                        className="w-full"
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
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>More sensitive</span>
                        <span className="font-medium text-slate-700">{agentForm?.interruptionThreshold || 100}</span>
                        <span>Less sensitive</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">How easily the agent can be interrupted</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Hours Tab */}
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