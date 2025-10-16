
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { Notification } from '@/types';
import { mockUsers, mockPosts, mockShows, currentUser } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

type Tab = 'you' | 'friends';

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'like',
    actor: mockUsers[0],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    post: mockPosts[2],
  },
  {
    id: 'notif-2',
    type: 'comment',
    actor: mockUsers[1],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: false,
    post: mockPosts[2],
  },
  {
    id: 'notif-3',
    type: 'follow',
    actor: mockUsers[2],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    targetUser: currentUser,
  },
  {
    id: 'notif-4',
    type: 'repost',
    actor: mockUsers[3],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    read: true,
    post: mockPosts[2],
  },
  {
    id: 'notif-5',
    type: 'like',
    actor: mockUsers[4],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    read: true,
    post: mockPosts[2],
  },
];

const mockFriendNotifications: Notification[] = [
  {
    id: 'friend-notif-1',
    type: 'friend_post',
    actor: mockUsers[0],
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    read: false,
    post: mockPosts[0],
  },
  {
    id: 'friend-notif-2',
    type: 'friend_follow',
    actor: mockUsers[1],
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    read: false,
    targetUser: mockUsers[2],
  },
  {
    id: 'friend-notif-3',
    type: 'friend_like',
    actor: mockUsers[2],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    read: true,
    post: mockPosts[1],
  },
  {
    id: 'friend-notif-4',
    type: 'friend_comment',
    actor: mockUsers[3],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    read: true,
    post: mockPosts[0],
  },
  {
    id: 'friend-notif-5',
    type: 'friend_post',
    actor: mockUsers[4],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    post: mockPosts[3],
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('you');

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const getNotificationText = (notification: Notification): string => {
    switch (notification.type) {
      case 'like':
        return `liked your post${notification.post?.title ? ` "${notification.post.title}"` : ''}`;
      case 'comment':
        return `commented on your post${notification.post?.title ? ` "${notification.post.title}"` : ''}`;
      case 'follow':
        return 'started following you';
      case 'repost':
        return `reposted your post${notification.post?.title ? ` "${notification.post.title}"` : ''}`;
      case 'friend_post':
        return `posted about ${notification.post?.show.title}`;
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
        return notification.targetUser?.avatar || notification.actor.avatar;
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
          ? notification.actor.id 
          : notification.targetUser?.id;
        if (userId) {
          router.push(`/user/${userId}`);
        }
        break;
    }
  };

  const renderNotification = (notification: Notification) => {
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

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <Pressable
        style={[styles.tab, activeTab === 'you' && styles.activeTab]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('you');
        }}
      >
        <Text style={[styles.tabText, activeTab === 'you' && styles.activeTabText]}>
          You
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('friends');
        }}
      >
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
          Friends
        </Text>
      </Pressable>
    </View>
  );

  const notifications = activeTab === 'you' ? mockNotifications : mockFriendNotifications;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {renderTabs()}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.text,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  unreadNotification: {
    backgroundColor: colors.cardBackground,
  },
  actorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  actorName: {
    fontWeight: '600',
    color: colors.text,
  },
  actionText: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: 20,
    right: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
