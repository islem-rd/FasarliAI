# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for sign in and sign up in your FasarliAI application.

## Prerequisites

- A Supabase project
- A Google Cloud Console project
- Your application domain (for production) or localhost (for development)

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: `FasarliAI`
     - User support email: Your email
     - Developer contact information: Your email
   - Click **Save and Continue**
   - Add scopes (optional): `email`, `profile`, `openid`
   - Add test users (if in testing mode) or publish the app
   - Click **Save and Continue**

6. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: `FasarliAI Web Client`
   - Authorized JavaScript origins:
     - For development: `http://localhost:3000`
     - For production: `https://fasarliai.vercel.app` (your production domain)
   - Authorized redirect URIs:
     - For development: `http://localhost:3000/auth/callback`
     - For production: `https://fasarliai.vercel.app/auth/callback`
     - **Important**: Also add your Supabase redirect URL:
       - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
       - You can find your project ref in your Supabase project URL
       - Example: `https://fmvudazvwqfuiszomvcu.supabase.co/auth/v1/callback` (replace with your actual project ref)
   - Click **Create**
   - **Copy the Client ID and Client Secret** (you'll need these in Step 2)

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click on it
5. Enable Google provider
6. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Paste the Client ID from Step 1
   - **Client Secret (for OAuth)**: Paste the Client Secret from Step 1
7. Click **Save**

## Step 3: Environment Variables

### Frontend (.env.local)

You don't need any additional environment variables for Google OAuth in the frontend. The existing Supabase variables are sufficient:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env)

No additional backend environment variables are needed for Google OAuth.

## Step 4: Verify Setup

1. **Test in Development:**
   - Make sure your app is running on `http://localhost:3000`
   - Go to the sign in or sign up page
   - Click "Continue with Google"
   - You should be redirected to Google's consent screen
   - After authorizing, you should be redirected back to your app

2. **Test in Production:**
   - Deploy your application
   - Make sure your production domain is added to Google OAuth authorized origins and redirect URIs
   - Test the Google sign in/sign up flow

## Troubleshooting

### "Redirect URI mismatch" Error

- Make sure you've added all redirect URIs in Google Cloud Console:
  - `http://localhost:3000/auth/callback` (development)
  - `https://yourdomain.com/auth/callback` (production)
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` (Supabase callback)

### "OAuth client not found" Error

- Verify that the Client ID and Client Secret in Supabase match the ones from Google Cloud Console
- Make sure you copied the credentials correctly (no extra spaces)

### "Access blocked" Error

- If your app is in testing mode, make sure the user's email is added as a test user in Google Cloud Console
- Or publish your OAuth app in Google Cloud Console

### User Not Created After OAuth

- Check Supabase logs in the Dashboard → Logs → Auth
- Verify that the user creation trigger is working (should be automatic)
- Check if there are any RLS (Row Level Security) policies blocking user creation

## Additional Notes

- Google OAuth works for both sign in and sign up - if a user doesn't exist, they'll be created automatically
- The user's email and profile information will be automatically synced from Google
- You can customize the OAuth consent screen branding in Google Cloud Console
- For production, make sure to publish your OAuth app (not just in testing mode)

## Security Best Practices

1. **Never commit** your Client Secret to version control
2. Keep your Google OAuth credentials secure
3. Regularly rotate your OAuth credentials
4. Use HTTPS in production
5. Monitor OAuth usage in Google Cloud Console

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Auth
2. Check Google Cloud Console for OAuth errors
3. Verify all redirect URIs are correctly configured
4. Ensure your app domain matches the authorized origins

