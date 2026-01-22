
import React, { useState } from 'react';
import { AppState, Lead } from '../types';
import { Mail, Share2, PenTool, Sparkles, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { craftPersonalizedEmail } from '../services/gemini';
import { createInteraction, updateLead, updateUsageTracking } from '../services/supabase';

const Campaigns: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'social' | 'email'>('social');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSent, setIsSent] = useState(false);

  const gmailConnected = state.integrations.find(i => i.name === 'Gmail')?.isConnected;
  const socialConnected = state.integrations.find(i => i.name === 'LinkedIn')?.isConnected;

  const handleGenerateEmail = async () => {
    const lead = state.leads.find(l => l.id === selectedLeadId);
    if (!lead) return alert("Select a lead first.");
    setIsGenerating(true);
    setIsSent(false);
    try {
      const result = await craftPersonalizedEmail(lead, state.businessContext, state.knowledgeBase, state);
      setDraft(result.data);
      
      // Update usage tracking in Supabase
      await updateUsageTracking(result.cost, result.tokens);
      
      updateState({
        totalSpend: state.totalSpend + result.cost,
        totalTokensUsed: state.totalTokensUsed + result.tokens
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!gmailConnected) return alert("Please connect Gmail in Settings first.");
    
    const lead = state.leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    try {
      // Save interaction to Supabase
      const interaction = await createInteraction({
        leadId: selectedLeadId,
        type: 'email_sent',
        content: draft,
        timestamp: new Date().toISOString(),
        author: 'agent',
        cost: 0
      });

      // Update lead status in Supabase
      await updateLead(selectedLeadId, { status: 'contacted' });

      // Update local state
      const updatedLeads = state.leads.map(l => 
        l.id === selectedLeadId ? { ...l, status: 'contacted' as const, interactions: [...l.interactions, interaction] } : l
      );

      updateState({ leads: updatedLeads });
      setIsSent(true);
      setDraft('');
    } catch (err) {
      console.error(err);
      alert("Failed to send email. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex gap-4 p-1 bg-slate-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab('social')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'social' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
          <Share2 size={18} /> Social Media
        </button>
        <button onClick={() => setActiveTab('email')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
          <Mail size={18} /> Email Outreach
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {activeTab === 'email' ? (
          <div className="space-y-6">
            {!gmailConnected && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle />
                <span className="text-sm font-bold">Gmail disconnected. You can draft emails but not send them.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase">1. Select Target Lead</label>
                <select 
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                >
                  <option value="">Choose a discovered lead...</option>
                  {state.leads.map(l => (
                    <option key={l.id} value={l.id}>{l.company} ({l.name})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleGenerateEmail}
                  disabled={!selectedLeadId || isGenerating}
                  className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                  Agent: Draft Outreach
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea 
                className="w-full h-80 p-6 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                placeholder="The AI agent will draft a multi-lingual email here..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              {isSent && (
                <div className="absolute inset-0 bg-emerald-50/90 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-700 rounded-2xl">
                  <CheckCircle size={48} className="mb-2" />
                  <span className="text-xl font-bold">Message Sent via Gmail</span>
                  <p className="text-sm">Logged in CRM</p>
                  <button onClick={() => setIsSent(false)} className="mt-4 text-sm font-bold underline">Draft another</button>
                </div>
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="font-bold">Agent is writing in the lead's language...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSendEmail}
                disabled={!draft || !gmailConnected}
                className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
              >
                <Send size={20} />
                Send via Gmail
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!socialConnected && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle />
                <span className="text-sm font-bold">Social accounts disconnected. Connect in Settings.</span>
              </div>
            )}
            <div className="text-center py-20 text-slate-400">
               <Share2 size={48} className="mx-auto mb-4 opacity-10" />
               <p className="font-medium">Social posting module ready for automated scheduling.</p>
               <button className="mt-4 px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Generate Social Strategy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
