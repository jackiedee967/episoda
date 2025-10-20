
# Testing Guide - Follow Buttons & Data Persistence

## 🧪 How to Test the Fixes

### Prerequisites
- App is running in development mode
- Developer console is open
- You have access to Supabase dashboard

---

## Test 1: Follow Button Click Detection

**Purpose:** Verify that clicking the follow button triggers the function

**Steps:**
1. Open the app
2. Go to any user profile
3. Open developer console
4. Click the "Follow" button
5. Look for console logs

**Expected Console Output:**
```
🔵 followUser called for userId: [user-id]
```

**If you see this:** ✅ Button click is working

**If you don't see this:** ❌ Button click handler is not connected

---

## Test 2: Authentication Status Check

**Purpose:** Verify if user is authenticated in Supabase

**Steps:**
1. Open the app
2. Look at console logs on app startup
3. Find authentication status message

**Expected Console Output (Authenticated):**
```
✅ User authenticated in Supabase: [user-id]
Loading follow data from Supabase for user: [user-id]
✅ Loaded following from Supabase: X users
```

**Expected Console Output (Not Authenticated):**
```
⚠️ No authenticated user - using mock data only
```

**What This Means:**
- ✅ Authenticated: Database writes will work
- ⚠️ Not Authenticated: Only local storage will work, user will see alerts

---

## Test 3: Follow Button Database Write

**Purpose:** Verify that following a user saves to the database

**Steps:**
1. Ensure you're authenticated (see Test 2)
2. Go to any user profile
3. Click "Follow" button
4. Watch console logs
5. Check Supabase database

**Expected Console Output:**
```
🔵 followUser called for userId: [user-id]
💾 Saving follow to Supabase...
   follower_id: [your-user-id]
   following_id: [target-user-id]
✅ Follow saved to Supabase: [data]
✅ Follow verified in database: [data]
✅ Follow completed successfully
```

**Database Check:**
```sql
SELECT * FROM follows ORDER BY created_at DESC LIMIT 5;
```

**Expected Result:**
- New row with your follower_id and target following_id
- created_at timestamp is recent

**If database write fails:**
```
❌ Error following user in Supabase: [error]
   Error code: [code]
   Error message: [message]
```

---

## Test 4: Follow Button UI Update

**Purpose:** Verify that the button changes state after following

**Steps:**
1. Go to any user profile
2. Note the button says "Follow"
3. Click the button
4. Wait for loading to complete

**Expected Behavior:**
- Button shows loading spinner briefly
- Button changes to "Following" with gray background
- Button remains clickable

**If button doesn't change:**
- Check console for errors
- Verify followUser function completed successfully

---

## Test 5: Follower Count Update

**Purpose:** Verify that follower/following counts update

**Steps:**
1. Note the current follower count on target user's profile
2. Click "Follow" button
3. Check if count increases

**Expected Behavior:**
- Target user's follower count increases by 1
- Your following count increases by 1

**Note:** Counts may require page refresh to update. This is expected if real-time updates aren't implemented.

---

## Test 6: Followers List Update

**Purpose:** Verify that you appear in the user's followers list

**Steps:**
1. Follow a user
2. Go to their profile
3. Click "Followers" button
4. Look for your username in the list

**Expected Behavior:**
- You appear in their followers list
- Your avatar, username, and display name are shown
- Follow button next to your name shows "Following"

---

## Test 7: Unfollow Button

**Purpose:** Verify that unfollowing works

**Steps:**
1. Follow a user (if not already following)
2. Click the "Following" button
3. Watch console logs
4. Check database

**Expected Console Output:**
```
🔴 unfollowUser called for userId: [user-id]
💾 Removing follow from Supabase...
   follower_id: [your-user-id]
   following_id: [target-user-id]
✅ Unfollow removed from Supabase
✅ Unfollow verified - records found: 0
✅ Unfollow completed successfully
```

