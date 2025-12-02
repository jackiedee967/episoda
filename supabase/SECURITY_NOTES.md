# EPISODA Security Notes

## Security Hardening Completed (December 2025)

### 1. API Key Security
- **FIXED**: Removed hardcoded Trakt API key from `app.config.js` and `config/env.ts`
- All API keys now loaded from environment variables only
- Debug console logs that exposed key lengths have been removed

### 2. Admin Authorization
- **VERIFIED**: All 13 admin RPC functions check `is_current_user_admin()` before execution
- Functions secured: `get_admin_stats`, `get_admin_reports`, `resolve_post_report`, `suspend_user`, `unsuspend_user`, `admin_search_users`, `get_flagged_content`, `review_flagged_post`, `review_flagged_comment`, `get_error_stats`, `get_recent_errors`, `resolve_error`

### 3. Admin Column Protection
- **MIGRATION**: `010_protect_admin_columns.sql` adds triggers to prevent users from:
  - Setting `is_admin` to true on their own profile
  - Modifying `is_suspended`, `suspended_at`, `suspended_reason` columns
  - Only admins can modify these columns

### 4. Input Length Validation
- **MIGRATION**: `011_input_length_validation.sql` adds server-side constraints:
  - Posts: title ≤200 chars, body ≤5000 chars
  - Comments: ≤2000 chars
  - Profiles: username 3-50 chars, display_name ≤100 chars, bio ≤500 chars
  - Playlists: name 1-100 chars
  - Reports: reason ≤1000 chars

### 5. RLS Policies
- **VERIFIED**: All 20+ tables have RLS enabled
- Proper user ownership policies in place
- Notifications table secured to prevent actor_id spoofing

### 6. Rate Limiting (IMPLEMENTED)
- **MIGRATION**: `012_rate_limiting.sql` creates rate limiting infrastructure
- **SERVICE**: `services/rateLimiting.ts` provides client-side rate limit checks

Rate limits implemented:
| Action | Limit | Window |
|--------|-------|--------|
| OTP requests | 3 per phone | 1 hour |
| Post creation | 20 per user | 1 hour |
| Comment creation | 60 per user | 1 hour |
| Follow requests | 100 per user | 1 hour |
| Report submissions | 10 per user | 24 hours |

Integration points:
- `app/auth/login.tsx` - OTP rate limiting
- `app/auth/verify-otp.tsx` - Resend OTP rate limiting
- `contexts/DataContext.tsx` - Post and follow rate limiting
- `app/post/[id].tsx` - Comment rate limiting

### 7. SecureStore for Auth Tokens (IMPLEMENTED)
- **SERVICE**: `services/secureStorage.ts` provides encrypted storage adapter
- Auth tokens now stored using SecureStore on iOS/Android (encrypted)
- Falls back to AsyncStorage on web for compatibility
- Updated `integrations/supabase/client.ts` to use SecureStorageAdapter

### 8. Content Sanitization / XSS Prevention (IMPLEMENTED)
- **SERVICE**: `services/contentModeration.ts` enhanced with:
  - `sanitizeText()` - Full HTML escape for storage
  - `sanitizeForDisplay()` - Strip dangerous tags for display
  - `containsDangerousContent()` - Detect potential XSS vectors

Protected against:
- `<script>` tag injection
- `javascript:` URL schemes
- Event handler injection (onclick, onerror, etc.)
- `<iframe>`, `<embed>`, `<object>` injection
- Data URI attacks

---

## Certificate Pinning (Not Implemented)

Certificate pinning requires native code modifications which are not compatible with Expo managed workflow. To implement:

1. **Option A: Development Build**
   - Switch to Expo development builds
   - Use `react-native-ssl-pinning` library
   - Add native configuration in app.json/app.config.js

2. **Option B: Custom Dev Client**
   - Generate custom Expo Dev Client
   - Include SSL pinning in native code

For now, the app relies on:
- TLS 1.3 encryption (standard)
- Supabase's certificate management
- Platform-level certificate validation

---

## NPM Vulnerability Status

The following vulnerabilities exist but are in **development/build tools only** (not runtime code):

| Package | Severity | Used By | Notes |
|---------|----------|---------|-------|
| glob | High | workbox-cli | CLI tool only |
| got | Moderate | workbox-cli | CLI tool only |
| node-forge | High | expo-cli tools | Build-time only |
| js-yaml | Moderate | istanbul | Test tool only |
| tmp | High | inquirer | CLI prompts only |

**Cannot fix automatically** due to React Native/Expo peer dependency conflicts. These vulnerabilities:
- Do NOT affect the production mobile app
- Only present in development/build environment
- Will be resolved when Expo upgrades dependencies

---

## Deployment Reminder

When deploying to production:
1. Run migrations `010_protect_admin_columns.sql`, `011_input_length_validation.sql`, and `012_rate_limiting.sql` in BOTH dev and prod databases
2. Verify admin columns protection is working
3. Test that input validation constraints are enforced
4. Verify rate limiting is functioning correctly
5. Confirm SecureStore is working on device (requires device/simulator testing)
