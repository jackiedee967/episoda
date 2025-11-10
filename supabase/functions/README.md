# Supabase Edge Functions

This directory contains Supabase Edge Functions for the EPISODA (Natively) app.

## Functions

### delete-account

Handles account deletion with proper authentication and cleanup. This function requires service-role access to delete auth users.

**Endpoint:** `POST /functions/v1/delete-account`

**Process:**
1. Validates the user's JWT token from the Authorization header
2. Deletes the user's profile (CASCADE automatically removes all related data: posts, likes, comments, reposts, follows)
3. Deletes the auth user record using admin privileges
4. Returns success response

**Security:**
- Requires valid Authorization header with Bearer token
- Uses service-role key for admin operations
- Only the authenticated user can delete their own account

## Deployment

### Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link to project: `supabase link --project-ref mbwuoqoktdgudzaemjhx`

### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy delete-account
```

### Environment Variables
The functions automatically have access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (automatically provided)

### Testing Locally
```bash
# Start local Supabase (optional)
supabase start

# Serve functions locally
supabase functions serve delete-account

# Test with curl
curl -X POST http://localhost:54321/functions/v1/delete-account \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## Important Notes

- **Database CASCADE:** All user data (posts, likes, comments, reposts, follows) is automatically deleted when the profile is deleted due to `ON DELETE CASCADE` constraints in the database schema.
- **Service Role:** The `delete-account` function requires service-role key to delete auth users. This is automatically provided in the edge function environment.
- **No Undo:** Account deletion is permanent and cannot be undone.

## Troubleshooting

If you get deployment errors:
1. Verify you're logged in: `supabase login`
2. Check project linkage: `supabase link --project-ref mbwuoqoktdgudzaemjhx`
3. Ensure you have proper permissions on the Supabase project
4. Check function logs: `supabase functions logs delete-account`
