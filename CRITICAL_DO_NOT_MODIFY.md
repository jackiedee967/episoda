# CRITICAL: DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL

## Authentication Files - ZERO TOLERANCE FOR REGRESSIONS

**These files require explicit user approval before ANY changes:**

### Core Authentication
- `integrations/supabase/client.ts` - Supabase client initialization (PRODUCTION CRITICAL)
- `contexts/AuthContext.tsx` - Authentication state management
- `app/auth/**` - All authentication screens and flows

### Configuration Files
- `app.config.js` - Expo configuration (affects production builds)
- Any file that modifies environment variable loading

## Why This Matters

**Recent Regression Example (Nov 2024):**
- Agent removed `Constants.manifest?.extra` fallback from Supabase client
- Caused production builds to use DEV Supabase instance instead of PROD
- Broke 2FA (SMS OTP) for all users because DEV doesn't have Twilio configured
- Production app was down until fix was deployed

## Rules Before Modifying Auth/Config

1. **ASK THE USER FIRST** - Get explicit approval
2. **Understand production vs development** - Changes affect real users
3. **Test in production-like environment** - Dev working ≠ production working
4. **Never assume something is "just cleanup"** - Every line exists for a reason

## Production Environment Facts

- `Constants.expoConfig.extra` - Works in dev/web
- `Constants.manifest.extra` - Required for production iOS/Android builds
- **BOTH are needed** - Removing either breaks production

## Zero Tolerance Policy

This is an active production app with real users. Breaking authentication is unacceptable.

**If you're unsure, STOP and ASK THE USER.**
