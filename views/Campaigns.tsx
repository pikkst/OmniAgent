
import React, { useState } from 'react';
import { AppState, Lead, SocialPost } from '../types';
import { Mail, Share2, PenTool, Sparkles, Send, Loader2, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { craftPersonalizedEmail } from '../services/gemini';
import { createInteraction, updateLead, updateUsageTracking, createSocialPost } from '../services/supabase';
import { sendEmail, isGmailConnected } from '../services/gmail';
import { createLinkedInPost, isLinkedInConnected } from '../services/linkedin';
import { createTweet, isTwitterConnected } from '../services/twitter';
import { createFacebookPost, createInstagramPost } from '../services/facebook';

const Campaigns: React.FC<{ state: AppState; updateState: (u: Partial<AppState>) => void }> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState<'social' | 'email'>('social');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Social media state
  const [socialPlatform, setSocialPlatform] = useState<'LinkedIn' | 'Twitter' | 'Facebook' | 'Instagram'>('LinkedIn');
  const [socialContent, setSocialContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const gmailConnected = state.integrations.find(i => i.name === 'Gmail')?.isConnected;
  const socialConnected = state.integrations.find(i => i.name === 'LinkedIn')?.isConnected;

  const handleGenerateEmail = async () => {
    const lead = state.leads.find(l => l.id === selectedLeadId);
    if (!lead) return alert("Select a lead first.");
    setIsGenerating(true);
    setIsSent(false);
    setError(null);
    try {
      const result = await craftPersonalizedEmail(lead, state.businessContext, state.knowledgeBase, state);
      setDraft(result.data);
      setDraftSubject(`Business Opportunity for ${lead.company}`);
      
      // Update usage tracking in Supabase
      await updateUsageTracking(result.cost, result.tokens);
      
      updateState({
        totalSpend: state.totalSpend + result.cost,
        totalTokensUsed: state.totalTokensUsed + result.tokens
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    const connected = await isGmailConnected();
    if (!connected) {
      setError("Please connect Gmail in Settings first.");
      return;
    }
    
    const lead = state.leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    setIsSending(true);
    setError(null);

    try {
      // Send email via Gmail API
      const result = await sendEmail({
        to: lead.email,
        subject: draftSubject,
        body: draft,
        fromName: 'OmniAgent Team'
      });

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
      setDraftSubject('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handlePostToSocial = async () => {
    if (!socialContent.trim()) {
      setError('Please enter content to post');
      return;
    }

    setIsPosting(true);
    setError(null);
    setPostSuccess(false);

    try {
      let postId: string | undefined;

      // Post immediately if no scheduled time, otherwise save for later
      if (!scheduledTime) {
        // Post now
        if (socialPlatform === 'LinkedIn') {
          const connected = await isLinkedInConnected();
          if (!connected) throw new Error('LinkedIn not connected');
          postId = await createLinkedInPost({ text: socialContent, visibility: 'PUBLIC' });
        } else if (socialPlatform === 'Twitter') {
          const connected = await isTwitterConnected();
          if (!connected) throw new Error('Twitter not connected');
          
          // Twitter has 280 char limit
          const tweetText = socialContent.length > 280 
            ? socialContent.substring(0, 277) + '...' 
            : socialContent;
          postId = await createTweet({ text: tweetText });
        } else if (socialPlatform === 'Facebook') {
          postId = (await createFacebookPost(socialContent)).id;
        } else if (socialPlatform === 'Instagram') {
          throw new Error('Instagram requires an image URL. This feature is coming soon.');
        } else {
          throw new Error(`${socialPlatform} integration not yet implemented`);
        }
      }

      // Save post record to database
      const post = await createSocialPost({
        platform: socialPlatform,
        content: socialContent,
        scheduledTime: scheduledTime || new Date().toISOString(),
        status: scheduledTime ? 'scheduled' : 'posted'
      });

      // Update local state
      updateState({
        posts: [...state.posts, post]
      });

      setPostSuccess(true);
      setSocialContent('');
      setScheduledTime('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to post. Please try again.');
    } finally {
      setIsPosting(false);
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
            
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle />
                <span className="text-sm font-bold">{error}</span>
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

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 uppercase">Email Subject</label>
              <input 
                type="text"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Email subject line..."
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
              />
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
                disabled={!draft || isSending}
                className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {isSending ? 'Sending...' : 'Send via Gmail'}
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
            
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle />
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            {postSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700">
                <CheckCircle />
                <span className="text-sm font-bold">
                  {scheduledTime ? 'Post scheduled successfully!' : 'Posted successfully!'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase">Platform</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value as any)}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter">Twitter/X</option>
                  <option value="Facebook">Facebook (Coming Soon)</option>
                  <option value="Instagram">Instagram (Coming Soon)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase">
                  <Calendar size={14} className="inline mr-1" />
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <textarea
                className="w-full h-80 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Write your ${socialPlatform} post here... ${socialPlatform === 'Twitter' ? '(280 char limit)' : ''}`}
                value={socialContent}
                onChange={(e) => setSocialContent(e.target.value)}
                maxLength={socialPlatform === 'Twitter' ? 280 : undefined}
              />
              {socialPlatform === 'Twitter' && (
                <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                  {socialContent.length}/280
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handlePostToSocial}
                disabled={!socialContent || isPosting || (socialPlatform !== 'LinkedIn' && socialPlatform !== 'Twitter')}
                className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isPosting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {scheduledTime ? 'Schedule Post' : 'Post Now'}
              </button>
            </div>

            {/* Recent posts */}
            {state.posts.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-600 uppercase mb-4">Recent Posts</h4>
                <div className="space-y-3">
                  {state.posts.slice(0, 5).map(post => (
                    <div key={post.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">{post.platform}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          post.status === 'posted' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{post.content.substring(0, 100)}...</p>
                      <div className="text-xs text-slate-400">
                        {new Date(post.scheduledTime).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
