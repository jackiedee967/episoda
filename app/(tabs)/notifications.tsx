import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, components } from '@/styles/commonStyles';
import TabSelector, { Tab as TabType } from '@/components/TabSelector';
import { Notification } from '@/types';
import { mockUsers, mockPosts, mockShows, currentUser, mockComments } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

type Tab = 'you' | 'friends';

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('you');

  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      type: 'like',
      actor: mockUsers[0],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
      post: mockPosts[2],
    },
    {
      id: 'notif-2',
      type: 'comment',
      actor: mockUsers[1],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      read: false,
      post: mockPosts[2],
      comment: mockComments[0],
    },
    {
      id: 'notif-3',
      type: 'follow',
      actor: mockUsers[2],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      targetUser: currentUser,
    },
    {
      id: 'notif-4',
      type: 'repost',
      actor: mockUsers[3],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      read: true,
      post: mockPosts[2],
    },
    {
      id: 'notif-5',
      type: 'like',
      actor: mockUsers[4],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      read: true,
      post: mockPosts[2],
    },
  ];

  const mockFriendNotifications: Notification[] = [
    {
      id: 'friend-notif-1',
      type: 'friend_post',
      actor: mockUsers[0],
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      post: mockPosts[0],
    },
    {
      id: 'friend-notif-2',
      type: 'friend_follow',
      actor: mockUsers[1],
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: false,
      targetUser: mockUsers[2],
    },
    {
      id: 'friend-notif-3',
      type: 'friend_like',
      actor: mockUsers[2],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: true,
      post: mockPosts[1],
    },
    {
      id: 'friend-notif-4',
      type: 'friend_comment',
      actor: mockUsers[3],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      read: true,
      post: mockPosts[0],
      comment: mockComments[1],
    },
    {
      id: 'friend-notif-5',
      type: 'friend_post',
      actor: mockUsers[4],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      post: mockPosts[3],
    },
  ];

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const getEpisodeString = (post: any): string => {
    if (!post.episodes || post.episodes.length === 0) return '';
    const episode = post.episodes[0];
    return `S${episode.seasonNumber}E${episode.episodeNumber}`;
  };

  const getNotificationText = (notification: Notification): string => {
    if (!notification.actor) {
      console.log('Notification missing actor:', notification);
      return 'Unknown action';
    }

    switch (notification.type) {
      case 'like':
        return `liked your post${notification.post?.title ? ` "${notification.post.title}"` : ''}`;
      case 'comment':
        const commentPreview = notification.comment?.text 
          ? notification.comment.text.length > 50 
            ? notification.comment.text.substring(0, 50) + '...'
            : notification.comment.text
          : '';
        return `commented on your post: ${commentPreview}`;
      case 'follow':
        return 'started following you';
      case 'repost':
        return `reposted your post${notification.post?.title ? ` "${notification.post.title}"` : ''}`;
      case 'friend_post':
        const episodeStr = getEpisodeString(notification.post);
        const showTitle = notification.post?.show.title || '';
        const postTitle = notification.post?.title;
        
        if (episodeStr) {
          return postTitle 
            ? `just watched ${episodeStr} ${showTitle}: "${postTitle}"`
            : `just watched ${episodeStr} ${showTitle}`;
        }
        return `posted about ${showTitle}`;
      case 'friend_follow':
        return `started following ${notification.targetUser?.displayName}`;
      case 'friend_like':
        return `liked a post about ${notification.post?.show.title}`;
      case 'friend_comment':
        return `commented on a post about ${notification.post?.show.title}`;
      default:
        return '';
    }
  };

  const getThumbnail = (notification: Notification): string | null => {
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'repost':
      case 'friend_post':
      case 'friend_like':
      case 'friend_comment':
        return notification.post?.show.poster || null;
      case 'follow':
      case 'friend_follow':
        return notification.targetUser?.avatar || notification.actor?.avatar || null;
      default:
        return null;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'repost':
      case 'friend_post':
      case 'friend_like':
      case 'friend_comment':
        if (notification.post) {
          router.push(`/post/${notification.post.id}`);
        }
        break;
      case 'follow':
      case 'friend_follow':
        const userId = notification.type === 'follow' 
          ? notification.actor?.id 
          : notification.targetUser?.id;
        if (userId) {
          router.push(`/user/${userId}`);
        }
        break;
    }
  };

  const renderNotification = (notification: Notification) => {
    if (!notification.actor) {
      console.log('Skipping notification with missing actor:', notification.id);
      return null;
    }

    const thumbnail = getThumbnail(notification);
    
    return (
      <Pressable
        key={notification.id}
        style={[
          styles.notificationRow,
          !notification.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <Image
          source={{ uri: notification.actor.avatar }}
          style={styles.actorAvatar}
        />
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.actorName}>{notification.actor.displayName}</Text>
            {' '}
            <Text style={styles.actionText}>{getNotificationText(notification)}</Text>
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(notification.timestamp)}</Text>
        </View>

        {thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
          />
        )}

        {!notification.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  const tabs: TabType[] = [
    { key: 'you', label: 'You' },
    { key: 'friends', label: 'Friends' },
  ];

  const notifications = activeTab === 'you' ? mockNotifications : mockFriendNotifications;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, styles.pageContainer]}>
        <LinearGradient
          colors={['#9333EA', '#FF5E00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientHeader}
        >
          <View style={styles.notificationHeader}>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
        </LinearGradient>
        <View style={styles.tabWrapper}>
          <TabSelector
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as Tab)}
            variant="default"
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>
                {activeTab === 'you' 
                  ? "When someone interacts with your posts, you'll see it here"
                  : "When your friends are active, you'll see it here"}
              </Text>
            </View>
          ) : (
            notifications.map(renderNotification)
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } as any,
    }),
  },
  gradientHeader: {
    width: '100%',
  },
  notificationHeader: {
    paddingHorizontal: spacing.pageMargin,
    paddingTop: 60,
    paddingBottom: spacing.gapLarge,
  },
  headerTitle: {
    ...typography.titleXL,
    color: colors.almostWhite,
  },
  container: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  tabWrapper: {
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.gapMedium,
    backgroundColor: colors.pageBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
    backgroundColor: colors.pageBackground,
  },
  unreadNotification: {
    backgroundColor: colors.cardBackground,
  },
  actorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.gapMedium,
  },
  notificationContent: {
    flex: 1,
    marginRight: spacing.gapMedium,
    gap: spacing.gapSmall / 2,
  },
  notificationText: {
    ...typography.p1,
    color: colors.almostWhite,
  },
  actorName: {
    ...typography.p1Bold,
    color: colors.almostWhite,
  },
  actionText: {
    ...typography.p1,
    color: colors.grey1,
  },
  timestamp: {
    ...typography.smallSubtitle,
    color: colors.grey1,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.greenHighlight,
    position: 'absolute',
    top: spacing.cardPadding + 4,
    right: spacing.pageMargin,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.pageMargin * 2,
    paddingTop: 100,
  },
  emptyStateText: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapSmall,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...typography.subtitle,
    color: colors.grey1,
    textAlign: 'center',
  },
});
