# Supabase Setup Instructions for Authentication

## Prerequisites
You've already provided the Supabase URL and ANON_KEY, which are configured as environment variables.

## Step 1: Configure Twilio SMS Provider in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Scroll down to **Phone** provider
5. Enable the Phone provider
6. Select **Twilio** as the SMS provider
7. Enter your Twilio credentials:
   - **Twilio Account SID**: (already in your secrets)
   - **Twilio Auth Token**: (already in your secrets)
   - **Twilio Phone Number**: (already in your secrets)
8. Click **Save**

## Step 2: Configure Apple Sign-In Provider in Supabase

1. In the same **Authentication** > **Providers** section
2. Find **Apple** in the list of providers
3. Enable the Apple provider
4. Enter your Apple credentials:
   - **Service ID**: (already in your secrets as APPLE_SERVICE_ID)
   - **Team ID**: (already in your secrets as APPLE_TEAM_ID)
   - **Key ID**: (already in your secrets as APPLE_KEY_ID)
   - **Private Key**: (already in your secrets as APPLE_PRIVATE_KEY)
5. Set the **Redirect URL** to your app's URL (Supabase will provide this)
6. Click **Save**

## Step 3: Run the Database Migration

1. Open the Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the ENTIRE contents of `DATABASE_MIGRATION.sql` from your project root
5. Paste it into the SQL Editor
6. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
7. Verify that the tables were created:
   - Go to **Table Editor**
   - You should see these new tables:
     - `profiles` (with birthday and onboarding_completed fields)
     - `posts`
     - `follows`
     - `playlists`
     - `watch_history`
     - And more...

## Step 4: Verify Setup

Once you've completed the above steps:

1. The app will automatically use the SMS and Apple Sign-In providers
2. Users can sign up with their phone numbers and receive OTP codes via Twilio
3. Users can also sign in with Apple (iOS/macOS devices)
4. All user data will be stored in the `profiles` table
5. The authentication state will persist across app restarts

## Important Notes

- **Age Restriction**: Users must be 13 years or older to sign up (enforced during the birthday entry step)
- **Username Uniqueness**: Usernames are checked for availability in real-time against the database
- **Session Management**: Sessions are automatically managed and persisted using AsyncStorage
- **RLS (Row Level Security)**: All tables have RLS policies enabled for security

## Troubleshooting

If you encounter issues:

1. **SMS not sending**: 
   - Verify Twilio credentials are correct
   - Check that your Twilio phone number is verified and has SMS capability
   - Review Twilio logs in the Twilio console

2. **Apple Sign-In not working**:
   - Verify all Apple credentials match your Apple Developer account
   - Ensure the redirect URL is configured correctly in both Supabase and Apple Developer portal

3. **Database errors**:
   - Check that the migration ran successfully in the SQL Editor
   - Verify all tables exist in the Table Editor
   - Check Supabase logs for any RLS policy errors

## Next Steps

After completing this setup, the app's authentication flow will be fully functional. Users will go through:

1. Splash/Welcome screen → Choose phone or Apple sign-in
2. Phone Entry → Enter phone number (if phone signin chosen)
3. OTP Verification → Enter code sent via SMS
4. Username Selection → Pick a unique username
5. Birthday Entry → Must be 13+ years old
6. Onboarding Carousel → Swipe through 4 intro screens
7. Home Feed → Start using the app!
