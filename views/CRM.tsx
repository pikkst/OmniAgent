
import React, { useState } from 'react';
import { AppState, Interaction } from '../types';
import { Globe, Inbox, Loader2, Sparkles, Send } from 'lucide-react';
import { processIncomingMessage } from '../services/gemini';

const CRM: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [newIncomingMessage, setNewIncomingMessage] = useState('');

  const selectedLead = state.leads.find(l => l.id === selectedLeadId);

  const handleManualInboxPoll = async () => {
    if (!selectedLead || !newIncomingMessage) return;
    setIsPolling(true);
    
    const incoming: Interaction = {
      id: crypto.randomUUID(),
      type: 'reply_received',
      content: newIncomingMessage,
      timestamp: new Date().toISOString(),
      author: 'lead',
      cost: 0
    };

    const step1Leads = state.leads.map(l => l.id === selectedLead.id ? { ...l, interactions: [...l.interactions, incoming] } : l);
    updateState({ leads: step1Leads });
    setNewIncomingMessage('');

    try {
      const result = await processIncomingMessage(selectedLead, newIncomingMessage, state.knowledgeBase, state);
      
      const agentReply: Interaction = {
        id: crypto.randomUUID(),
        type: 'email_sent',
        content: result.data.reply,
        timestamp: new Date().toISOString(),
        author: 'agent',
        cost: result.cost
      };

      updateState({ 
        leads: step1Leads.map(l => l.id === selectedLead.id ? { ...l, status: result.data.status, interactions: [...l.interactions, agentReply] } : l),
        totalSpend: state.totalSpend + result.cost,
        totalTokensUsed: state.totalTokensUsed + result.tokens
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b bg-slate-50 font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Inbox size={14} /> Inbox</div>
        <div className="flex-1 overflow-y-auto divide-y">
          {state.leads.map(lead => (
            <div key={lead.id} onClick={() => setSelectedLeadId(lead.id)}
              className={`p-5 cursor-pointer transition-all ${selectedLeadId === lead.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : 'hover:bg-slate-50'}`}>
              <div className="font-bold text-slate-900 text-sm truncate">{lead.name}</div>
              <p className="text-xs text-slate-500 truncate">{lead.company}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm relative">
        {selectedLead ? (
          <>
            <div className="p-6 border-b flex justify-between items-center bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">{selectedLead.name.charAt(0)}</div>
                <div className="font-black text-slate-900">{selectedLead.name}</div>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50/30 flex flex-col">
              {selectedLead.interactions.map(interaction => (
                <div key={interaction.id} className={`max-w-[85%] p-5 rounded-3xl text-sm ${interaction.author === 'agent' ? 'bg-white self-start border rounded-bl-none shadow-sm' : 'bg-slate-900 text-white self-end rounded-br-none shadow-xl'}`}>
                  <div className="font-black mb-2 opacity-50 text-[9px] uppercase tracking-widest">{interaction.author === 'agent' ? 'AI Agent' : 'Customer'}</div>
                  {interaction.content}
                  {interaction.cost > 0 && <div className="mt-2 text-[8px] font-bold opacity-30 text-right">Cost: ${interaction.cost.toFixed(4)}</div>}
                </div>
              ))}
              {isPolling && <div className="self-center bg-white px-6 py-3 rounded-full border shadow-sm animate-pulse text-xs font-bold">Agent Reasoning...</div>}
            </div>
            <div className="p-6 border-t bg-white">
              <div className="relative flex items-center gap-3">
                <input type="text" className="flex-1 px-5 py-4 bg-slate-50 border rounded-2xl outline-none" placeholder="Reply to lead..." value={newIncomingMessage} onChange={(e) => setNewIncomingMessage(e.target.value)} />
                <button onClick={handleManualInboxPoll} disabled={!newIncomingMessage || isPolling} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:bg-slate-200"><Send size={20} /></button>
              </div>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Select a Lead</div>}
      </div>
    </div>
  );
};

export default CRM;
