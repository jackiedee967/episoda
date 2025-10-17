
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import SettingsModal from '@/components/SettingsModal';
import FollowersModal from '@/components/FollowersModal';
import { currentUser, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { NotificationPreferences, SocialLink } from '@/types';
import * as Haptics from 'expo-haptics';
import { Settings } from 'lucide-react-native';

type Tab = 'posts' | 'shows' | 'playlists';

export default function ProfileScreen() {
  const router = useRouter();
  const { posts, followUser, unfollowUser, isFollowing, getAllReposts } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    newFollower: true,
    postLiked: true,
    postCommented: true,
    commentReplied: true,
    mentioned: true,
    friendPosted: true,
    friendActivity: true,
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Get user's original posts
  const userPosts = posts.filter((p) => p.user.id === currentUser.id);
  
  // Get all reposts and filter for current user's reposts
  const allReposts = getAllReposts();
  const userReposts = allReposts.filter(repost => repost.repostedBy.id === currentUser.id);
  
  // Combine and sort by timestamp (using repost timestamp for reposts, not original post timestamp)
  const allUserActivity = [
    ...userPosts.map(post => ({ 
      post, 
      isRepost: false, 
      timestamp: post.timestamp,
      repostedBy: undefined
    })),
    ...userReposts.map(repost => ({ 
      post: repost.post, 
      isRepost: true, 
      timestamp: repost.timestamp, // Use the repost timestamp, not the original post timestamp
      repostedBy: { id: currentUser.id, displayName: currentUser.displayName }
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  console.log('Profile - User posts:', userPosts.length);
  console.log('Profile - User reposts:', userReposts.length);
  console.log('Profile - Total activity:', allUserActivity.length);

  const handleShowFollowers = () => {
    setFollowersType('followers');
    setShowFollowersModal(true);
  };

  const handleShowFollowing = () => {
    setFollowersType('following');
    setShowFollowingModal(true);
  };

  const handleSaveSettings = (data: {
    displayName: string;
    username: string;
    bio: string;
    socialLinks: SocialLink[];
    notificationPreferences: NotificationPreferences;
  }) => {
    console.log('Saving settings:', data);
    setSocialLinks(data.socialLinks);
    setNotificationPreferences(data.notificationPreferences);
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
  };

  const handleLogout = () => {
    console.log('Logging out...');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Pressable
          style={styles.settingsButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSettingsModal(true);
          }}
        >
          <Settings size={24} color={colors.text} />
        </Pressable>
      </View>

      <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
      <Text style={styles.displayName}>{currentUser.displayName}</Text>
      <Text style={styles.username}>@{currentUser.username}</Text>
      {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

      <View style={styles.statsContainer}>
        <Pressable style={styles.statItem} onPress={handleShowFollowers}>
          <Text style={styles.statValue}>{currentUser.followers?.length || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={handleShowFollowing}>
          <Text style={styles.statValue}>{currentUser.following?.length || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{currentUser.episodesWatchedCount || 0}</Text>
          <Text style={styles.statLabel}>Episodes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{currentUser.totalLikesReceived || 0}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <Pressable
        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('posts');
        }}
      >
        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
          Posts
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'shows' && styles.activeTab]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('shows');
        }}
      >
        <Text style={[styles.tabText, activeTab === 'shows' && styles.activeTabText]}>
          Shows
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab('playlists');
        }}
      >
        <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
          Playlists
        </Text>
      </Pressable>
    </View>
  );

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      {allUserActivity.length > 0 ? (
        allUserActivity.map((item, index) => (
          <PostCard 
            key={`${item.post.id}-${item.isRepost ? 'repost' : 'post'}-${index}`} 
            post={item.post}
            isRepost={item.isRepost}
            repostedBy={item.repostedBy}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="bubble.left" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            Start logging shows to see your posts here!
          </Text>
          <Pressable style={styles.logShowButton} onPress={() => setShowPostModal(true)}>
            <Text style={styles.logShowButtonText}>Log your first show</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          {renderTabs()}
          {activeTab === 'posts' && renderPostsTab()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        displayName={currentUser.displayName}
        username={currentUser.username}
        bio={currentUser.bio || ''}
        socialLinks={socialLinks}
        notificationPreferences={notificationPreferences}
        authMethod="apple"
        onSave={handleSaveSettings}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
      />

      <FollowersModal
        visible={showFollowersModal || showFollowingModal}
        onClose={() => {
          setShowFollowersModal(false);
          setShowFollowingModal(false);
        }}
        users={mockUsers}
        title={followersType === 'followers' ? 'Followers' : 'Following'}
        currentUserId={currentUser.id}
        followingIds={currentUser.following || []}
        onFollowToggle={(userId) => {
          if (isFollowing(userId)) {
            unfollowUser(userId);
          } else {
            followUser(userId);
          }
        }}
      />

      <PostModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: colors.card,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  settingsButton: {
    padding: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.secondary,
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  logShowButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logShowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
