
# Quick Start Guide - Authentication Setup

## Prerequisites
- Supabase project created and configured
- iOS device for testing Apple Sign-In (simulator has limitations)
- SMS provider configured in Supabase (for phone auth)

## Setup Steps

### 1. Configure Supabase

#### Enable Phone Authentication:
```bash
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers
2. Click on "Phone" provider
3. Enable the provider
4. Configure your SMS provider (Twilio recommended)
5. Save changes
```

#### Enable Apple Sign-In:
```bash
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers
2. Click on "Apple" provider
3. Enable the provider
4. Add your Apple Service ID (from Apple Developer Console)
5. Add your app's bundle identifier to "Client IDs"
6. Save changes
```

### 2. Apple Developer Console Setup

#### Create App ID:
```bash
1. Go to https://developer.apple.com/account/resources/identifiers
2. Click "+" to create new identifier
3. Select "App IDs" and continue
4. Enter description and bundle ID (e.g., com.yourcompany.natively)
5. Enable "Sign in with Apple" capability
6. Register the App ID
```

#### Create Services ID:
```bash
1. Go to https://developer.apple.com/account/resources/identifiers
2. Click "+" to create new identifier
3. Select "Services IDs" and continue
4. Enter identifier (e.g., com.yourcompany.natively.auth)
5. Enable "Sign in with Apple"
6. Configure:
   - Domain: YOUR_PROJECT.supabase.co
   - Redirect URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
7. Save and register
```

### 3. Build and Run

```bash
# Install dependencies
npm install

# Prebuild for iOS (required for Apple Sign-In)
npx expo prebuild

# Run on iOS device
npx expo run:ios --device

# Or run on Android (phone auth only)
npx expo run:android
```

### 4. Test Authentication

#### Test Phone Auth:
1. Open the app
2. Enter phone number with country code: +1234567890
3. Tap "Continue with Phone"
4. Check your phone for SMS with 6-digit code
5. Enter the code
6. You should be logged in and redirected to home screen

#### Test Apple Sign-In (iOS only):
1. Open the app on iOS device
2. Tap "Sign in with Apple" button
3. Authenticate with Face ID/Touch ID/Password
4. You should be logged in and redirected to home screen

### 5. Verify Everything Works

✅ **Login Screen**:
- Phone input accepts numbers
- Apple button shows on iOS
- Proper validation messages

✅ **OTP Screen**:
- 6-digit input works
- Auto-focus between digits
- Resend button works after countdown
- Verification succeeds

✅ **Protected Routes**:
- Can't access home without login
- Redirects to login when not authenticated
- Redirects to home when authenticated

✅ **Post Tags**:
- Episode tags (S1E1) are clickable ✓
- Show name tags are clickable ✓
- Category tags (Fan Theory, etc.) are NOT clickable ✓

✅ **Comments**:
- Comment button opens post detail page ✓
- Can view existing comments ✓
- Can add new comments ✓
- Comment count updates ✓

## Troubleshooting

### Phone Auth Not Working:
- Check SMS provider is configured in Supabase
- Verify phone number format includes country code
- Check Supabase logs for errors
- Ensure rate limits aren't exceeded

### Apple Sign-In Not Working:
- Verify testing on physical iOS device (not simulator)
- Check bundle ID matches in Apple Developer Console
- Verify Services ID is configured correctly
- Check Supabase Apple provider settings
- Ensure app is built with `npx expo prebuild`

### Protected Routes Not Working:
- Check console logs for auth state changes
- Verify Supabase client is initialized correctly
- Check AsyncStorage permissions
- Clear app data and try again

### Comments Not Showing:
- Check console for errors
- Verify navigation to post detail page works
- Check mock data is loaded correctly
- Verify comment state management

## Environment Variables

Make sure these are set in your `.env` file:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Common Issues

### "No SMS provider configured":
- Go to Supabase Dashboard > Authentication > Providers > Phone
- Configure Twilio, MessageBird, or another SMS provider
- Add API credentials

### "Apple Sign-In not available":
- Only works on iOS 13+
- Must be tested on physical device
- Requires proper Apple Developer account setup

### "Session not persisting":
- Check AsyncStorage permissions
- Verify Supabase client configuration
- Check for errors in console logs

## Next Steps

After authentication is working:
1. Test all user flows thoroughly
2. Configure notification preferences
3. Set up profile management
4. Implement additional security features
5. Add analytics tracking

## Support Resources

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Expo Apple Auth: https://docs.expo.dev/versions/latest/sdk/apple-authentication/
- Phone Auth Guide: https://supabase.com/docs/guides/auth/phone-login
- Apple Sign-In Guide: https://supabase.com/docs/guides/auth/social-login/auth-apple
