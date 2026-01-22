# Multi-User Authentication System

OmniAgent now supports complete multi-user authentication with per-user data isolation.

## Features

### 🔐 User Authentication
- **Registration**: New users can create accounts with email and password
- **Login**: Secure authentication using Supabase Auth
- **Logout**: Clean session termination
- **Email Verification**: Users receive verification emails after registration
- **Session Management**: Automatic session handling with persistent login

### 🛡️ Data Isolation
All user data is completely isolated:
- **Leads**: Each user sees only their own leads
- **Knowledge Base**: Personal knowledge entries per user
- **Social Posts**: User-specific scheduled posts
- **Integrations**: OAuth connections scoped to user
- **Settings**: Per-user API keys and configurations
- **Email Templates**: Custom templates for each user
- **A/B Tests**: User-specific experiments
- **Webhooks**: Personal webhook configurations

### 🔑 Row Level Security (RLS)
Database-level security policies ensure:
```sql
-- Example: Only authenticated users can access their own leads
CREATE POLICY "Users can access own data" ON leads
  FOR ALL USING (auth.uid() = user_id);
```

All tables with user data have RLS policies that check `auth.uid() = user_id`.

## Database Schema Changes

### Updated Tables
All data tables now include `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`:

1. **leads** - User-specific leads
2. **knowledge_base** - Personal knowledge entries
3. **social_posts** - User's scheduled posts
4. **integrations** - OAuth connections per user
5. **settings** - Per-user API keys and configs
6. **email_templates** - Custom templates
7. **ab_tests** - A/B testing experiments
8. **webhooks** - Webhook configurations

### User Profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  avatar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Application Flow

### 1. Initial Load
```typescript
// App.tsx checks authentication status
useEffect(() => {
  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };
  checkAuth();
}, []);
```

### 2. Authentication Required
If no user is logged in, the app shows `AuthView` component with login/register forms.

### 3. Data Loading
Once authenticated, the app loads user-specific data:
```typescript
useEffect(() => {
  if (user) {
    loadData(); // Loads only current user's data
  }
}, [user]);
```

### 4. All CRUD Operations
Every database operation now includes user context:
```typescript
// Example: Creating a lead
async function createLead(lead) {
  const userId = await getCurrentUserId();
  await supabase.from('leads').insert({
    user_id: userId,
    ...lead
  });
}
```

## API Key Management

### Per-User API Keys
Each user stores their own API credentials:
- Gemini API Key
- Google OAuth Client ID/Secret
- LinkedIn OAuth Client ID/Secret
- Twitter OAuth Client ID/Secret
- Facebook OAuth Client ID/Secret

### Storage
```typescript
// Settings are now user-specific
await setSetting('geminiApiKey', key); // Stored with user_id
```

### Connect All Social Media
New "Connect All" button in Settings allows users to:
1. Check if all OAuth credentials are configured
2. Connect all disconnected integrations sequentially
3. Automatically handle OAuth flows for Gmail, LinkedIn, Twitter, Facebook

## Auth Service API

### `authService` Methods

#### `signUp(email, password, fullName)`
Creates a new user account and profile.

#### `signIn(email, password)`
Authenticates user and returns session.

#### `signOut()`
Logs out current user and clears session.

#### `getCurrentUser()`
Returns currently authenticated user or null.

#### `onAuthStateChange(callback)`
Listens for authentication state changes.

## UI Components

### AuthView
- **Location**: `views/AuthView.tsx`
- **Features**:
  - Toggle between login and register modes
  - Form validation
  - Error handling
  - Success messages
  - Email verification prompt

### App Header
- **User Email Display**: Shows current user's email
- **Logout Button**: Clean logout with icon
- **Integration Status**: Shows connection status for user's integrations

## Security Best Practices

### ✅ Implemented
- Row Level Security (RLS) on all tables
- User ID verification on every query
- CASCADE DELETE on user profile deletion
- Secure password handling (Supabase Auth)
- Session management with automatic refresh

### 🔐 Recommendations
1. Enable email verification before allowing full access
2. Implement rate limiting on login attempts
3. Add two-factor authentication (2FA)
4. Encrypt sensitive API keys at rest
5. Implement session timeout policies
6. Add audit logging for sensitive operations

## Migration Notes

### Existing Data
If you have existing data without `user_id`:
1. The SQL script creates all tables with `IF NOT EXISTS`
2. Run migrations to add `user_id` to existing records
3. Or drop tables and re-run SQL for fresh start

### Backward Compatibility
**Breaking Change**: This update is NOT backward compatible with single-user installations.
- All CRUD operations now require authentication
- Unauthenticated requests will fail
- Data must be associated with a user

## Testing Multi-User

### Test Scenario
1. **Register User A**: Create account `user-a@example.com`
2. **Add Data**: Create leads, posts, settings for User A
3. **Logout**: Sign out User A
4. **Register User B**: Create account `user-b@example.com`
5. **Verify Isolation**: User B should see EMPTY dashboard (no User A data)
6. **Add Data**: Create different leads for User B
7. **Switch Users**: Login as User A - should only see User A's data

### Expected Behavior
- ✅ No cross-user data visibility
- ✅ Settings are per-user
- ✅ OAuth connections are independent
- ✅ Each user has their own workspace

## Troubleshooting

### "User not authenticated" errors
- Ensure user is logged in before making requests
- Check that `authService.getCurrentUser()` returns a user
- Verify Supabase Auth is properly configured

### RLS policy errors
- Check that RLS is enabled on all tables
- Verify policies use `auth.uid() = user_id`
- Test policies in Supabase SQL Editor

### Data not loading
- Check browser console for auth errors
- Verify `user_id` columns exist on all tables
- Ensure RLS policies allow the operation

## Environment Variables

Required Supabase configuration:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: With RLS enabled, the anon key is safe to use in frontend as all data access is protected by user-scoped policies.

## Future Enhancements

- [ ] Team/Organization support (multiple users sharing data)
- [ ] Role-based access control (admin, manager, agent)
- [ ] User profile customization
- [ ] Password reset functionality
- [ ] Social login (Google, GitHub)
- [ ] Session activity logs
- [ ] Data export per user
