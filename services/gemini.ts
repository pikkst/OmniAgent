
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Lead, KnowledgeEntry, AppState, TokenUsage } from "../types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in .env file');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Calculates real USD cost based on token usage metadata from Gemini.
 * Pricing is approximated from standard Google Cloud tiers.
 */
const calculateRealCost = (usage: any, model: string): number => {
  if (!usage) return 0;
  const { promptTokenCount = 0, candidatesTokenCount = 0 } = usage;
  
  // Approximate pricing per 1M tokens
  const rate = model.includes('pro') 
    ? { input: 15.00, output: 45.00 } // Pro Tier
    : { input: 0.15, output: 0.60 };  // Flash Tier

  const inputCost = (promptTokenCount / 1_000_000) * rate.input;
  const outputCost = (candidatesTokenCount / 1_000_000) * rate.output;
  
  return inputCost + outputCost;
};

export interface AgentResult<T> {
  data: T;
  cost: number;
  tokens: number;
  sources?: any[];
}

export const performMarketResearch = async (
  url: string,
  country: string,
  niche: string,
  state: AppState
): Promise<AgentResult<{ analysis: string; leads: Lead[] }>> => {
  const ai = getAI();
  const config = state.agentConfigs.find(c => c.role === 'Researcher');
  const model = config?.selectedModel || 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze ${url} and find 5 real potential business leads in ${country} within the ${niche} niche. Return valid contact details.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          leads: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                company: { type: Type.STRING },
                language: { type: Type.STRING }
              },
              required: ["name", "company", "language"]
            }
          }
        }
      }
    }
  });

  const usage = (response as any).usageMetadata;
  const cost = calculateRealCost(usage, model);
  const result = JSON.parse(response.text || "{}");

  return {
    data: {
      analysis: result.analysis || "",
      leads: (result.leads || []).map((l: any) => ({
        ...l,
        id: crypto.randomUUID(),
        email: l.email || `info@${l.company.toLowerCase().replace(/\s/g, '')}.com`,
        status: 'new',
        interactions: [],
        country
      }))
    },
    cost,
    tokens: usage?.totalTokenCount || 0,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const craftPersonalizedEmail = async (
  lead: Lead,
  context: string,
  memory: KnowledgeEntry[],
  state: AppState
): Promise<AgentResult<string>> => {
  const ai = getAI();
  const config = state.agentConfigs.find(c => c.role === 'Copywriter');
  const model = config?.selectedModel || 'gemini-3-flash-preview';
  
  const memoryStr = memory.map(m => `${m.topic}: ${m.content}`).join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: `Write a professional outreach email to ${lead.name} at ${lead.company} in ${lead.language}. 
    Context: ${context}. Memory Bank Facts: ${memoryStr}. 
    Tone: Local business culture of ${lead.country}.`
  });

  const usage = (response as any).usageMetadata;
  return {
    data: response.text || "",
    cost: calculateRealCost(usage, model),
    tokens: usage?.totalTokenCount || 0
  };
};

export const processIncomingMessage = async (
  lead: Lead,
  message: string,
  memory: KnowledgeEntry[],
  state: AppState
): Promise<AgentResult<{ reply: string; status: Lead['status'] }>> => {
  const ai = getAI();
  const config = state.agentConfigs.find(c => c.role === 'CRM');
  const model = config?.selectedModel || 'gemini-3-pro-preview';
  const memoryStr = memory.map(m => `${m.topic}: ${m.content}`).join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: `Lead Message: "${message}". Business Knowledge: ${memoryStr}. 
    Reply in ${lead.language}. If info is missing, say you'll check with the team and return 'need_info'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["ready", "need_info"] }
        }
      }
    }
  });

  const usage = (response as any).usageMetadata;
  const result = JSON.parse(response.text || "{}");
  
  return {
    data: {
      reply: result.reply,
      status: result.category === 'ready' ? 'replied' : 'need_info'
    },
    cost: calculateRealCost(usage, model),
    tokens: usage?.totalTokenCount || 0
  };
};
