import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Send, Shield, Building, FileText, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIIntelligence: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickPrompts = [
    { icon: Shield, text: 'When is O&P required on insurance claims?', category: 'Insurance' },
    { icon: Building, text: 'What are the IRC requirements for roof ventilation?', category: 'Code' },
    { icon: FileText, text: 'How do I calculate steep pitch charges?', category: 'Pricing' },
    { icon: Shield, text: 'What is recoverable depreciation?', category: 'Insurance' },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_GENAI_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are an expert roofing insurance claim specialist and building code consultant. You help roofing contractors understand:
1. Insurance claim procedures and policies
2. Building codes (IRC, IBC) related to roofing
3. Supplement strategies and documentation
4. O&P (Overhead & Profit) requirements
5. Code upgrade requirements
6. Pricing and estimation best practices

Provide clear, actionable advice with specific references when possible. Be concise but thorough.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `${systemPrompt}\n\nUser Question: ${userMessage.content}`,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Intelligence error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 md:p-8 text-white flex justify-between items-center shadow-lg shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">AI Intelligence</h2>
          <p className="text-indigo-100 text-sm md:text-base">Ask questions about insurance claims, building codes, and roofing best practices.</p>
        </div>
        <BrainCircuit size={48} className="text-indigo-200 opacity-50 hidden md:block" />
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 p-4 md:p-8 overflow-y-auto min-h-0">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <BrainCircuit size={32} className="text-indigo-600 md:w-10 md:h-10" />
          </div>
          <div className="text-center max-w-2xl">
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">How can I help you today?</h3>
            <p className="text-sm md:text-base text-slate-600">Ask me anything about insurance claims, building codes, or roofing practices.</p>
          </div>

          <div className="w-full max-w-3xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Quick Questions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  className="p-3 md:p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <prompt.icon size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-indigo-600 mb-1 block">{prompt.category}</span>
                      <p className="text-sm text-slate-700 font-medium">{prompt.text}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden my-4 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 md:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <BrainCircuit size={14} className="text-indigo-600 md:w-4 md:h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-xl p-3 md:p-4 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-[10px] mt-2 ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                    You
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 md:gap-3 justify-start">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <BrainCircuit size={14} className="text-indigo-600 md:w-4 md:h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 md:p-4 shrink-0">
        <div className="flex gap-2 md:gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about insurance policies, building codes, supplements..."
            className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={18} />
                <span className="hidden md:inline">Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <Sparkles size={12} />
          <span className="hidden sm:inline">Powered by Gemini 2.0 • Press Enter to send, Shift+Enter for new line</span>
          <span className="sm:hidden">Press Enter to send</span>
        </p>
      </div>
    </div>
  );
};

export default AIIntelligence;
