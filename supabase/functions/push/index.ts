import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    actor_id: string;
    post_id?: string;
    comment_id?: string;
    is_read: boolean;
    created_at: string;
  };
  schema: 'public';
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
}

const NOTIFICATION_TYPE_MAP: Record<string, { titleTemplate: string; bodyTemplate: string; preferencesKey: string }> = {
  like: {
    titleTemplate: 'New Like',
    bodyTemplate: '{actor} liked your post',
    preferencesKey: 'likes',
  },
  comment: {
    titleTemplate: 'New Comment',
    bodyTemplate: '{actor} commented on your post',
    preferencesKey: 'comments',
  },
  follow: {
    titleTemplate: 'New Follower',
    bodyTemplate: '{actor} started following you',
    preferencesKey: 'follows',
  },
  mention_post: {
    titleTemplate: 'You were mentioned',
    bodyTemplate: '{actor} mentioned you in a post',
    preferencesKey: 'mentions',
  },
  mention_comment: {
    titleTemplate: 'You were mentioned',
    bodyTemplate: '{actor} mentioned you in a comment',
    preferencesKey: 'mentions',
  },
  admin_announcement: {
    titleTemplate: 'EPISODA Update',
    bodyTemplate: 'New announcement from the EPISODA team',
    preferencesKey: 'admin_announcements',
  },
  friend_logs_watched_show: {
    titleTemplate: 'Friend Activity',
    bodyTemplate: '{actor} logged a show you\'ve watched',
    preferencesKey: 'friend_logs_watched_show',
  },
  friend_logs_playlist_show: {
    titleTemplate: 'Friend Activity',
    bodyTemplate: '{actor} logged a show from your playlist',
    preferencesKey: 'friend_logs_playlist_show',
  },
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getActorUsername(actorId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('user_id', actorId)
    .single();
  
  return data?.display_name || data?.username || 'Someone';
}

async function getUserPushToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('user_id', userId)
    .single();
  
  return data?.expo_push_token || null;
}

async function getUserNotificationPreferences(userId: string): Promise<Record<string, boolean> | null> {
  const { data } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('user_id', userId)
    .single();
  
  return data?.notification_preferences || null;
}

async function sendPushNotification(message: PushMessage): Promise<Response> {
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  
  if (expoAccessToken) {
    headers['Authorization'] = `Bearer ${expoAccessToken}`;
  }
  
  return await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });
}

Deno.serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();
    
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Only INSERT events are processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const notification = payload.record;
    const notificationType = notification.type;
    
    const typeConfig = NOTIFICATION_TYPE_MAP[notificationType];
    if (!typeConfig) {
      return new Response(JSON.stringify({ message: `Unknown notification type: ${notificationType}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const pushToken = await getUserPushToken(notification.user_id);
    if (!pushToken) {
      return new Response(JSON.stringify({ message: 'No push token found for user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const preferences = await getUserNotificationPreferences(notification.user_id);
    if (preferences && preferences[typeConfig.preferencesKey] === false) {
      return new Response(JSON.stringify({ message: 'User has disabled this notification type' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    let actorName = 'Someone';
    if (notification.actor_id) {
      actorName = await getActorUsername(notification.actor_id);
    }
    
    const title = typeConfig.titleTemplate;
    const body = typeConfig.bodyTemplate.replace('{actor}', actorName);
    
    const message: PushMessage = {
      to: pushToken,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data: {
        notificationId: notification.id,
        type: notificationType,
        postId: notification.post_id,
        commentId: notification.comment_id,
        actorId: notification.actor_id,
      },
    };
    
    const response = await sendPushNotification(message);
    const result = await response.json();
    
    console.log('Push notification sent:', {
      userId: notification.user_id,
      type: notificationType,
      result,
    });
    
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing push notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
