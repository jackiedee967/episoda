# Push Notifications Setup Guide

This guide walks you through setting up push notifications for EPISODA using Expo and Supabase.

## Prerequisites

1. **Apple Developer Account** (paid) - Required for iOS push notifications
2. **EAS Build** - You're already using this for app builds
3. **Supabase CLI** - For deploying Edge Functions

## Step 1: APNs Key Setup (Apple Developer)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **Keys** → **Create a key**
3. Name it (e.g., "EPISODA Push Key")
4. Check **Apple Push Notifications service (APNs)**
5. Download the `.p8` file (keep it safe - you can only download once!)
6. Note your **Key ID** and **Team ID**

## Step 2: EAS Credentials Setup

When you run your next EAS build, it will prompt you to set up push credentials:

```bash
eas build --platform ios
```

During the build, when prompted:
- Select **Yes** to generate a new Apple Provisioning Profile
- Upload your APNs key (`.p8` file)
- Enter your Key ID and Team ID

Or configure manually:
```bash
eas credentials
# Select iOS → Push Notifications → Upload .p8 file
```

## Step 3: Get Expo Access Token

1. Go to [Expo Access Tokens](https://expo.dev/accounts/[your-account]/settings/access-tokens)
2. Create a new token with "Enhanced Security for Push Notifications" enabled
3. Copy the token value

## Step 4: Deploy Supabase Edge Function

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login to Supabase
```bash
supabase login
```

### Link your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Set secrets
```bash
supabase secrets set EXPO_ACCESS_TOKEN="your_expo_access_token_here"
```

### Deploy the function
```bash
supabase functions deploy push --no-verify-jwt
```

## Step 5: Create Database Webhook

1. Go to **Supabase Dashboard** → **Database** → **Webhooks**
2. Create a new webhook:
   - **Name**: `push_notification_webhook`
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **Type**: `Supabase Edge Functions`
   - **Function**: `push`
   - **HTTP Headers**: Add `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

## Step 6: Database Columns (Already Added)

The following columns have been added to the `profiles` table:
- `expo_push_token` (TEXT) - Stores the user's Expo push token
- `notification_preferences` (JSONB) - Stores user's notification settings

## How It Works

1. **User Grants Permission**: During onboarding, users see a permission request screen
2. **Token Saved**: When granted, the Expo push token is saved to their profile
3. **Event Occurs**: When someone likes a post, a row is inserted into `notifications`
4. **Webhook Fires**: The database webhook triggers the Edge Function
5. **Preferences Checked**: The function checks if the user has this notification type enabled
6. **Push Sent**: If enabled, the notification is sent via Expo Push Service to APNs

## Notification Types

| Type | Description | Preferences Key |
|------|-------------|-----------------|
| `like` | Someone likes your post | `likes` |
| `comment` | Someone comments on your post | `comments` |
| `follow` | Someone follows you | `follows` |
| `mention_post` | Mentioned in a post | `mentions` |
| `mention_comment` | Mentioned in a comment | `mentions` |
| `admin_announcement` | Team announcements | `admin_announcements` |
| `friend_logs_watched_show` | Friend logs show you've watched | `friend_logs_watched_show` |
| `friend_logs_playlist_show` | Friend logs show from your playlist | `friend_logs_playlist_show` |

## Testing

### Test with Expo Push Tool
1. Get a push token from your app console logs
2. Go to [expo.dev/notifications](https://expo.dev/notifications)
3. Paste the token and send a test notification

### Test via Database
```sql
INSERT INTO notifications (user_id, type, actor_id)
VALUES ('target-user-id', 'like', 'actor-user-id');
```

## Troubleshooting

### No notification received?
1. Check if the user has a push token: `SELECT expo_push_token FROM profiles WHERE user_id = '...'`
2. Check notification preferences: `SELECT notification_preferences FROM profiles WHERE user_id = '...'`
3. Check Edge Function logs in Supabase Dashboard
4. Verify the webhook is configured correctly

### Token issues?
- Push notifications only work on physical devices
- iOS Simulator doesn't support APNs
- Make sure you're using an EAS development or production build

## Files

- `supabase/functions/push/index.ts` - Edge Function for sending push notifications
- `app/auth/notification-permission.tsx` - Permission request screen
- `app/settings/notifications.tsx` - Notification preferences settings
- `types/index.ts` - NotificationPreferences interface
