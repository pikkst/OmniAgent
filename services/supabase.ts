import { createClient } from '@supabase/supabase-js';
import type { Lead, Interaction, KnowledgeEntry, SocialPost, Integration, AgentModuleConfig } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
interface DbLead {
  id: string;
  name: string;
  email: string | null;
  company: string;
  country: string;
  language: string;
  status: 'new' | 'contacted' | 'replied' | 'need_info' | 'converted';
  created_at: string;
  updated_at: string;
}

interface DbInteraction {
  id: string;
  lead_id: string;
  type: 'email_sent' | 'reply_received' | 'agent_note' | 'system';
  content: string;
  author: 'agent' | 'user' | 'lead';
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

interface DbKnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  source: 'website' | 'manual';
  created_at: string;
  updated_at: string;
}

interface DbSocialPost {
  id: string;
  platform: 'LinkedIn' | 'Twitter' | 'Facebook' | 'Instagram';
  content: string;
  scheduled_time: string;
  status: 'scheduled' | 'posted';
  clicks: number;
  impressions: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

interface DbIntegration {
  id: string;
  name: string;
  is_connected: boolean;
  config: any;
  created_at: string;
  updated_at: string;
}

interface DbAgentConfig {
  id: string;
  role: string;
  selected_model: string;
  modules: string[];
  created_at: string;
  updated_at: string;
}

interface DbSettings {
  key: string;
  value: any;
}

interface DbUsageTracking {
  id: string;
  total_spend: number;
  total_tokens_used: number;
  updated_at: string;
}

// Helper functions to convert DB types to App types
const dbLeadToLead = (dbLead: DbLead, interactions: Interaction[]): Lead => ({
  id: dbLead.id,
  name: dbLead.name,
  email: dbLead.email || '',
  company: dbLead.company,
  country: dbLead.country,
  language: dbLead.language,
  status: dbLead.status,
  interactions
});

const dbInteractionToInteraction = (dbInt: DbInteraction): Interaction => ({
  id: dbInt.id,
  type: dbInt.type,
  content: dbInt.content,
  timestamp: dbInt.created_at,
  author: dbInt.author,
  tokens: {
    promptTokens: dbInt.prompt_tokens,
    candidatesTokens: dbInt.candidates_tokens,
    totalTokens: dbInt.total_tokens
  },
  cost: dbInt.cost
});

const dbKnowledgeToKnowledge = (dbKnowledge: DbKnowledgeEntry): KnowledgeEntry => ({
  id: dbKnowledge.id,
  topic: dbKnowledge.topic,
  content: dbKnowledge.content,
  source: dbKnowledge.source,
  timestamp: dbKnowledge.created_at
});

const dbPostToPost = (dbPost: DbSocialPost): SocialPost => ({
  id: dbPost.id,
  platform: dbPost.platform,
  content: dbPost.content,
  scheduledTime: dbPost.scheduled_time,
  status: dbPost.status,
  metrics: {
    clicks: dbPost.clicks,
    impressions: dbPost.impressions,
    conversions: dbPost.conversions
  }
});

const dbIntegrationToIntegration = (dbInt: DbIntegration): Integration => ({
  id: dbInt.id,
  name: dbInt.name as Integration['name'],
  isConnected: dbInt.is_connected
});

const dbAgentConfigToAgentConfig = (dbConfig: DbAgentConfig): AgentModuleConfig => ({
  role: dbConfig.role as AgentModuleConfig['role'],
  selectedModel: dbConfig.selected_model as AgentModuleConfig['selectedModel'],
  modules: dbConfig.modules
});

// CRUD Operations

// Leads
export async function getLeads(): Promise<Lead[]> {
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadsError) throw leadsError;

  const { data: allInteractions, error: intError } = await supabase
    .from('interactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (intError) throw intError;

  const interactionsByLead = (allInteractions || []).reduce((acc, int) => {
    if (!acc[int.lead_id]) acc[int.lead_id] = [];
    acc[int.lead_id].push(dbInteractionToInteraction(int));
    return acc;
  }, {} as Record<string, Interaction[]>);

  return (leads || []).map(lead => dbLeadToLead(lead, interactionsByLead[lead.id] || []));
}

export async function createLead(lead: Omit<Lead, 'id' | 'interactions'>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: lead.name,
      email: lead.email || null,
      company: lead.company,
      country: lead.country,
      language: lead.language,
      status: lead.status
    })
    .select()
    .single();

  if (error) throw error;
  return dbLeadToLead(data, []);
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      name: updates.name,
      email: updates.email || null,
      company: updates.company,
      country: updates.country,
      language: updates.language,
      status: updates.status
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Interactions
export async function getInteractionsByLead(leadId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbInteractionToInteraction);
}

