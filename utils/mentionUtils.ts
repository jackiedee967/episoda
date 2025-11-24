import { supabase } from '@/integrations/supabase/client';

/**
 * Extract @username mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map((m) => m.substring(1)) : [];
}

/**
 * Get user IDs for given usernames
 */
export async function getUserIdsByUsernames(usernames: string[]): Promise<Map<string, string>> {
  if (usernames.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', usernames);

  if (error) {
    console.error('Error fetching user IDs:', error);
    return new Map();
  }

  const userMap = new Map<string, string>();
  data?.forEach((user) => {
    userMap.set(user.username, user.user_id);
  });

  return userMap;
}

/**
 * Save post mentions to database
 */
export async function savePostMentions(
  postId: string,
  usernames: string[]
): Promise<boolean> {
  if (usernames.length === 0) {
    return true;
  }

  try {
    const userMap = await getUserIdsByUsernames(usernames);

    const mentions = Array.from(userMap.entries()).map(([username, userId]) => ({
      post_id: postId,
      mentioned_user_id: userId,
      mentioned_username: username,
    }));

    if (mentions.length > 0) {
      const { error } = await supabase
        .from('post_mentions')
        .insert(mentions);

      if (error) {
        console.error('Error saving post mentions:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in savePostMentions:', error);
    return false;
  }
}

/**
 * Save comment mentions to database
 */
export async function saveCommentMentions(
  commentId: string,
  usernames: string[]
): Promise<boolean> {
  if (usernames.length === 0) {
    return true;
  }

  try {
    const userMap = await getUserIdsByUsernames(usernames);

    const mentions = Array.from(userMap.entries()).map(([username, userId]) => ({
      comment_id: commentId,
      mentioned_user_id: userId,
      mentioned_username: username,
    }));

    if (mentions.length > 0) {
      const { error } = await supabase
        .from('comment_mentions')
        .insert(mentions);

      if (error) {
        console.error('Error saving comment mentions:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveCommentMentions:', error);
    return false;
  }
}

/**
 * Save help desk post mentions to database
 */
export async function saveHelpDeskPostMentions(
  postId: string,
  usernames: string[]
): Promise<boolean> {
  if (usernames.length === 0) {
    return true;
  }

  try {
    const mentions = usernames.map((username) => ({
      post_id: postId,
      mentioned_username: username,
    }));

    if (mentions.length > 0) {
      const { error } = await supabase
        .from('help_desk_post_mentions')
        .insert(mentions);

      if (error) {
        console.error('Error saving help desk post mentions:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveHelpDeskPostMentions:', error);
    return false;
  }
}

/**
 * Save help desk comment mentions to database
 */
export async function saveHelpDeskCommentMentions(
  commentId: string,
  usernames: string[]
): Promise<boolean> {
  if (usernames.length === 0) {
    return true;
  }

  try {
    const userMap = await getUserIdsByUsernames(usernames);

    const mentions = Array.from(userMap.entries()).map(([username, userId]) => ({
      comment_id: commentId,
      mentioned_user_id: userId,
      mentioned_username: username,
    }));

    if (mentions.length > 0) {
      const { error } = await supabase
        .from('help_desk_comment_mentions')
        .insert(mentions);

      if (error) {
        console.error('Error saving help desk comment mentions:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveHelpDeskCommentMentions:', error);
    return false;
  }
}

/**
 * Create notifications for mentioned users
 */
export async function createMentionNotifications(
  mentionedUserIds: string[],
  actorId: string,
  type: 'mention_comment' | 'mention_post',
  postId?: string,
  commentId?: string
): Promise<boolean> {
  if (mentionedUserIds.length === 0) {
    return true;
  }

  try {
    const notifications = mentionedUserIds
      // Don't notify the actor if they mentioned themselves
      .filter((userId) => userId !== actorId)
      .map((userId) => ({
        user_id: userId,
        type,
        actor_id: actorId,
        post_id: postId || null,
        comment_id: commentId || null,
        is_read: false,
      }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating mention notifications:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in createMentionNotifications:', error);
    return false;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 20) {
  const { data, error} = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      actor_id,
      post_id,
      comment_id,
      is_read,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
}
