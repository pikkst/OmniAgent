import { supabase } from './supabase';

// LinkedIn API configuration
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export interface LinkedInTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface LinkedInPost {
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS';
}

/**
 * Get stored LinkedIn OAuth tokens from Supabase
 */
export async function getLinkedInTokens(): Promise<LinkedInTokens | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('config')
    .eq('name', 'LinkedIn')
    .single();

  if (error || !data?.config?.access_token) {
    return null;
  }

  return data.config as LinkedInTokens;
}

/**
 * Save LinkedIn OAuth tokens to Supabase
 */
export async function saveLinkedInTokens(tokens: LinkedInTokens): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({ 
      config: tokens,
      is_connected: true 
    })
    .eq('name', 'LinkedIn');

  if (error) throw error;
}

/**
 * Get valid LinkedIn access token
 */
async function getValidAccessToken(): Promise<string> {
  const tokens = await getLinkedInTokens();
  
  if (!tokens) {
    throw new Error('LinkedIn not connected. Please authenticate in Settings.');
  }

  // Check if token is expired
  if (tokens.expires_at < Date.now()) {
    throw new Error('LinkedIn token expired. Please reconnect in Settings.');
  }

  return tokens.access_token;
}

/**
 * Get authenticated user's LinkedIn profile ID (URN)
 */
async function getUserURN(): Promise<string> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get LinkedIn user profile');
  }

  const data = await response.json();
  return data.sub; // Returns the user's URN
}

/**
 * Create a LinkedIn text post
 */
export async function createLinkedInPost(params: LinkedInPost): Promise<string> {
  const accessToken = await getValidAccessToken();
  const userURN = await getUserURN();

  const postData = {
    author: `urn:li:person:${userURN}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: params.text
        },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': params.visibility
    }
  };

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create LinkedIn post: ${error}`);
  }

  const data = await response.json();
  return data.id; // Returns the post ID
}

/**
 * Get LinkedIn post analytics
 */
export async function getLinkedInPostAnalytics(postId: string): Promise<{
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(
    `${LINKEDIN_API_BASE}/socialActions/${postId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    }
  );

  if (!response.ok) {
    // Return zeros if analytics not available
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  }

  const data = await response.json();
  return {
    likes: data.likesSummary?.totalLikes || 0,
    comments: data.commentsSummary?.totalComments || 0,
    shares: data.sharesSummary?.totalShares || 0,
    impressions: data.impressionCount || 0
  };
}

/**
 * Check if LinkedIn is connected and authenticated
 */
export async function isLinkedInConnected(): Promise<boolean> {
  const tokens = await getLinkedInTokens();
  if (!tokens) return false;
  
  // Check if token is not expired
  return tokens.expires_at > Date.now();
}
