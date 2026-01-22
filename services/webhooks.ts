/**
 * Webhook System for Real-time Updates
 * 
 * Allows external systems to subscribe to events and receive real-time notifications
 */

import { supabase } from './supabase';

export type WebhookEvent =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.converted'
  | 'email.sent'
  | 'email.opened'
  | 'email.replied'
  | 'social.posted'
  | 'campaign.completed'
  | 'test.completed';

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  webhookId: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: any;
  responseStatus: number;
  responseBody?: string;
  success: boolean;
  attempt: number;
  createdAt: string;
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  url: string,
  events: WebhookEvent[]
): Promise<Webhook> {
  const secret = generateWebhookSecret();

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      url,
      events,
      secret,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  return mapWebhookFromDB(data);
}

/**
 * Get all webhooks
 */
export async function getAllWebhooks(): Promise<Webhook[]> {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }

  return (data || []).map(mapWebhookFromDB);
}

/**
 * Get webhook by ID
 */
export async function getWebhook(id: string): Promise<Webhook | null> {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapWebhookFromDB(data);
}

/**
 * Update webhook
 */
export async function updateWebhook(
  id: string,
  updates: Partial<Pick<Webhook, 'url' | 'events' | 'isActive'>>
): Promise<void> {
  const { error } = await supabase
    .from('webhooks')
    .update({
      url: updates.url,
      events: updates.events,
      is_active: updates.isActive
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Trigger webhook event
 */
export async function triggerWebhook(
  event: WebhookEvent,
  data: any
): Promise<void> {
  // Get all active webhooks subscribed to this event
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('is_active', true)
    .contains('events', [event]);

  if (error || !webhooks || webhooks.length === 0) {
    return;
  }

  // Send to each webhook
  for (const webhook of webhooks) {
    sendWebhook(mapWebhookFromDB(webhook), event, data);
  }
}

/**
 * Send webhook HTTP request
 */
async function sendWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  data: any,
  attempt: number = 1
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    webhookId: webhook.id
  };

  const signature = generateSignature(payload, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'User-Agent': 'OmniAgent-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    });

    const success = response.ok;
    const responseBody = await response.text().catch(() => '');

    // Log the webhook delivery
    await logWebhookDelivery({
      webhookId: webhook.id,
      event,
      payload,
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit size
      success,
      attempt
    });

    // Update last triggered time
    if (success) {
      await supabase
        .from('webhooks')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', webhook.id);
    }

    // Retry logic for failed webhooks
    if (!success && attempt < 3) {
      setTimeout(() => {
        sendWebhook(webhook, event, data, attempt + 1);
      }, Math.pow(2, attempt) * 1000); // Exponential backoff: 2s, 4s, 8s
    }
  } catch (err) {
    console.error(`Webhook delivery failed for ${webhook.url}:`, err);

    // Log the failure
    await logWebhookDelivery({
      webhookId: webhook.id,
      event,
      payload,
      responseStatus: 0,
      responseBody: err instanceof Error ? err.message : 'Unknown error',
      success: false,
      attempt
    });

    // Retry
    if (attempt < 3) {
      setTimeout(() => {
        sendWebhook(webhook, event, data, attempt + 1);
      }, Math.pow(2, attempt) * 1000);
    }
  }
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(log: Omit<WebhookLog, 'id' | 'createdAt'>): Promise<void> {
  await supabase.from('webhook_logs').insert({
    webhook_id: log.webhookId,
    event: log.event,
    payload: log.payload,
    response_status: log.responseStatus,
    response_body: log.responseBody,
    success: log.success,
    attempt: log.attempt
  });
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(
  webhookId?: string,
  limit: number = 50
): Promise<WebhookLog[]> {
  let query = supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (webhookId) {
    query = query.eq('webhook_id', webhookId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching webhook logs:', error);
    return [];
  }

  return (data || []).map(mapWebhookLogFromDB);
}

/**
 * Generate webhook secret
 */
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: WebhookPayload, secret: string): string {
  // In a real implementation, use proper HMAC-SHA256
  // For browser environment, this is simplified
  const payloadStr = JSON.stringify(payload);
  const combined = secret + payloadStr;
  
  // Simple hash (in production, use Web Crypto API or a library)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: WebhookPayload,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return signature === expectedSignature;
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const testPayload = {
      event: 'test.ping' as WebhookEvent,
      timestamp: new Date().toISOString(),
      data: { message: 'Test ping from OmniAgent' },
      webhookId: 'test'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test.ping'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      return {
        success: true,
        message: `Webhook responded with status ${response.status}`
      };
    } else {
      return {
        success: false,
        message: `Webhook returned error status ${response.status}`
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to reach webhook URL'
    };
  }
}

// Mapping functions
function mapWebhookFromDB(data: any): Webhook {
  return {
    id: data.id,
    url: data.url,
    events: data.events || [],
    secret: data.secret,
    isActive: data.is_active,
    lastTriggered: data.last_triggered,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

function mapWebhookLogFromDB(data: any): WebhookLog {
  return {
    id: data.id,
    webhookId: data.webhook_id,
    event: data.event,
    payload: data.payload,
    responseStatus: data.response_status,
    responseBody: data.response_body,
    success: data.success,
    attempt: data.attempt,
    createdAt: data.created_at
  };
}

// Helper: Trigger webhook when lead is created
export async function onLeadCreated(lead: any): Promise<void> {
  await triggerWebhook('lead.created', lead);
}

// Helper: Trigger webhook when email is sent
export async function onEmailSent(email: any): Promise<void> {
  await triggerWebhook('email.sent', email);
}

// Helper: Trigger webhook when social post is published
export async function onSocialPosted(post: any): Promise<void> {
  await triggerWebhook('social.posted', post);
}
