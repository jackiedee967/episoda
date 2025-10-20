
# 🔐 AUTHENTICATION SETUP GUIDE

## ⚠️ CRITICAL: Phone Authentication is NOT Enabled

The authentication system is currently **NON-FUNCTIONAL** because phone authentication is **DISABLED** in your Supabase project.

### Error Found in Logs:
```
"error": "400: Unsupported phone provider"
"error_code": "phone_provider_disabled"
```

---

## 📋 REQUIRED SETUP STEPS

### 1. Enable Phone Authentication in Supabase

**Go to Supabase Dashboard:**
1. Navigate to: https://supabase.com/dashboard/project/mbwuoqoktdgudzaemjhx
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab
4. Find **Phone** provider
5. Click **Enable**

### 2. Configure SMS Provider (Choose ONE)

#### Option A: Twilio (Recommended - Most Reliable)

**Step 1: Get Twilio Credentials**
1. Sign up at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Get a Twilio phone number (must be SMS-capable)

**Step 2: Configure in Supabase**
1. In Supabase Dashboard → Authentication → Providers → Phone
2. Select **Twilio** as the SMS provider
3. Enter:
   - **Twilio Account SID**: Your Account SID
   - **Twilio Auth Token**: Your Auth Token
   - **Twilio Phone Number**: Your Twilio phone number (format: +1234567890)
4. Click **Save**

**Step 3: Verify Twilio Setup**
- Ensure your Twilio account is verified
- For production: Upgrade from trial account (trial only sends to verified numbers)
- For testing: Add test phone numbers in Twilio Console

#### Option B: MessageBird

1. Sign up at https://messagebird.com
2. Get your API key
3. In Supabase Dashboard → Authentication → Providers → Phone
4. Select **MessageBird** as provider
5. Enter your MessageBird API key
6. Click **Save**

#### Option C: Vonage (formerly Nexmo)

1. Sign up at https://vonage.com
2. Get your API key and secret
3. In Supabase Dashboard → Authentication → Providers → Phone
4. Select **Vonage** as provider
5. Enter credentials
6. Click **Save**

### 3. Configure Phone Authentication Settings

In Supabase Dashboard → Authentication → Providers → Phone:

**Required Settings:**
- ✅ **Enable Phone Provider**: ON
- ✅ **Enable Phone Signup**: ON (allows new users to sign up)
- ✅ **Enable Phone Confirmations**: ON (requires OTP verification)

**OTP Settings:**
- **OTP Expiry**: 60 seconds (default, can increase to 300)
- **OTP Length**: 6 digits (default)

**Rate Limiting:**
- Default: 5 OTP requests per hour per phone number
- Adjust if needed for testing

### 4. Configure Apple Sign-In

**Step 1: Apple Developer Console**
1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → Select your App ID
4. Enable **Sign In with Apple** capability
5. Click **Save**

**Step 2: Create Services ID**
1. In Identifiers, click **+** to create new
2. Select **Services IDs** → Continue
3. Enter:
   - **Description**: Your App Name Sign In
   - **Identifier**: com.yourapp.signin (must be unique)
4. Enable **Sign In with Apple**
5. Click **Configure**
6. Add domains and return URLs:
   - **Domains**: `mbwuoqoktdgudzaemjhx.supabase.co`
   - **Return URLs**: `https://mbwuoqoktdgudzaemjhx.supabase.co/auth/v1/callback`
7. Click **Save** → **Continue** → **Register**

**Step 3: Configure in Supabase**
1. In Supabase Dashboard → Authentication → Providers
2. Find **Apple** provider
3. Click **Enable**
4. Enter:
   - **Services ID**: Your Services ID from Step 2
   - **Key ID**: From Apple Developer Console → Keys
   - **Team ID**: Your Apple Team ID (top right in Apple Developer Console)
   - **Private Key**: Download from Apple Developer Console → Keys
5. Click **Save**

**Step 4: Update app.json**
Ensure your `app.json` has:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourapp.identifier",
      "usesAppleSignIn": true
    }
  }
}
```

### 5. Test Phone Authentication

**Test Flow:**
1. Open the app
2. Enter a phone number in E.164 format: `+1234567890`
3. Click "Send Code"
4. Check your phone for SMS with 6-digit code
5. Enter the code
6. You should be logged in

**Troubleshooting:**
- If no SMS arrives, check Supabase logs: Dashboard → Logs → Auth
- Verify phone number format (must include country code with +)
- Check Twilio logs if using Twilio
- Ensure phone provider is enabled in Supabase

### 6. Test Apple Sign-In

**Test Flow (iOS only):**
1. Open the app on iOS device or simulator
2. Click "Sign in with Apple" button
3. Apple authentication modal appears
4. Sign in with Apple ID
5. You should be logged in

**Note:** Apple Sign-In only works on iOS devices and simulators, not on Android or web.

---

## 🔧 CURRENT IMPLEMENTATION STATUS

### ✅ What's Implemented:
- Phone number input with international format
- OTP verification screen with 6-digit code entry
- Apple Sign-In button (iOS only)
- Session persistence with AsyncStorage
- Protected routes (redirect to login if not authenticated)
- Auto-navigation after successful authentication
- Resend OTP functionality with cooldown timer
- Error handling and user feedback

### ❌ What's NOT Working (Until You Complete Setup):
- SMS sending (phone provider disabled)
- OTP verification (no SMS sent)
- Apple Sign-In (not configured)
- User account creation via phone
- Session creation

---

## 📱 PHONE NUMBER FORMAT

**Required Format: E.164**
- Format: `+[country code][number]`
- Examples:
  - US: `+15551234567`
  - UK: `+447700900000`
  - India: `+919876543210`

**The app will:**
- Validate phone format before sending
- Store in E.164 format in database
- Display with country flag in UI

---

## 🔐 SECURITY NOTES

1. **Rate Limiting**: Supabase has built-in rate limiting (5 OTP/hour per phone)
2. **OTP Expiry**: Codes expire after 60 seconds by default
3. **Session Storage**: Sessions stored securely in AsyncStorage
4. **RLS Policies**: Database has Row Level Security enabled

---

## 🧪 TESTING CHECKLIST

After completing setup, test:

- [ ] Phone signup (new user)
- [ ] Phone login (existing user)
- [ ] OTP verification (correct code)
- [ ] OTP verification (wrong code)
- [ ] Resend OTP functionality
- [ ] Apple Sign-In (iOS only)
- [ ] Session persistence (close and reopen app)
- [ ] Logout and re-login
- [ ] Protected routes (redirect to login when not authenticated)

---

## 📞 SUPPORT

If you encounter issues:

1. **Check Supabase Logs**: Dashboard → Logs → Auth
2. **Check Phone Provider**: Dashboard → Authentication → Providers → Phone
3. **Verify SMS Provider**: Check Twilio/MessageBird/Vonage logs
4. **Test with Different Phone**: Some carriers block automated SMS

---

## 🚀 NEXT STEPS

1. **Complete Steps 1-4 above** (Enable phone auth, configure SMS provider, configure Apple Sign-In)
2. **Test the authentication flow** using the checklist
3. **Report any issues** with specific error messages from logs

**DO NOT mark authentication as "done" until you can:**
- Send and receive SMS codes
- Verify OTP and create session
- Stay logged in after app restart
- Sign in with Apple (iOS)