export async function createInteraction(interaction: Omit<Interaction, 'id'> & { leadId: string }): Promise<Interaction> {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      lead_id: interaction.leadId,
      type: interaction.type,
      content: interaction.content,
      author: interaction.author,
      prompt_tokens: interaction.tokens?.promptTokens || 0,
      candidates_tokens: interaction.tokens?.candidatesTokens || 0,
      total_tokens: interaction.tokens?.totalTokens || 0,
      cost: interaction.cost
    })
    .select()
    .single();

  if (error) throw error;
  return dbInteractionToInteraction(data);
}

// Knowledge Base
export async function getKnowledgeBase(): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbKnowledgeToKnowledge);
}

export async function createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): Promise<KnowledgeEntry> {
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({
      topic: entry.topic,
      content: entry.content,
      source: entry.source
    })
    .select()
    .single();

  if (error) throw error;
  return dbKnowledgeToKnowledge(data);
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Social Posts
export async function getSocialPosts(): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .order('scheduled_time', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbPostToPost);
}

export async function createSocialPost(post: Omit<SocialPost, 'id' | 'metrics'>): Promise<SocialPost> {
  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      platform: post.platform,
      content: post.content,
      scheduled_time: post.scheduledTime,
      status: post.status
    })
    .select()
    .single();

  if (error) throw error;
  return dbPostToPost(data);
}

export async function updateSocialPost(id: string, updates: Partial<SocialPost>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.scheduledTime) dbUpdates.scheduled_time = updates.scheduledTime;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.metrics) {
    dbUpdates.clicks = updates.metrics.clicks;
    dbUpdates.impressions = updates.metrics.impressions;
    dbUpdates.conversions = updates.metrics.conversions;
  }

  const { error } = await supabase
    .from('social_posts')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
}

// Integrations
export async function getIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []).map(dbIntegrationToIntegration);
}

export async function updateIntegration(id: string, isConnected: boolean): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({ is_connected: isConnected })
    .eq('id', id);

  if (error) throw error;
}

// Agent Configs
export async function getAgentConfigs(): Promise<AgentModuleConfig[]> {
  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .order('role');

  if (error) throw error;
  return (data || []).map(dbAgentConfigToAgentConfig);
}

export async function updateAgentConfig(role: string, config: Partial<AgentModuleConfig>): Promise<void> {
  const { error } = await supabase
    .from('agent_configs')
    .update({
      selected_model: config.selectedModel,
      modules: config.modules
    })
    .eq('role', role);

  if (error) throw error;
}

// Settings
export async function getSetting(key: string): Promise<any> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('Error fetching setting:', error);
    return null;
  }
  return data?.value || null;
}

export async function setSetting(key: string, value: any): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) {
    console.error('Error setting value:', error);
    throw error;
  }
}

// Usage Tracking
export async function getUsageTracking(): Promise<{ totalSpend: number; totalTokensUsed: number }> {
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .limit(1)
    .single();

  if (error) throw error;
  return {
    totalSpend: data.total_spend,
    totalTokensUsed: data.total_tokens_used
  };
}

export async function updateUsageTracking(spendDelta: number, tokensDelta: number): Promise<void> {
  // Get current values
  const current = await getUsageTracking();
  
  const { error } = await supabase
    .from('usage_tracking')
    .update({
      total_spend: current.totalSpend + spendDelta,
      total_tokens_used: current.totalTokensUsed + tokensDelta
    })
    .eq('id', (await supabase.from('usage_tracking').select('id').limit(1).single()).data?.id);

  if (error) throw error;
}

// Batch operations for initial data load
export async function loadAllData() {
  const [
    leads,
    knowledgeBase,
    posts,
    integrations,
    agentConfigs,
    usage,
    websiteUrl,
    businessContext
  ] = await Promise.all([
    getLeads(),
    getKnowledgeBase(),
    getSocialPosts(),
    getIntegrations(),
    getAgentConfigs(),
    getUsageTracking(),
    getSetting('websiteUrl'),
    getSetting('businessContext')
  ]);

  return {
    leads,
    knowledgeBase,
    posts,
    integrations,
    agentConfigs,
    totalSpend: usage.totalSpend,
    totalTokensUsed: usage.totalTokensUsed,
    websiteUrl: websiteUrl || '',
    businessContext: businessContext || ''
  };
}