**Database Check:**
```sql
SELECT * FROM follows 
WHERE follower_id = '[your-user-id]' 
AND following_id = '[target-user-id]';
```

**Expected Result:**
- No rows returned (follow relationship deleted)

**UI Check:**
- Button changes back to "Follow"
- Follower count decreases by 1

---

## Test 8: Follow Persistence Across Refresh

**Purpose:** Verify that follow state persists after app refresh

**Steps:**
1. Follow a user
2. Verify button shows "Following"
3. Pull down to refresh the page
4. Check if button still shows "Following"

**Expected Behavior:**
- Button remains "Following" after refresh
- Follower counts remain correct
- User still appears in followers list

**If state is lost:**
- Check if user is authenticated
- Check console for database load errors
- Verify follow was saved to database

---

## Test 9: Follow Persistence Across App Restart

**Purpose:** Verify that follow state persists after closing and reopening the app

**Steps:**
1. Follow a user
2. Close the app completely
3. Reopen the app
4. Navigate to the user's profile
5. Check button state

**Expected Behavior:**
- Button shows "Following"
- Follower counts are correct
- User appears in followers list

**If state is lost:**
- User is not authenticated (using mock data)
- Database connection failed
- Check console logs on app startup

---

## Test 10: Followers Modal Follow Buttons

**Purpose:** Verify that follow buttons work in the followers/following popup

**Steps:**
1. Go to any user profile
2. Click "Followers" or "Following"
3. Modal opens with list of users
4. Click follow button next to any user
5. Watch console logs

**Expected Console Output:**
```
FollowersModal - handleFollowToggle called for userId: [user-id]
FollowersModal - Current following state: false
🔵 followUser called for userId: [user-id]
💾 Saving follow to Supabase...
✅ Follow saved to Supabase
FollowersModal - Follow toggle completed successfully
```

**Expected Behavior:**
- Button changes from "Follow" to "Following"
- Loading spinner shows briefly
- Button remains clickable
- No errors in console

---

## Test 11: Playlist Creation

**Purpose:** Verify that playlists save to database

**Steps:**
1. Go to any show page
2. Click save/bookmark icon
3. Click "Create New Playlist"
4. Enter playlist name
5. Click create
6. Watch console logs

**Expected Console Output:**
```
📝 Creating playlist: [name]
💾 Saving playlist to Supabase...
✅ Playlist created in Supabase: [uuid]
✅ Show added to playlist
```

**Database Check:**
```sql
SELECT * FROM playlists ORDER BY created_at DESC LIMIT 5;
```

**Expected Result:**
- New playlist row with your user_id
- created_at timestamp is recent

---

## Test 12: Playlist Persistence

**Purpose:** Verify that playlists survive code changes

**Steps:**
1. Create a playlist named "Test Persistence"
2. Note the playlist ID from console logs
3. Make ANY code change (add a comment somewhere)
4. Save the file (triggers hot reload)
5. Go to your profile
6. Check playlists tab

**Expected Behavior:**
- Playlist "Test Persistence" still exists
- Shows are still in the playlist
- Playlist is still public/private as set

**Database Check:**
```sql
SELECT * FROM playlists WHERE name = 'Test Persistence';
```

**Expected Result:**
- Playlist row still exists
- Data is unchanged

---

## Test 13: Error Handling - Not Authenticated

**Purpose:** Verify that users see helpful messages when not authenticated

**Steps:**
1. Ensure you're NOT authenticated (see Test 2)
2. Try to follow a user
3. Watch for alert message

**Expected Behavior:**
- Alert appears: "Authentication Required"
- Message: "Please log in to follow users. Your follow will be saved locally for now."
- Button still changes to "Following" (local state)
- Console shows: `⚠️ No authenticated user - cannot follow`

---

## Test 14: Error Handling - Database Failure

**Purpose:** Verify that database errors are reported to user

**Steps:**
1. Temporarily disconnect from internet
2. Try to follow a user
3. Watch for error message

