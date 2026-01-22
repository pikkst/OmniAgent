
export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface Interaction {
  id: string;
  type: 'email_sent' | 'reply_received' | 'agent_note' | 'system';
  content: string;
  timestamp: string;
  author: 'agent' | 'user' | 'lead';
  tokens?: TokenUsage;
  cost: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  country: string;
  language: string;
  status: 'new' | 'contacted' | 'replied' | 'need_info' | 'converted';
  interactions: Interaction[];
}

export interface SocialPost {
  id: string;
  platform: 'LinkedIn' | 'Twitter' | 'Facebook' | 'Instagram';
  content: string;
  scheduledTime: string;
  status: 'scheduled' | 'posted';
  metrics: {
    clicks: number;
    impressions: number;
    conversions: number;
  };
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  source: 'website' | 'manual';
  timestamp: string;
}

export interface Integration {
  id: string;
  name: 'Gmail' | 'LinkedIn' | 'Twitter';
  isConnected: boolean;
  accountName?: string;
}

export type AgentRole = 'Researcher' | 'Copywriter' | 'CRM' | 'Strategist';

export interface AgentModuleConfig {
  role: AgentRole;
  selectedModel: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gemini-flash-lite-latest';
  modules: string[];
}

export interface AppState {
  websiteUrl: string;
  businessContext: string;
  knowledgeBase: KnowledgeEntry[];
  leads: Lead[];
  posts: SocialPost[];
  integrations: Integration[];
  agentConfigs: AgentModuleConfig[];
  totalSpend: number;
  totalTokensUsed: number;
}
