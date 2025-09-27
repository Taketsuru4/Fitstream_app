# OAuth Setup Guide for FitStream

This guide explains how to set up Google and Facebook OAuth authentication in Supabase for the FitStream app.

## Prerequisites

1. A Supabase project
2. Access to Supabase dashboard
3. Google Developer Console account
4. Facebook Developer account

## Database Setup

First, run the database migration to create the profiles table:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and run the content from `/database/profiles.sql`
3. This creates the `profiles` table with role management

## Google OAuth Setup

### 1. Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/v1/callback` (for development)

### 2. Configure in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

## Facebook OAuth Setup

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app → "Consumer" type
3. Add "Facebook Login" product
4. In Facebook Login settings:
   - Add Valid OAuth Redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/v1/callback` (for development)

### 2. Configure in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Facebook provider
3. Add your Facebook OAuth credentials:
   - **Client ID**: Your Facebook App ID
   - **Client Secret**: Your Facebook App Secret

## Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Testing the Setup

1. Start the development server: `npm run dev`
2. Go to the landing page
3. Click "Get Started" or "Sign In"
4. Try both Google and Facebook login options
5. For new social media users, verify the role selection modal appears
6. Check that users are redirected to appropriate dashboards based on their role

## Troubleshooting

### Common Issues

1. **OAuth redirect mismatch**: Make sure redirect URIs match exactly in both the OAuth provider and Supabase
2. **Missing profile data**: Check if the database trigger is working and profiles are being created
3. **Role not set**: Verify the RoleSelectionModal appears for new social media users

### Debug Steps

1. Check Supabase logs in the dashboard
2. Check browser console for JavaScript errors
3. Verify database triggers are working:
   ```sql
   SELECT * FROM profiles WHERE id = 'user-id';
   ```

## Production Deployment

When deploying to production:

1. Update OAuth redirect URIs to use your production domain
2. Update environment variables with production values
3. Test all authentication flows in production environment

## Security Notes

- Never expose OAuth client secrets in client-side code
- Use HTTPS in production for OAuth callbacks
- Regularly rotate OAuth credentials
- Monitor authentication logs for suspicious activity