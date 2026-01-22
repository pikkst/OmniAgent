
import React, { useState, useEffect } from 'react';
import { AppState, Integration, AgentRole } from '../types';
import { Shield, Mail, Linkedin, Twitter, CheckCircle, AlertCircle, Key, BrainCircuit, ExternalLink, Cpu, Info } from 'lucide-react';

const AVAILABLE_MODULES: Record<AgentRole, string[]> = {
  Researcher: ['Search Grounding', 'Web Scraping', 'Lead Verification', 'Competitor Intelligence'],
  Copywriter: ['Multilingual Support', 'Creative Writing', 'Emoji Optimization', 'Grammar Guard'],
  CRM: ['Memory Bank Access', 'Auto-Reply', 'Sentiment Analysis', 'Internal Notes'],
  Strategist: ['Trend Analysis', 'Social Content Planning', 'Metric Prediction']
};

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Flash 3.0', price: 'Econ' },
  { id: 'gemini-3-pro-preview', name: 'Pro 3.0', price: 'High' },
  { id: 'gemini-flash-lite-latest', name: 'Flash Lite', price: 'Low' }
];

const SettingsView: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        setHasApiKey(await window.aistudio.hasSelectedApiKey());
      }
    };
    checkKey();
  }, []);

  const handleToggleModule = (role: AgentRole, mod: string) => {
    const updated = state.agentConfigs.map(config => {
      if (config.role === role) {
        const has = config.modules.includes(mod);
        return { ...config, modules: has ? config.modules.filter(m => m !== mod) : [...config.modules, mod] };
      }
      return config;
    });
    updateState({ agentConfigs: updated });
  };

  const handleModelChange = (role: AgentRole, modelId: any) => {
    const updated = state.agentConfigs.map(config => config.role === role ? { ...config, selectedModel: modelId } : config);
    updateState({ agentConfigs: updated });
  };

  const handleConnect = (id: string) => {
    const updatedIntegrations = state.integrations.map(int => 
      int.id === id ? { ...int, isConnected: true, accountName: 'Authorized User' } : int
    );
    updateState({ integrations: updatedIntegrations });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><BrainCircuit className="text-indigo-600" /> API Engine</h2>
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${hasApiKey ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><Key /></div>
            <div>
              <div className="font-bold text-slate-900">Gemini Cloud Key</div>
              <div className="text-sm text-slate-500">Real-time costs are billed to this key.</div>
            </div>
          </div>
          <button onClick={() => window.aistudio?.openSelectKey()} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs">Configure Key</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3"><Cpu className="text-indigo-600" /> Agent Orchestration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {state.agentConfigs.map(agent => (
            <div key={agent.role} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/30">
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-4">{agent.role} Agent</h4>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {MODELS.map(m => (
                  <button key={m.id} onClick={() => handleModelChange(agent.role, m.id)}
                    className={`p-2 rounded-lg border text-[10px] font-bold ${agent.selectedModel === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'bg-white text-slate-500'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MODULES[agent.role].map(mod => (
                  <button key={mod} onClick={() => handleToggleModule(agent.role, mod)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${agent.modules.includes(mod) ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>
                    {mod}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Shield className="text-indigo-600" /> Channels</h2>
        <div className="space-y-4">
          {state.integrations.map(int => (
            <div key={int.id} className="p-6 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${int.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>
                  {int.name === 'Gmail' && <Mail />}
                  {int.name === 'LinkedIn' && <Linkedin />}
                  {int.name === 'Twitter' && <Twitter />}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{int.name}</div>
                  <div className="text-sm text-slate-500">{int.isConnected ? `Linked Account` : 'Offline'}</div>
                </div>
              </div>
              {!int.isConnected && <button onClick={() => handleConnect(int.id)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Connect</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
