<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OmniAgent - Autonomous Marketing Cloud

A powerful AI-driven marketing automation platform with autonomous agents for lead generation, email outreach, CRM, and social media management.

## 🚀 Features

### Core Capabilities
- **🔍 AI Lead Finder** - Autonomous lead discovery using Google Search grounding
- **✉️ Gmail Integration** - Real email sending and automatic inbox polling
- **💬 Smart CRM** - AI-powered auto-responses to incoming messages
- **📱 Social Media** - LinkedIn & Twitter/X posting with scheduling
- **🧠 Memory Bank** - Teach agents about your business
- **📊 Analytics Dashboard** - Real-time metrics and agent cost tracking

### Integrations
- ✅ **Gmail** - OAuth2 authenticated email sending/receiving
- ✅ **LinkedIn** - Automated posting with analytics
- ✅ **Twitter/X** - Tweet scheduling and metrics
- ✅ **Supabase** - Real-time database backend
- ✅ **Gemini AI** - Multi-agent orchestration with Google Search

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com/apikey))
- OAuth credentials for integrations (optional, can be added later in Settings)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pikkst/OmniAgent.git
   cd OmniAgent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Supabase (required):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. Initialize Supabase database:
   - Run the SQL schema from `supabase.sql` in your Supabase SQL Editor

5. Run the app:
   ```bash
   npm run dev
   ```

6. Configure API keys in the app:
   - Open the app in your browser (usually http://localhost:5173)
   - Go to Settings
   - Add your Gemini API key
   - (Optional) Add OAuth credentials for Gmail, LinkedIn, Twitter
   - Connect your accounts

**All API keys and OAuth credentials can be configured directly in the Settings page** - no need to edit .env files!

## 📖 Usage

### Quick Start
1. Configure Supabase connection (only required .env step)
2. Add your Gemini API key in Settings
3. (Optional) Add OAuth credentials in Settings for Gmail, LinkedIn, Twitter
4. (Optional) Connect accounts via OAuth in Settings
5. Start discovering leads in Lead Finder
6. Generate and send personalized emails in Campaigns
7. Enable auto-polling in CRM for automatic responses

### Agent Configuration
- **Researcher Agent** - Uses Google Search grounding to find real leads
- **Copywriter Agent** - Generates multilingual personalized emails
- **CRM Agent** - Processes incoming messages and auto-responds
- **Strategist Agent** - Social media content planning

Each agent can be configured with different Gemini models (Flash/Pro) and modules in Settings.

## 🔧 Architecture

```
services/
├── gemini.ts       # AI agent orchestration
├── gmail.ts        # Gmail API integration
├── linkedin.ts     # LinkedIn API integration  
├── twitter.ts      # Twitter/X API integration
├── oauth.ts        # OAuth2 authentication flow
├── scheduler.ts    # Scheduled posts processor
└── supabase.ts     # Database operations

views/
├── Dashboard.tsx   # Analytics and overview
├── LeadFinder.tsx  # AI-powered lead discovery
├── Campaigns.tsx   # Email & social campaigns
├── CRM.tsx         # Lead management & auto-responses
├── KnowledgeBase.tsx # Memory bank management
└── SettingsView.tsx  # Integrations & config
```

## 🔐 Security

- All API keys stored in environment variables
- OAuth2 for secure third-party authentication
- Tokens automatically refreshed
- No credentials stored in code

## 📊 Cost Tracking

The dashboard shows real-time API costs:
- Gemini API usage (per token)
- Cost breakdown by agent role
- Total spend tracking

## 🚢 Deployment

Deploy to Netlify:
```bash
netlify deploy --prod
```

Ensure all environment variables are set in Netlify dashboard.

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines before submitting PRs.

View your app in AI Studio: https://ai.studio/apps/drive/1ZwVhvCOzxHLMSk4MF322batv-qC66WHG
