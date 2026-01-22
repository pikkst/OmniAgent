import { supabase, getSetting } from './supabase';

// Gmail API configuration
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Types
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Get stored Gmail OAuth tokens from Supabase
 */
export async function getGmailTokens(): Promise<GmailTokens | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('config')
    .eq('name', 'Gmail')
    .single();

  if (error || !data?.config?.access_token) {
    return null;
  }

  return data.config as GmailTokens;
}

/**
 * Save Gmail OAuth tokens to Supabase
 */
export async function saveGmailTokens(tokens: GmailTokens): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({ 
      config: tokens,
      is_connected: true 
    })
    .eq('name', 'Gmail');

  if (error) throw error;
}

/**
 * Refresh Gmail access token if expired
 */
async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  const clientId = await getSetting('googleClientId') || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = await getSetting('googleClientSecret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please add them in Settings.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail access token');
  }

  const data = await response.json();
  const newTokens: GmailTokens = {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_at: Date.now() + (data.expires_in * 1000)
  };

  await saveGmailTokens(newTokens);
  return newTokens;
}

/**
 * Get valid Gmail access token (refreshes if needed)
 */
async function getValidAccessToken(): Promise<string> {
  let tokens = await getGmailTokens();
  
  if (!tokens) {
    throw new Error('Gmail not connected. Please authenticate in Settings.');
  }

  // Check if token is expired or will expire in next 5 minutes
  if (tokens.expires_at < Date.now() + 300000) {
    tokens = await refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

/**
 * Send email via Gmail API
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<{ messageId: string; threadId: string }> {
  const accessToken = await getValidAccessToken();
  
  // Create RFC 2822 formatted email
  const email = [
    `From: ${params.fromName || 'OmniAgent'} <me>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    params.body
  ].join('\r\n');

  // Base64url encode the email
  const encodedEmail = btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  const data = await response.json();
  return {
    messageId: data.id,
    threadId: data.threadId
  };
}

/**
 * Fetch unread messages from Gmail inbox
 */
export async function fetchUnreadMessages(maxResults = 10): Promise<GmailMessage[]> {
  const accessToken = await getValidAccessToken();

  // Get list of unread message IDs
  const listResponse = await fetch(
    `${GMAIL_API_BASE}/messages?q=is:unread&maxResults=${maxResults}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!listResponse.ok) {
    throw new Error('Failed to fetch message list from Gmail');
  }

  const listData = await listResponse.json();
  
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch full details for each message
  const messages: GmailMessage[] = [];
  
  for (const msg of listData.messages) {
    const detailResponse = await fetch(
      `${GMAIL_API_BASE}/messages/${msg.id}?format=full`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!detailResponse.ok) continue;

    const detail = await detailResponse.json();
    const headers = detail.payload.headers;
    
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const to = headers.find((h: any) => h.name === 'To')?.value || '';
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    
    // Extract email body (simplified - handles text/plain and text/html)
    let body = '';
    if (detail.payload.body?.data) {
      body = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (detail.payload.parts) {
      const textPart = detail.payload.parts.find((p: any) => 
        p.mimeType === 'text/plain' || p.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    messages.push({
      id: detail.id,
      threadId: detail.threadId,
      from,
      to,
      subject,
      body,
      timestamp: new Date(parseInt(detail.internalDate)).toISOString()
    });
  }

  return messages;
}

/**
 * Mark message as read in Gmail
 */
export async function markAsRead(messageId: string): Promise<void> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(
    `${GMAIL_API_BASE}/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark message as read');
  }
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

/**
 * Check if Gmail is connected and authenticated
 */
export async function isGmailConnected(): Promise<boolean> {
  const tokens = await getGmailTokens();
  return tokens !== null && tokens.access_token !== '';
}
