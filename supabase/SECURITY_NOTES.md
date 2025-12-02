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

---

## Rate Limiting Recommendations (Future Implementation)

Rate limiting should be implemented at the Supabase Edge Function level or via API gateway. Priority areas:

### HIGH Priority

1. **Phone OTP Requests**
   - Risk: SMS bombing attacks, carrier costs
   - Recommendation: 3 requests per phone number per hour
   - Implementation: Edge function with Redis/Supabase rate limit table

2. **Post Creation**
   - Risk: Spam flooding
   - Recommendation: 20 posts per user per hour
   - Implementation: RPC function with rate check

3. **Comment Creation**
   - Risk: Comment spam
   - Recommendation: 60 comments per user per hour

### MEDIUM Priority

4. **Follow Requests**
   - Recommendation: 100 follows per user per hour

5. **Report Submissions**
   - Recommendation: 10 reports per user per day

### Implementation Options

**Option A: Supabase Rate Limit Table**
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  action_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action_type, window_start)
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN...
```

**Option B: Supabase Edge Function with Upstash Redis**
- Use Upstash Redis for distributed rate limiting
- Better for high-traffic scenarios

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
1. Run migrations `010_protect_admin_columns.sql` and `011_input_length_validation.sql` in BOTH dev and prod databases
2. Verify admin columns protection is working
3. Test that input validation constraints are enforced
