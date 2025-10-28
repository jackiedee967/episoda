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
import { Stack, useRouter } from 'expo-router';
import TabSelector, { Tab as TabType } from '@/components/TabSelector';
import { Notification } from '@/types';
import { mockUsers, mockPosts, currentUser, mockComments } from '@/data/mockData';
import * as Haptics from 'expo-haptics';
import tokens from '@/styles/tokens';

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
    return `S${episode.seasonNumber} E${episode.episodeNumber}`;
  };

  const getNotificationText = (notification: Notification): string => {
    if (!notification.actor) {
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
        return `commented: "${commentPreview}"`;
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
            ? `watched ${episodeStr} of ${showTitle}: "${postTitle}"`
            : `watched ${episodeStr} of ${showTitle}`;
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
    // Follow notifications don't show thumbnails
    if (notification.type === 'follow' || notification.type === 'friend_follow') {
      return null;
    }
    
    // All other notifications show the show poster
    return notification.post?.show.poster || null;
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
      return null;
    }

    const thumbnail = getThumbnail(notification);
    
    return (
      <Pressable
        key={notification.id}
        style={({ pressed }) => [styles.notificationCard, pressed && styles.pressed]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.cardContent}>
          <Image
            source={{ uri: notification.actor.avatar }}
            style={styles.actorAvatar}
          />
          <View style={styles.textContent}>
            <Text style={styles.notificationText} numberOfLines={2}>
              <Text style={styles.actorName}>{notification.actor.displayName}</Text>
              {' '}
              {getNotificationText(notification)}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(notification.timestamp)}</Text>
          </View>
        </View>
        
        {thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
          />
        )}
      </Pressable>
    );
  };

  const tabs: TabType[] = [
    { key: 'you', label: 'You' },
    { key: 'friends', label: 'Friend Activity' },
  ];

  // Get notifications and sort by most recent
  const notifications = (activeTab === 'you' ? mockNotifications : mockFriendNotifications)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
        </View>

        <View style={styles.tabSelectorWrapper}>
          <TabSelector
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as Tab)}
            variant="default"
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
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
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: tokens.colors.pageBackground,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    marginBottom: 18,
  },
  tabSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 15,
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  cardContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  actorAvatar: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  textContent: {
    flex: 1,
    gap: 5,
  },
  notificationText: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
    color: tokens.colors.pureWhite,
    letterSpacing: -0.24,
  },
  actorName: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.pureWhite,
    letterSpacing: -0.24,
  },
  timestamp: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginTop: 18,
  },
  emptyStateSubtext: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginTop: 8,
    textAlign: 'center',
  },
});
