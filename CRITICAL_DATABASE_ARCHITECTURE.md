
# CRITICAL: DATABASE ARCHITECTURE & DATA PERSISTENCE

## WHY DATA WAS BEING DELETED

### The Problem:
Your app was using a **BROKEN HYBRID STORAGE SYSTEM**:

1. **AsyncStorage (Device Storage)** - Stored:
   - Posts
   - User data (following/followers)
   - Reposts
   - Comment counts
   
   **PROBLEM**: AsyncStorage is cleared when:
   - App is uninstalled/reinstalled
   - App data is cleared
   - Device is switched
   - iOS/Android clears cache
   - App updates in certain scenarios

2. **Supabase (Database)** - Only stored:
   - Playlists (partially implemented)
   
   **PROBLEM**: No tables existed for most data types!

3. **Mock Data (In-Memory)** - Used as fallback
   
   **PROBLEM**: Resets every time app restarts!

### The Solution:
**ALL user-generated data MUST be stored in Supabase with proper migrations.**

---

## DATABASE SCHEMA

### Required Tables:

1. **profiles** - User profile information
2. **posts** - All user posts/logs
3. **post_episodes** - Episodes associated with posts
4. **post_tags** - Tags for posts
5. **likes** - Post likes
6. **comments** - Post comments
7. **comment_replies** - Replies to comments
8. **reposts** - Post reposts
9. **follows** - User follow relationships
10. **playlists** - User playlists (already exists)
11. **playlist_shows** - Shows in playlists (already exists)
12. **watch_history** - User watch history
13. **notifications** - User notifications
14. **blocked_users** - Blocked user relationships
15. **reports** - User reports

---

## MIGRATION STRATEGY

### Rules:
1. **NEVER drop tables** - Only add columns or create new tables
2. **Use ALTER TABLE ADD COLUMN** - Never recreate tables
3. **Preserve existing data** - Always use IF NOT EXISTS
4. **Use proper RLS policies** - Secure all tables
5. **Test migrations** - Verify data persists after migration

### Migration Order:
1. Create profiles table (if not exists)
2. Create posts table (if not exists)
3. Create relationship tables (likes, comments, follows, etc.)
4. Add RLS policies to all tables
5. Migrate existing AsyncStorage data to Supabase (one-time)

---

## DATA PERSISTENCE GUARANTEES

### What MUST Persist:
✅ User profiles and settings
✅ All posts/logs
✅ All playlists and playlist items
✅ All likes
✅ All follows
✅ All comments and replies
✅ All reposts
✅ Watch history
✅ Notifications
✅ User preferences

### What CAN Be Cleared:
❌ Cache data (images, thumbnails)
❌ Temporary UI state
❌ Session tokens (handled by Supabase auth)

### What Should NEVER Be Deleted:
🚫 User-generated content (posts, playlists, comments)
🚫 Social relationships (follows, likes)
🚫 User history (watch history, activity)
🚫 User settings and preferences

---

## IMPLEMENTATION STATUS

### ✅ Completed:
- Supabase client setup
- Playlist tables with RLS
- AsyncStorage as cache layer

### 🚧 In Progress:
- Creating all database tables
- Implementing RLS policies
- Migrating data operations to Supabase

### ⏳ To Do:
- Migrate existing AsyncStorage data to Supabase
- Implement offline sync
- Add data backup/export features

---

## TESTING DATA PERSISTENCE

### How to Verify:
1. Create a post/playlist/like
2. Close the app completely
3. Reopen the app
4. Verify data is still there
5. Uninstall and reinstall the app
6. Login with same account
7. Verify data is still there

### Expected Behavior:
- Data persists across app restarts ✅
- Data persists across app updates ✅
- Data persists across device changes ✅
- Data only deleted when user explicitly deletes it ✅

---

## CONTACT FOR ISSUES

If data is being deleted:
1. Check Supabase dashboard for table existence
2. Check RLS policies are not blocking access
3. Check console logs for database errors
4. Verify Supabase connection is active
5. Check if migrations were applied successfully

**This is a PRODUCTION-CRITICAL system. Data loss is UNACCEPTABLE.**
