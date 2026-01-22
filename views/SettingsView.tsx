
import React, { useState, useEffect } from 'react';
import { AppState, Integration, AgentRole } from '../types';
import { Shield, Mail, Linkedin, Twitter, CheckCircle, AlertCircle, Key, BrainCircuit, ExternalLink, Cpu, Info } from 'lucide-react';
import { updateAgentConfig, updateIntegration, getSetting, setSetting } from '../services/supabase';

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
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    const loadKey = async () => {
      try {
        const key = await getSetting('geminiApiKey');
        if (key) {
          setSavedKey(key);
        }
      } catch (err) {
        console.error('Failed to load Gemini key:', err);
      }
    };
    loadKey();
  }, []);

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) return alert('Please enter a valid API key');
    try {
      await setSetting('geminiApiKey', geminiKey);
      setSavedKey(geminiKey);
      setGeminiKey('');
      setShowKeyInput(false);
      alert('✅ Gemini API key saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save API key. Please try again.');
    }
  };

  const handleToggleModule = async (role: AgentRole, mod: string) => {
    const config = state.agentConfigs.find(c => c.role === role);
    if (!config) return;
    
    const has = config.modules.includes(mod);
    const newModules = has ? config.modules.filter(m => m !== mod) : [...config.modules, mod];
    
    try {
      // Update in Supabase
      await updateAgentConfig(role, { modules: newModules });
      
      // Update local state
      const updated = state.agentConfigs.map(c => 
        c.role === role ? { ...c, modules: newModules } : c
      );
      updateState({ agentConfigs: updated });
    } catch (err) {
      console.error(err);
      alert("Failed to update agent configuration. Please try again.");
    }
  };

  const handleModelChange = async (role: AgentRole, modelId: string) => {
    try {
      // Update in Supabase
      await updateAgentConfig(role, { selectedModel: modelId });
      
      // Update local state
      const updated = state.agentConfigs.map(config => 
        config.role === role ? { ...config, selectedModel: modelId } : config
      );
      updateState({ agentConfigs: updated });
    } catch (err) {
      console.error(err);
      alert("Failed to update model selection. Please try again.");
    }
  };

  const handleConnect = async (id: string) => {
    try {
      // Update in Supabase
      await updateIntegration(id, true);
      
      // Update local state
      const updatedIntegrations = state.integrations.map(int => 
        int.id === id ? { ...int, isConnected: true } : int
      );
      updateState({ integrations: updatedIntegrations });
    } catch (err) {
      console.error(err);
      alert("Failed to connect integration. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><BrainCircuit className="text-indigo-600" /> API Engine</h2>
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${savedKey ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><Key /></div>
              <div>
                <div className="font-bold text-slate-900">Gemini Cloud Key</div>
                <div className="text-sm text-slate-500">
                  {savedKey ? `Configured: ${savedKey.slice(0, 8)}...${savedKey.slice(-4)}` : 'No API key configured'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              {savedKey ? 'Update Key' : 'Add Key'}
            </button>
          </div>
          
          {showKeyInput && (
            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <input 
                type="password"
                placeholder="Paste your Gemini API key here..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <button 
                onClick={handleSaveGeminiKey}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
              <button 
                onClick={() => { setShowKeyInput(false); setGeminiKey(''); }}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="text-xs text-slate-500 pt-2">
            Get your API key from: <a href="https://aistudio.google.com/apikey" target="_blank" className="text-indigo-600 hover:underline">Google AI Studio</a>
          </div>
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
