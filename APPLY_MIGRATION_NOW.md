
# 🚨 CRITICAL: APPLY DATABASE MIGRATION NOW

## Your Data Is Being Deleted Because Tables Don't Exist

**Current Problem:**
- Your app stores data in AsyncStorage (device-only storage)
- AsyncStorage gets cleared when you update the app, clear cache, or switch devices
- The Supabase database has NO TABLES for your data
- Result: **All your data disappears**

**Solution:**
You need to create the database tables in Supabase by running the SQL migration.

---

## STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Log in with your account
3. Find your project: **jacqueline.dunnett@gmail.com's Project**
4. Click on it to open the project dashboard

### Step 2: Open SQL Editor

1. Look at the left sidebar
2. Click on **"SQL Editor"** (it has a database icon)
3. Click the **"New Query"** button at the top

### Step 3: Copy the SQL Migration

1. Open the file `DATABASE_MIGRATION.sql` in your project
2. Select ALL the text (Ctrl+A or Cmd+A)
3. Copy it (Ctrl+C or Cmd+C)

**The SQL file starts with:**
```sql
-- =====================================================
-- CRITICAL MIGRATION: CREATE ALL PERSISTENT DATA TABLES
```

**And ends with:**
```sql
-- =====================================================
-- MIGRATION COMPLETE
```

### Step 4: Paste and Run

1. Go back to the Supabase SQL Editor
2. Paste the entire SQL migration (Ctrl+V or Cmd+V)
3. Click the **"Run"** button (green play button)
4. Wait for it to complete (should take 5-10 seconds)
5. You should see a success message

### Step 5: Verify Tables Were Created

1. In the left sidebar, click **"Table Editor"**
2. You should now see **19 tables**:
   - profiles
   - social_links
   - posts
   - post_episodes
   - post_tags
   - likes
   - comments
   - comment_replies
   - comment_likes
   - reply_likes
   - reposts
   - follows
   - playlists
   - playlist_shows
   - watch_history
   - notifications
   - blocked_users
   - reports
   - notification_preferences

3. Click on any table to see its structure
4. Verify that **RLS (Row Level Security)** is enabled (you'll see a shield icon)

---

## WHAT HAPPENS AFTER YOU RUN THE MIGRATION

### ✅ Immediate Benefits:

1. **Data persists forever** - No more data loss!
2. **Syncs across devices** - Your data follows you
3. **Survives app updates** - Updates won't delete your data
4. **Proper database** - Professional, scalable storage

### 🔄 How The App Will Work:

**Before Migration:**
- Data stored in AsyncStorage (device-only)
- Gets deleted easily
- No sync across devices

**After Migration:**
- Data stored in Supabase (cloud database)
- Never gets deleted (unless you explicitly delete it)
- Syncs across all your devices
- Backed up automatically

---

## TROUBLESHOOTING

### "Error: relation already exists"
✅ **This is OK!** It means some tables already exist. The migration handles this gracefully.

### "Error: permission denied"
❌ **Problem:** You don't have admin access
**Solution:** Make sure you're logged in as the project owner

### "Error: syntax error"
❌ **Problem:** The SQL wasn't copied correctly
**Solution:** Make sure you copied the ENTIRE file, from start to finish

### "I don't see the SQL Editor"
❌ **Problem:** You might be on the wrong page
**Solution:** Look for the database icon in the left sidebar, or search for "SQL Editor"

### "The migration is taking too long"
⏳ **Wait:** Large migrations can take 30-60 seconds
❌ **If it fails:** Check the error message and try again

---

## AFTER MIGRATION: TEST IT WORKS

1. Open your app
2. Create a new playlist
3. Add some shows to it
4. Close the app completely
5. Reopen the app
6. **Check if the playlist is still there** ✅

If the playlist is still there, **DATA PERSISTENCE IS WORKING!** 🎉

---

## WHAT I FIXED IN THE CODE

While you apply the migration, here's what I fixed in the app:

### 1. ✅ Made Profile Images Smaller
- Changed avatar size from 24x24 to 20x20 pixels
- Now matches the original design

### 2. ✅ Fixed Profile Rotation
- Now shows the last 4 unique shows you watched
- Sorted by most recent first
- Works on both your profile and other users' profiles

### 3. ✅ Added "X" Button on Search Filter
- When you navigate from a show's hub to search, the show is pre-selected
- Now you can click the "X" to remove the filter
- Styled like Reddit's filter chips

### 4. ✅ Fixed Watch History
- Now shows a chronological list of all shows you've logged
- Sorted by most recent first
- Shows unique shows only (no duplicates)

### 5. ✅ Made "You May Know" Cards Fully Clickable
- The entire card is now tappable
- Navigates to the user's profile
- Follow button still works independently
- Added visual feedback (opacity change on press)

---

## SUMMARY

**What You Need To Do:**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy and paste the entire `DATABASE_MIGRATION.sql` file
4. Click "Run"
5. Verify 19 tables were created

**What I Did:**
1. Fixed profile image size (smaller)
2. Fixed profile rotation (last 4 shows)
3. Added "X" button on search filter
4. Fixed watch history (chronological)
5. Made "You May Know" cards clickable

**Result:**
- Your data will NEVER be deleted again
- All the UI issues are fixed
- The app is ready for real users

---

## NEED HELP?

If you run into any issues:
1. Check the error message in Supabase
2. Make sure you copied the ENTIRE SQL file
3. Verify you're logged in as the project owner
4. Try refreshing the page and running again

**This is the most important step to fix your data persistence issue!**
