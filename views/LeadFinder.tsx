
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppState, Lead } from '../types';
import { Search, Loader2, Globe, CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react';
import { performMarketResearch } from '../services/gemini';
import { createLead, setSetting, updateUsageTracking } from '../services/supabase';

const LeadFinder: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [url, setUrl] = useState(state.websiteUrl);
  const [country, setCountry] = useState('Estonia');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!url || !niche) return alert("Please enter both your website URL and target niche.");
    setLoading(true);
    try {
      const result = await performMarketResearch(url, country, niche, state);
      setSources(result.sources || []);
      
      // Save each lead to Supabase
      const savedLeads: Lead[] = [];
      for (const leadData of result.data.leads) {
        const savedLead = await createLead(leadData);
        savedLeads.push(savedLead);
      }
      
      // Save settings to Supabase
      await setSetting('websiteUrl', url);
      await setSetting('businessContext', result.data.analysis);
      
      // Update usage tracking in Supabase
      await updateUsageTracking(result.cost, result.tokens);
      
      // Update local state
      updateState({ 
        leads: [...state.leads, ...savedLeads],
        websiteUrl: url,
        businessContext: result.data.analysis,
        totalSpend: state.totalSpend + result.cost,
        totalTokensUsed: state.totalTokensUsed + result.tokens
      });
    } catch (err) {
      console.error(err);
      alert("Research agent encountered an error. Please check your network and API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
          <div className="flex-1">
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3 text-slate-900">
              <Globe className="text-indigo-600" />
              Autonomous Lead Engine
            </h2>
            <p className="text-slate-500">Enter your business details and let the agent scan the web for real opportunities.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl h-fit">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Researcher Agent Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">My Business URL</label>
            <input 
              type="text" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              placeholder="https://mybusiness.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Country</label>
            <select 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option>Estonia</option>
              <option>Finland</option>
              <option>Germany</option>
              <option>France</option>
              <option>UK</option>
              <option>USA</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Niche</label>
            <input 
              type="text" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
              placeholder="e.g. Retail, Real Estate"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-slate-400">
             * Agents use real-time Google Search grounding to verify business data.
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-slate-200 disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={24} />}
            {loading ? 'Agents are searching...' : 'Start Global Search'}
          </button>
        </div>

        {sources.length > 0 && (
          <div className="mt-10 pt-10 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Verified Grounding Sources</h4>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => s.web && (
                <a key={i} href={s.web.uri} target="_blank" className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                  <ExternalLink size={12} /> {s.web.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {state.leads.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Discovered Opportunities</h3>
             <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full uppercase tracking-widest">{state.leads.length} Real Leads Found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.leads.map((l) => (
                  <tr key={l.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-900">{l.company}</td>
                    <td className="px-8 py-6">
                       <div className="font-bold text-slate-800">{l.name}</div>
                       <div className="text-xs text-slate-400">{l.email}</div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500">{l.country}</td>
                    <td className="px-8 py-6">
                       <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black uppercase tracking-tighter text-slate-600">{l.language}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <Link to="/campaigns" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline">
                         Reach Out <ArrowRight size={16} />
                       </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFinder;
