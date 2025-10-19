
# DATABASE SETUP INSTRUCTIONS - CRITICAL

## ⚠️ IMMEDIATE ACTION REQUIRED

Your data is being deleted because the database tables don't exist yet. Follow these steps to set up the database properly.

## WHY DATA IS BEING DELETED

**Current State:**
- ✅ Supabase client is configured
- ❌ Database tables DO NOT EXIST
- ❌ Data is stored in AsyncStorage (device-only, gets cleared)
- ❌ No persistent database storage

**Result:** Every time you update the app or clear data, everything is lost.

## SOLUTION: CREATE DATABASE TABLES

### Option 1: Using Supabase Dashboard (RECOMMENDED)

1. Go to https://supabase.com/dashboard
2. Select your project: `mbwuoqoktdgudzaemjhx`
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the ENTIRE SQL migration from the file `DATABASE_MIGRATION.sql` (see below)
6. Click "Run" to execute the migration
7. Verify tables were created in the "Table Editor"

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref mbwuoqoktdgudzaemjhx

# Create a new migration file
supabase migration new create_all_tables

# Copy the SQL from DATABASE_MIGRATION.sql into the migration file

# Apply the migration
supabase db push
```

## WHAT TABLES WILL BE CREATED

The migration creates these tables:

1. **profiles** - User profiles
2. **social_links** - User social media links
3. **posts** - All user posts/logs
4. **post_episodes** - Episodes in posts
5. **post_tags** - Tags for posts
6. **likes** - Post likes
7. **comments** - Post comments
8. **comment_replies** - Replies to comments
9. **comment_likes** - Likes on comments
10. **reply_likes** - Likes on replies
11. **reposts** - Post reposts
12. **follows** - User follows
13. **playlists** - User playlists
14. **playlist_shows** - Shows in playlists
15. **watch_history** - User watch history
16. **notifications** - User notifications
17. **blocked_users** - Blocked users
18. **reports** - User reports
19. **notification_preferences** - Notification settings

## AFTER MIGRATION

Once the migration is complete:

✅ All user data will persist across app updates
✅ Data will survive app reinstalls (when logged in)
✅ Data will sync across devices
✅ No more data loss!

## VERIFY IT WORKED

1. Open Supabase Dashboard
2. Go to "Table Editor"
3. You should see all 19 tables listed
4. Click on any table to see its structure
5. Check that RLS (Row Level Security) is enabled

## TROUBLESHOOTING

### "Error: relation already exists"
- This is OK! It means some tables already exist
- The migration uses `CREATE TABLE IF NOT EXISTS` so it won't break

### "Error: permission denied"
- Make sure you're logged in to Supabase
- Make sure you have admin access to the project

### "Error: syntax error"
- Make sure you copied the ENTIRE SQL migration
- Don't modify the SQL unless you know what you're doing

## NEXT STEPS

After the migration is complete:

1. The app will automatically start using Supabase for all data
2. Existing AsyncStorage data will be used as fallback
3. New data will be saved to Supabase
4. You can optionally migrate existing AsyncStorage data to Supabase

## IMPORTANT NOTES

- **NEVER drop these tables** - Only add columns if needed
- **NEVER clear the database** - Data should only be deleted by users
- **Always use migrations** - Don't manually edit tables in production
- **Test in development first** - Make sure migrations work before deploying

## CONTACT

If you have issues:
1. Check the Supabase dashboard for error logs
2. Check the app console for error messages
3. Verify your Supabase connection is working
4. Make sure you're authenticated (if required)
