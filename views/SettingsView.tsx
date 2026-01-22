import React, { useState, useEffect } from 'react';
import { AppState, Integration, AgentRole } from '../types';
import { Shield, Mail, Linkedin, Twitter, CheckCircle, AlertCircle, Key, BrainCircuit, ExternalLink, Cpu, Info, Save } from 'lucide-react';
import { updateAgentConfig, updateIntegration, getSetting, setSetting } from '../services/supabase';
import { initiateOAuthFlow, IntegrationName, disconnectIntegration } from '../services/oauth';

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
  
  // OAuth credentials
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [linkedinClientId, setLinkedinClientId] = useState('');
  const [linkedinClientSecret, setLinkedinClientSecret] = useState('');
  const [twitterClientId, setTwitterClientId] = useState('');
  const [twitterClientSecret, setTwitterClientSecret] = useState('');
  
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [showGuide, setShowGuide] = useState<string | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<string | null>(null);

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const gemini = await getSetting('geminiApiKey');
        const googleCId = await getSetting('googleClientId');
        const googleCSecret = await getSetting('googleClientSecret');
        const linkedinCId = await getSetting('linkedinClientId');
        const linkedinCSecret = await getSetting('linkedinClientSecret');
        const twitterCId = await getSetting('twitterClientId');
        const twitterCSecret = await getSetting('twitterClientSecret');
        
        if (gemini) setSavedKey(gemini);
        if (googleCId) setGoogleClientId(googleCId);
        if (googleCSecret) setGoogleClientSecret(googleCSecret);
        if (linkedinCId) setLinkedinClientId(linkedinCId);
        if (linkedinCSecret) setLinkedinClientSecret(linkedinCSecret);
        if (twitterCId) setTwitterClientId(twitterCId);
        if (twitterCSecret) setTwitterClientSecret(twitterCSecret);
      } catch (err) {
        console.error('Failed to load API keys:', err);
      }
    };
    loadKeys();
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
      await updateAgentConfig(role, { modules: newModules });
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
      await updateAgentConfig(role, { selectedModel: modelId });
      const updated = state.agentConfigs.map(config => 
        config.role === role ? { ...config, selectedModel: modelId } : config
      );
      updateState({ agentConfigs: updated });
    } catch (err) {
      console.error(err);
      alert("Failed to update model selection. Please try again.");
    }
  };

  const handleSaveOAuthCredentials = async () => {
    setSavingCredentials(true);
    setCredentialsSaved(false);
    try {
      await Promise.all([
        setSetting('googleClientId', googleClientId),
        setSetting('googleClientSecret', googleClientSecret),
        setSetting('linkedinClientId', linkedinClientId),
        setSetting('linkedinClientSecret', linkedinClientSecret),
        setSetting('twitterClientId', twitterClientId),
        setSetting('twitterClientSecret', twitterClientSecret)
      ]);
      setCredentialsSaved(true);
      setTimeout(() => setCredentialsSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save OAuth credentials. Please try again.');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    // Check if OAuth credentials are configured
    if (integration.name === 'Gmail' && (!googleClientId || !googleClientSecret)) {
      alert('Please configure Google OAuth credentials first in the API Configuration section above.');
      return;
    }
    if (integration.name === 'LinkedIn' && (!linkedinClientId || !linkedinClientSecret)) {
      alert('Please configure LinkedIn OAuth credentials first in the API Configuration section above.');
      return;
    }
    if (integration.name === 'Twitter' && (!twitterClientId || !twitterClientSecret)) {
      alert('Please configure Twitter OAuth credentials first in the API Configuration section above.');
      return;
    }

    setConnectingIntegration(integration.id);

    try {
      // Initiate OAuth flow
      await initiateOAuthFlow(integration.name as IntegrationName);
      
      // Update local state
      const updatedIntegrations = state.integrations.map(int => 
        int.id === integration.id ? { ...int, isConnected: true } : int
      );
      updateState({ integrations: updatedIntegrations });
      
      alert(`✅ ${integration.name} connected successfully!`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to connect integration. Please try again.");
    } finally {
      setConnectingIntegration(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!confirm(`Disconnect ${integration.name}?`)) return;
    
    try {
      await disconnectIntegration(integration.name as IntegrationName);
      
      const updatedIntegrations = state.integrations.map(int => 
        int.id === integration.id ? { ...int, isConnected: false } : int
      );
      updateState({ integrations: updatedIntegrations });
    } catch (err) {
      console.error(err);
      alert("Failed to disconnect. Please try again.");
    }
  };

  const handleConnectAll = async () => {
    // Check if all OAuth credentials are configured
    const missingCredentials = [];
    if (!googleClientId || !googleClientSecret) missingCredentials.push('Google');
    if (!linkedinClientId || !linkedinClientSecret) missingCredentials.push('LinkedIn');
    if (!twitterClientId || !twitterClientSecret) missingCredentials.push('Twitter');

    if (missingCredentials.length > 0) {
      alert(`Please configure OAuth credentials for: ${missingCredentials.join(', ')}`);
      return;
    }

    const disconnectedIntegrations = state.integrations.filter(int => !int.isConnected);
    if (disconnectedIntegrations.length === 0) {
      alert('All integrations are already connected!');
      return;
    }

    if (!confirm(`Connect all ${disconnectedIntegrations.length} disconnected integrations?`)) return;

    for (const integration of disconnectedIntegrations) {
      try {
        setConnectingIntegration(integration.id);
        await initiateOAuthFlow(integration.name as IntegrationName);
        
        const updatedIntegrations = state.integrations.map(int => 
          int.id === integration.id ? { ...int, isConnected: true } : int
        );
        updateState({ integrations: updatedIntegrations });
        
        // Wait a bit between connections to avoid overwhelming the OAuth servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Failed to connect ${integration.name}:`, err);
        alert(`Failed to connect ${integration.name}. Stopping batch connection.`);
        break;
      }
    }

    setConnectingIntegration(null);
    alert('✅ Batch connection completed!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      {/* Gemini API Key */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><BrainCircuit className="text-indigo-600" /> Gemini AI</h2>
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
            Get your API key from: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>
          </div>
        </div>
      </div>

      {/* OAuth API Configuration */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Key className="text-indigo-600" /> OAuth API Configuration</h2>
        
        <div className="space-y-6">
          {/* Google OAuth */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mail className="text-slate-600" />
                <h3 className="font-bold text-slate-900">Google OAuth (Gmail)</h3>
              </div>
              <button
                onClick={() => setShowGuide(showGuide === 'google' ? null : 'google')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Info size={16} />
                {showGuide === 'google' ? 'Hide Guide' : 'Setup Guide'}
              </button>
            </div>
            
            {showGuide === 'google' && (
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg text-sm space-y-2">
                <p className="font-bold">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google Cloud Console</a></li>
                  <li>Create/select project → Enable Gmail API</li>
                  <li>Create OAuth 2.0 Client ID (Web application)</li>
                  <li>Add redirect URI: <code className="bg-white px-1 py-0.5 rounded">{window.location.origin}/#/oauth-callback</code></li>
                  <li>Copy Client ID and Secret below</li>
                </ol>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Google Client ID"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
              />
              <input
                type="password"
                placeholder="Google Client Secret"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
              />
            </div>
          </div>

          {/* LinkedIn OAuth */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Linkedin className="text-slate-600" />
                <h3 className="font-bold text-slate-900">LinkedIn OAuth</h3>
              </div>
              <button
                onClick={() => setShowGuide(showGuide === 'linkedin' ? null : 'linkedin')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Info size={16} />
                {showGuide === 'linkedin' ? 'Hide Guide' : 'Setup Guide'}
              </button>
            </div>
            
            {showGuide === 'linkedin' && (
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg text-sm space-y-2">
                <p className="font-bold">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Go to <a href="https://www.linkedin.com/developers" target="_blank" rel="noreferrer" className="text-indigo-600 underline">LinkedIn Developers</a></li>
                  <li>Create a new app</li>
                  <li>In Auth tab, add redirect URL: <code className="bg-white px-1 py-0.5 rounded">{window.location.origin}/#/oauth-callback</code></li>
                  <li>Request scopes: openid, profile, w_member_social</li>
                  <li>Copy Client ID and Secret below</li>
                </ol>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="LinkedIn Client ID"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={linkedinClientId}
                onChange={(e) => setLinkedinClientId(e.target.value)}
              />
              <input
                type="password"
                placeholder="LinkedIn Client Secret"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={linkedinClientSecret}
                onChange={(e) => setLinkedinClientSecret(e.target.value)}
              />
            </div>
          </div>

          {/* Twitter OAuth */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Twitter className="text-slate-600" />
                <h3 className="font-bold text-slate-900">Twitter/X OAuth</h3>
              </div>
              <button
                onClick={() => setShowGuide(showGuide === 'twitter' ? null : 'twitter')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <Info size={16} />
                {showGuide === 'twitter' ? 'Hide Guide' : 'Setup Guide'}
              </button>
            </div>
            
            {showGuide === 'twitter' && (
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg text-sm space-y-2">
                <p className="font-bold">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Go to <a href="https://developer.twitter.com/portal" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Twitter Developer Portal</a></li>
                  <li>Create project and app</li>
                  <li>Set up OAuth 2.0 (Web App)</li>
                  <li>Callback URL: <code className="bg-white px-1 py-0.5 rounded">{window.location.origin}/#/oauth-callback</code></li>
                  <li>Copy Client ID and Secret below</li>
                </ol>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Twitter Client ID"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={twitterClientId}
                onChange={(e) => setTwitterClientId(e.target.value)}
              />
              <input
                type="password"
                placeholder="Twitter Client Secret"
                className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={twitterClientSecret}
                onChange={(e) => setTwitterClientSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {credentialsSaved && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle size={20} />
                <span>Credentials Saved!</span>
              </div>
            )}
            <button
              onClick={handleSaveOAuthCredentials}
              disabled={savingCredentials}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 flex items-center gap-2"
            >
              {savingCredentials ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={20} />
                  Save API Credentials
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Agent Configuration */}
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

      {/* Connected Channels */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3"><Shield className="text-indigo-600" /> Connected Channels</h2>
          <button
            onClick={handleConnectAll}
            disabled={!!connectingIntegration}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 flex items-center gap-2"
          >
            <CheckCircle size={18} />
            {connectingIntegration ? 'Connecting...' : 'Connect All'}
          </button>
        </div>
        <div className="space-y-4">{state.integrations.map(int => (
            <div key={int.id} className="p-6 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${int.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>
                  {int.name === 'Gmail' && <Mail />}
                  {int.name === 'LinkedIn' && <Linkedin />}
                  {int.name === 'Twitter' && <Twitter />}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{int.name}</div>
                  <div className="text-sm text-slate-500">{int.isConnected ? `✓ Connected` : 'Not connected'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {!int.isConnected ? (
                  <button 
                    onClick={() => handleConnect(int)} 
                    disabled={connectingIntegration === int.id}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300"
                  >
                    {connectingIntegration === int.id ? 'Connecting...' : 'Connect'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleDisconnect(int)} 
                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
