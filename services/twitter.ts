import { supabase, getSetting } from './supabase';

// Twitter/X API configuration
const TWITTER_API_BASE = 'https://api.twitter.com/2';

export interface TwitterTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface TwitterPost {
  text: string;
}

/**
 * Get stored Twitter OAuth tokens from Supabase
 */
export async function getTwitterTokens(): Promise<TwitterTokens | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('config')
    .eq('name', 'Twitter')
    .single();

  if (error || !data?.config?.access_token) {
    return null;
  }

  return data.config as TwitterTokens;
}

/**
 * Save Twitter OAuth tokens to Supabase
 */
export async function saveTwitterTokens(tokens: TwitterTokens): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({ 
      config: tokens,
      is_connected: true 
    })
    .eq('name', 'Twitter');

  if (error) throw error;
}

/**
 * Refresh Twitter access token if expired
 */
async function refreshAccessToken(refreshToken: string): Promise<TwitterTokens> {
  const clientId = await getSetting('twitterClientId') || import.meta.env.VITE_TWITTER_CLIENT_ID;
  const clientSecret = await getSetting('twitterClientSecret') || import.meta.env.VITE_TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth credentials not configured. Please add them in Settings.');
  }

  // Twitter uses Basic Auth for token refresh
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Twitter access token');
  }

  const data = await response.json();
  const newTokens: TwitterTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  };

  await saveTwitterTokens(newTokens);
  return newTokens;
}

/**
 * Get valid Twitter access token (refreshes if needed)
 */
async function getValidAccessToken(): Promise<string> {
  let tokens = await getTwitterTokens();
  
  if (!tokens) {
    throw new Error('Twitter not connected. Please authenticate in Settings.');
  }

  // Check if token is expired or will expire in next 5 minutes
  if (tokens.expires_at < Date.now() + 300000) {
    tokens = await refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

/**
 * Create a tweet (post)
 */
export async function createTweet(params: TwitterPost): Promise<string> {
  const accessToken = await getValidAccessToken();

  // Twitter has a 280 character limit
  if (params.text.length > 280) {
    throw new Error('Tweet text exceeds 280 character limit');
  }

  const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: params.text })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create tweet: ${error}`);
  }

  const data = await response.json();
  return data.data.id; // Returns the tweet ID
}

/**
 * Get tweet metrics/analytics
 */
export async function getTweetMetrics(tweetId: string): Promise<{
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
}> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(
    `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    // Return zeros if metrics not available
    return { impressions: 0, likes: 0, retweets: 0, replies: 0 };
  }

  const data = await response.json();
  const metrics = data.data?.public_metrics;

  return {
    impressions: metrics?.impression_count || 0,
    likes: metrics?.like_count || 0,
    retweets: metrics?.retweet_count || 0,
    replies: metrics?.reply_count || 0
  };
}

/**
 * Get authenticated user's Twitter profile
 */
export async function getTwitterUserProfile(): Promise<{
  id: string;
  name: string;
  username: string;
}> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(
    `${TWITTER_API_BASE}/users/me`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Twitter user profile');
  }

  const data = await response.json();
  return {
    id: data.data.id,
    name: data.data.name,
    username: data.data.username
  };
}

/**
 * Check if Twitter is connected and authenticated
 */
export async function isTwitterConnected(): Promise<boolean> {
  const tokens = await getTwitterTokens();
  return tokens !== null && tokens.access_token !== '';
}