**Expected Behavior:**
- Alert appears: "Follow Failed"
- Message includes error details
- Console shows detailed error logs
- Button reverts to "Follow" state

---

## 🎯 Quick Test Checklist

Use this checklist to quickly verify all functionality:

### Follow Buttons
- [ ] Click follow button → console logs appear
- [ ] Follow button → saves to database
- [ ] Follow button → changes to "Following"
- [ ] Follower count increases
- [ ] User appears in followers list
- [ ] Unfollow button → removes from database
- [ ] Unfollow button → changes to "Follow"
- [ ] Follow state persists after refresh
- [ ] Follow state persists after app restart
- [ ] Follow buttons work in followers modal
- [ ] Follow buttons work in following modal

### Data Persistence
- [ ] Create playlist → saves to database
- [ ] Playlist persists after code change
- [ ] Playlist persists after app restart
- [ ] Playlist shows correct show count
- [ ] Can add shows to playlist
- [ ] Can remove shows from playlist
- [ ] Can delete playlist
- [ ] Can toggle playlist privacy

### Error Handling
- [ ] Not authenticated → shows alert
- [ ] Database error → shows alert
- [ ] Console logs are detailed
- [ ] Errors don't crash app

---

## 🐛 Common Issues & Solutions

### Issue: "No console logs appear"
**Solution:** 
- Open developer console (Cmd+J on Mac, Ctrl+Shift+J on Windows)
- Make sure console is set to show all logs (not just errors)
- Try clicking the button again

### Issue: "Button doesn't change state"
**Solution:**
- Check console for errors
- Verify followUser function completed
- Check if user is authenticated
- Try refreshing the page

### Issue: "Database write fails"
**Solution:**
- Check if user is authenticated (see Test 2)
- Verify Supabase connection is working
- Check RLS policies allow the operation
- Look for detailed error in console

### Issue: "Follow state lost after refresh"
**Solution:**
- User is not authenticated (using mock data)
- Check if follow was saved to database
- Verify loadFollowDataFromSupabase is called on startup

### Issue: "Playlists disappear after code change"
**Solution:**
- Check if user is authenticated
- Verify playlist was saved to database (check console logs)
- Check if loadPlaylists is called on app startup
- Look for database errors in console

---

## 📊 Database Queries for Verification

Use these SQL queries in Supabase dashboard to verify data:

### Check Follows
```sql
-- All follows
SELECT * FROM follows ORDER BY created_at DESC;

-- Follows for specific user
SELECT * FROM follows WHERE follower_id = '[user-id]';

-- Count of follows
SELECT COUNT(*) FROM follows;
```

### Check Playlists
```sql
-- All playlists
SELECT * FROM playlists ORDER BY created_at DESC;

-- Playlists for specific user
SELECT * FROM playlists WHERE user_id = '[user-id]';

-- Playlists with shows
SELECT p.*, COUNT(ps.show_id) as show_count
FROM playlists p
LEFT JOIN playlist_shows ps ON p.id = ps.playlist_id
GROUP BY p.id;
```

### Check Profiles
```sql
-- All profiles
SELECT * FROM profiles ORDER BY created_at DESC;

-- Specific profile
SELECT * FROM profiles WHERE user_id = '[user-id]';
```

---

## ✅ Success Criteria

The fixes are working correctly if:

1. **Follow Buttons:**
   - ✅ Console logs appear on button click
   - ✅ Database row is created/deleted
   - ✅ Button state changes correctly
   - ✅ Counts update correctly
   - ✅ State persists across refresh/restart

2. **Data Persistence:**
   - ✅ Playlists save to database
   - ✅ Playlists survive code changes
   - ✅ Playlists survive app restarts
   - ✅ All CRUD operations work

3. **Error Handling:**
   - ✅ Users see helpful error messages
   - ✅ Console logs are detailed
   - ✅ App doesn't crash on errors

If all tests pass, the critical bugs are fixed! 🎉
