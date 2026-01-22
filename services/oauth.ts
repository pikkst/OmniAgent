import { supabase } from './supabase';
import { GmailTokens, saveGmailTokens } from './gmail';
import { getSetting } from './supabase';

/**
 * Get OAuth client credentials from Supabase or environment variables
 */
export async function getOAuthCredentials(integration: IntegrationName): Promise<{ clientId: string; clientSecret: string }> {
  const prefix = integration === 'Gmail' ? 'GOOGLE' : integration.toUpperCase();
  
  // Try to get from Supabase first
  const clientId = await getSetting(`${integration.toLowerCase()}ClientId`) || 
                   import.meta.env[`VITE_${prefix}_CLIENT_ID`];
  const clientSecret = await getSetting(`${integration.toLowerCase()}ClientSecret`) || 
                       import.meta.env[`VITE_${prefix}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new Error(`${integration} OAuth credentials not configured. Please add them in Settings.`);
  }

  return { clientId, clientSecret };
}

/**
 * OAuth2 Configuration
 */
const GOOGLE_OAUTH_CONFIG = {
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};

const LINKEDIN_OAUTH_CONFIG = {
  authEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
  scopes: ['openid', 'profile', 'w_member_social', 'r_basicprofile']
};

const TWITTER_OAUTH_CONFIG = {
  authEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
};

const FACEBOOK_OAUTH_CONFIG = {
  authEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
  scopes: [
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'public_profile'
  ]
};

export type IntegrationName = 'Gmail' | 'LinkedIn' | 'Twitter' | 'Facebook';

/**
 * Generate OAuth2 authorization URL
 */
export async function getOAuthUrl(integration: IntegrationName): Promise<string> {
  const { clientId } = await getOAuthCredentials(integration);
  const redirectUri = `${window.location.origin}/#/oauth-callback`;

  let config;
  switch (integration) {
    case 'Gmail':
      config = GOOGLE_OAUTH_CONFIG;
      break;
    case 'LinkedIn':
      config = LINKEDIN_OAUTH_CONFIG;
      break;
    case 'Twitter':
      config = TWITTER_OAUTH_CONFIG;
      break;
    case 'Facebook':
      config = FACEBOOK_OAUTH_CONFIG;
      break;
    default:
      throw new Error(`Unsupported integration: ${integration}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline', // For refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    state: integration // To identify which service after redirect
  });

  return `${config.authEndpoint}?${params.toString()}`;
}

/**
 * Exchange OAuth2 authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  integration: IntegrationName
): Promise<void> {
  const { clientId, clientSecret } = await getOAuthCredentials(integration);
  const redirectUri = `${window.location.origin}/#/oauth-callback`;

  let config;
  switch (integration) {
    case 'Gmail':
      config = GOOGLE_OAUTH_CONFIG;
      break;
    case 'LinkedIn':
      config = LINKEDIN_OAUTH_CONFIG;
      break;
    case 'Twitter':
      config = TWITTER_OAUTH_CONFIG;
      break;
    case 'Facebook':
      config = FACEBOOK_OAUTH_CONFIG;
      break;
    default:
      throw new Error(`Unsupported integration: ${integration}`);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();
  
  // Save tokens based on integration
  if (integration === 'Gmail') {
    const tokens: GmailTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };
    await saveGmailTokens(tokens);
  } else {
    // For LinkedIn and Twitter, save to their respective integration records
    const { error } = await supabase
      .from('integrations')
      .update({
        config: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in * 1000)
        },
        is_connected: true
      })
      .eq('name', integration);

    if (error) throw error;
  }
}

/**
 * Initiate OAuth flow by opening popup window
 */
export async function initiateOAuthFlow(integration: IntegrationName): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const authUrl = await getOAuthUrl(integration);
    
    // Open popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      `${integration} OAuth`,
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Failed to open OAuth popup. Please allow popups for this site.'));
      return;
    }

    // Listen for messages from the popup
    const messageHandler = (event: MessageEvent) => {
      // Security: verify origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-success' && event.data.integration === integration) {
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data.code);
      } else if (event.data.type === 'oauth-error') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error(event.data.error || 'OAuth authentication failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        reject(new Error('OAuth popup was closed'));
      }
    }, 1000);
  });
}

/**
 * Complete OAuth flow (called from OAuth callback page)
 */
export async function completeOAuthFlow(
  code: string,
  integration: IntegrationName
): Promise<void> {
  await exchangeCodeForTokens(code, integration);
  
  // Notify parent window
  if (window.opener) {
    window.opener.postMessage(
      { type: 'oauth-success', integration, code },
      window.location.origin
    );
  }
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(integration: IntegrationName): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({
      config: null,
      is_connected: false
    })
    .eq('name', integration);

  if (error) throw error;
}
