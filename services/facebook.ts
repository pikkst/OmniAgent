/**
 * Facebook & Instagram API Integration
 * 
 * Uses Facebook Graph API for posting to both Facebook Pages and Instagram Business accounts.
 * Requires Facebook App with proper permissions and Instagram Business Account linked to Facebook Page.
 */

import { supabase } from './supabase';
import { getOAuthCredentials } from './oauth';

interface FacebookPageTokenResponse {
  access_token: string;
  id: string;
}

interface InstagramAccountResponse {
  instagram_business_account?: {
    id: string;
  };
}

interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

interface InstagramMediaResponse {
  id: string;
}

interface FacebookPostMetrics {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  reach: number;
  impressions: number;
}

interface InstagramPostMetrics {
  postId: string;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  engagement: number;
  saves: number;
}

/**
 * Get Facebook Page access token from user access token
 */
async function getPageAccessToken(): Promise<{ token: string; pageId: string } | null> {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'facebook')
      .single();

    if (!integration?.config?.access_token) {
      throw new Error('No Facebook access token found. Please connect Facebook in Settings.');
    }

    const userToken = integration.config.access_token;

    // Get pages managed by this user
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No Facebook pages found. You need to manage at least one page to post.');
    }

    // Use the first page (in production, let user select)
    const page = data.data[0];
    return {
      token: page.access_token,
      pageId: page.id,
    };
  } catch (error) {
    console.error('Error getting Facebook page token:', error);
    return null;
  }
}

/**
 * Get Instagram Business Account ID linked to Facebook Page
 */
async function getInstagramAccountId(pageId: string, pageToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram account');
    }

    const data: InstagramAccountResponse = await response.json();

    if (!data.instagram_business_account) {
      throw new Error('No Instagram Business account linked to this Facebook page');
    }

    return data.instagram_business_account.id;
  } catch (error) {
    console.error('Error getting Instagram account:', error);
    return null;
  }
}

/**
 * Post to Facebook Page
 */
export async function createFacebookPost(message: string): Promise<FacebookPostResponse> {
  const pageAccess = await getPageAccessToken();

  if (!pageAccess) {
    throw new Error('Could not get Facebook page access token');
  }

  const { token, pageId } = pageAccess;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to post to Facebook');
  }

  const data: FacebookPostResponse = await response.json();
  console.log('Facebook post created:', data.id);

  return data;
}

/**
 * Post to Instagram (Text posts via carousel/stories)
 * Note: Instagram Graph API doesn't support pure text posts - requires image/video
 * This is a placeholder for Instagram Stories or image posts
 */
export async function createInstagramPost(
  imageUrl: string,
  caption: string
): Promise<InstagramMediaResponse> {
  const pageAccess = await getPageAccessToken();

  if (!pageAccess) {
    throw new Error('Could not get Facebook page access token');
  }

  const { token, pageId } = pageAccess;
  const igAccountId = await getInstagramAccountId(pageId, token);

  if (!igAccountId) {
    throw new Error('No Instagram account linked');
  }

  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: token,
      }),
    }
  );

  if (!containerResponse.ok) {
    const error = await containerResponse.json();
    throw new Error(error.error?.message || 'Failed to create Instagram media container');
  }

  const containerData = await containerResponse.json();

  // Step 2: Publish media container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: token,
      }),
    }
  );

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(error.error?.message || 'Failed to publish Instagram post');
  }

  const publishData: InstagramMediaResponse = await publishResponse.json();
  console.log('Instagram post created:', publishData.id);

  return publishData;
}

/**
 * Get Facebook post analytics
 */
export async function getFacebookPostMetrics(postId: string): Promise<FacebookPostMetrics> {
  const pageAccess = await getPageAccessToken();

  if (!pageAccess) {
    throw new Error('Could not get Facebook page access token');
  }

  const { token } = pageAccess;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_engaged_users)&access_token=${token}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Facebook metrics');
  }

  const data = await response.json();

  return {
    postId,
    likes: data.likes?.summary?.total_count || 0,
    comments: data.comments?.summary?.total_count || 0,
    shares: data.shares?.count || 0,
    reactions: data.reactions?.summary?.total_count || 0,
    reach: data.insights?.data?.[0]?.values?.[0]?.value || 0,
    impressions: data.insights?.data?.[1]?.values?.[0]?.value || 0,
  };
}

/**
 * Get Instagram post analytics
 */
export async function getInstagramPostMetrics(mediaId: string): Promise<InstagramPostMetrics> {
  const pageAccess = await getPageAccessToken();

  if (!pageAccess) {
    throw new Error('Could not get Facebook page access token');
  }

  const { token } = pageAccess;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count,comments_count,insights.metric(impressions,reach,engagement,saved)&access_token=${token}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Instagram metrics');
  }

  const data = await response.json();

  const insights = data.insights?.data || [];
  const getMetric = (name: string) => 
    insights.find((i: any) => i.name === name)?.values?.[0]?.value || 0;

  return {
    postId: mediaId,
    likes: data.like_count || 0,
    comments: data.comments_count || 0,
    reach: getMetric('reach'),
    impressions: getMetric('impressions'),
    engagement: getMetric('engagement'),
    saves: getMetric('saved'),
  };
}

/**
 * Refresh Facebook long-lived token
 * Long-lived tokens last 60 days and can be refreshed
 */
export async function refreshFacebookToken(): Promise<void> {
  try {
    const credentials = await getOAuthCredentials('Facebook');
    if (!credentials) {
      throw new Error('No Facebook credentials configured');
    }

    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'facebook')
      .single();

    if (!integration?.config?.access_token) {
      throw new Error('No Facebook access token to refresh');
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${credentials.clientId}&client_secret=${credentials.clientSecret}&fb_exchange_token=${integration.config.access_token}`
    );

    if (!response.ok) {
      throw new Error('Failed to refresh Facebook token');
    }

    const data = await response.json();

    // Update token in database
    await supabase
      .from('integrations')
      .update({
        config: {
          ...integration.config,
          access_token: data.access_token,
          expires_at: Date.now() + data.expires_in * 1000,
        },
      })
      .eq('platform', 'facebook');

    console.log('Facebook token refreshed successfully');
  } catch (error) {
    console.error('Error refreshing Facebook token:', error);
    throw error;
  }
}
