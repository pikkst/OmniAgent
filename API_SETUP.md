# API Setup Guide

**Good news!** Almost all API configuration is done directly in the OmniAgent Settings page. You only need to set up Supabase in `.env`, everything else is configured in the app UI.

## Required Setup (One-time)

### Supabase Database

1. Create account at [Supabase](https://supabase.com) (free tier works)
2. Create a new project
3. Go to Project Settings → API
4. Copy Project URL and anon/public key
5. Add to `.env` file:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
6. Run SQL schema from `supabase.sql` in the SQL Editor

## In-App Configuration (via Settings Page)

Once the app is running, go to **Settings** to configure:

### 1. Gemini AI API

- Click **"Add Key"** in the Gemini AI section
- Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Paste and save

### 2. Gmail Integration (Optional)

1. Click **"Setup Guide"** next to Google OAuth
2. Follow the step-by-step instructions shown in the app:
   - Create Google Cloud project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Copy redirect URI from the app (shown in guide)
3. Paste Client ID and Client Secret in the form
4. Click **"Save API Credentials"**
5. Click **"Connect"** in Connected Channels section

### 3. LinkedIn Integration (Optional)

1. Click **"Setup Guide"** next to LinkedIn OAuth
2. Follow the in-app instructions:
   - Create LinkedIn Developer app
   - Configure OAuth settings
   - Copy redirect URI (shown in guide)
3. Paste credentials and save
4. Connect your account

### 4. Twitter/X Integration (Optional)

1. Click **"Setup Guide"** next to Twitter OAuth
2. Follow the in-app instructions:
   - Create Twitter Developer app
   - Set up OAuth 2.0
   - Copy redirect URI (shown in guide)
3. Paste credentials and save
4. Connect your account

## Why This Approach?

- **User-friendly**: No need to edit .env files for each API
- **Flexible**: Change credentials without restarting the app
- **Secure**: Credentials stored in Supabase, not in code
- **Guided**: Step-by-step instructions with correct redirect URIs shown directly in the app

## Troubleshooting

### OAuth Redirect Mismatch
The app automatically shows you the correct redirect URI in each setup guide. Make sure to copy it exactly as shown.

### "Credentials not configured" Error
Make sure you've:
1. Filled in the OAuth credentials in Settings
2. Clicked "Save API Credentials"
3. The credentials were saved successfully (check for success message)

### Integration Won't Connect
1. Verify credentials are correct
2. Check redirect URI matches exactly
3. Ensure OAuth app has required scopes/permissions
4. Try disconnecting and reconnecting

## What About .env?

The `.env` file is now minimal - it only contains Supabase connection info (required for the app to start). All other API keys can be configured through the Settings UI, making setup much easier!

Optional: You can still use environment variables if you prefer (they take precedence), but it's recommended to use the Settings UI for easier management.

## Support

For issues with specific integrations:
- Gemini AI: [Google AI Documentation](https://ai.google.dev/docs)
- Gmail API: [Gmail API Reference](https://developers.google.com/gmail/api)
- LinkedIn API: [LinkedIn API Docs](https://learn.microsoft.com/en-us/linkedin/)
- Twitter API: [Twitter API Docs](https://developer.twitter.com/docs)
- Supabase: [Supabase Documentation](https://supabase.com/docs)
