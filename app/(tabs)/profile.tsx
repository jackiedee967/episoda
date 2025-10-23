
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles, typography, spacing, components } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import FollowersModal from '@/components/FollowersModal';
import TabSelector, { Tab as TabSelectorTab } from '@/components/TabSelector';
import Button from '@/components/Button';
import { currentUser, mockUsers, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import * as Haptics from 'expo-haptics';
import { Settings, Eye, EyeOff } from 'lucide-react-native';
import { Show } from '@/types';

type Tab = 'posts' | 'shows' | 'playlists';

export default function ProfileScreen() {
  const router = useRouter();
  const { 
    posts, 
    followUser, 
    unfollowUser, 
    isFollowing, 
    getAllReposts, 
    playlists, 
    loadPlaylists, 
    updatePlaylistPrivacy, 
    createPlaylist,
    getFollowers,
    getFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    currentUser: contextCurrentUser
  } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  useEffect(() => {
    loadPlaylists();
    loadStats();
    loadFollowData();
  }, [loadPlaylists]);

  const loadStats = async () => {
    try {
      const episodesCount = await getEpisodesWatchedCount(currentUser.id);
      const likesCount = await getTotalLikesReceived(currentUser.id);
      setEpisodesWatched(episodesCount);
      setTotalLikes(likesCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFollowData = async () => {
    try {
      console.log('ProfileScreen - Loading follow data for user:', currentUser.id);
      const followersData = await getFollowers(currentUser.id);
      const followingData = await getFollowing(currentUser.id);
      console.log('ProfileScreen - Followers:', followersData.length);
      console.log('ProfileScreen - Following:', followingData.length);
      setFollowers(followersData);
      setFollowing(followingData);
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const userPosts = posts.filter((p) => p.user.id === currentUser.id);
  
  const allReposts = getAllReposts();
  const userReposts = allReposts.filter(repost => repost.repostedBy.id === currentUser.id);
  
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
      timestamp: repost.timestamp,
      repostedBy: { id: currentUser.id, displayName: currentUser.displayName }
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getMyRotation = (): Show[] => {
    const userShowPosts = posts.filter((p) => p.user.id === currentUser.id);
    
    const sortedPosts = [...userShowPosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    const uniqueShows: Show[] = [];
    const seenShowIds = new Set<string>();
    
    for (const post of sortedPosts) {
      if (!seenShowIds.has(post.show.id)) {
        uniqueShows.push(post.show);
        seenShowIds.add(post.show.id);
        
        if (uniqueShows.length === 4) {
          break;
        }
      }
    }
    
    return uniqueShows;
  };

  const myRotation = getMyRotation();

  const getWatchHistory = (): Show[] => {
    const userShowPosts = posts.filter((p) => p.user.id === currentUser.id);
    
    const sortedPosts = [...userShowPosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    const uniqueShows: Show[] = [];
    const seenShowIds = new Set<string>();
    
    for (const post of sortedPosts) {
      if (!seenShowIds.has(post.show.id)) {
        uniqueShows.push(post.show);
        seenShowIds.add(post.show.id);
      }
    }
    
    return uniqueShows;
  };

  const watchHistory = getWatchHistory();

  console.log('Profile - User posts:', userPosts.length);
  console.log('Profile - User reposts:', userReposts.length);
  console.log('Profile - Total activity:', allUserActivity.length);
  console.log('Profile - Playlists:', playlists.length);
  console.log('Profile - My Rotation:', myRotation.length, myRotation.map(s => s.title));
  console.log('Profile - Watch History:', watchHistory.length, watchHistory.map(s => s.title));

  const handleShowFollowers = () => {
    setFollowersType('followers');
    setShowFollowersModal(true);
  };

  const handleShowFollowing = () => {
    setFollowersType('following');
    setShowFollowingModal(true);
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handlePlaylistToggle = async (playlistId: string, isPublic: boolean) => {
    try {
      await updatePlaylistPrivacy(playlistId, isPublic);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error updating playlist privacy:', error);
    }
  };

  const handleSharePlaylist = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share Playlist', 'Deep link copied to clipboard!');
  };

  const handlePlaylistPress = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/playlist/${playlistId}`);
  };

  const handleFollowToggle = async (userId: string) => {
    console.log('ProfileScreen - handleFollowToggle called for userId:', userId);
    console.log('ProfileScreen - Currently following?', isFollowing(userId));
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (isFollowing(userId)) {
        console.log('ProfileScreen - Unfollowing user...');
        await unfollowUser(userId);
      } else {
        console.log('ProfileScreen - Following user...');
        await followUser(userId);
      }
      
      console.log('ProfileScreen - Follow action completed, reloading follow data...');
      
      await loadFollowData();
      
      console.log('ProfileScreen - Follow data reloaded successfully');
    } catch (error) {
      console.error('ProfileScreen - Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    }
  };

  const tabs: TabSelectorTab[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'shows', label: 'Shows' },
    { key: 'playlists', label: 'Playlists' },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Button
          variant="ghost"
          size="small"
          onPress={handleSettingsPress}
          style={styles.settingsButton}
        >
          <Settings size={20} color={colors.almostWhite} />
        </Button>
      </View>

      <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
      <Text style={styles.displayName}>{currentUser.displayName}</Text>
      <Text style={styles.username}>@{currentUser.username}</Text>
      {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

      <View style={styles.statsContainer}>
        <Pressable style={styles.statItem} onPress={handleShowFollowers}>
          <Text style={styles.statValue}>{followers.length}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={handleShowFollowing}>
          <Text style={styles.statValue}>{following.length}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{episodesWatched}</Text>
          <Text style={styles.statLabel}>Episodes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>
    </View>
  );

  const renderMyRotation = () => {
    if (myRotation.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Rotation</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rotationScroll}>
          {myRotation.map((show) => (
            <Pressable
              key={show.id}
              style={styles.rotationPoster}
              onPress={() => router.push(`/show/${show.id}`)}
            >
              <Image source={{ uri: show.poster }} style={styles.posterImage} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

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
          <IconSymbol name="bubble.left" size={48} color={colors.grey1} />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            Start logging shows to see your posts here!
          </Text>
          <Button variant="primary" onPress={() => setShowPostModal(true)}>
            Log your first show
          </Button>
        </View>
      )}
    </View>
  );

  const renderShowsTab = () => (
    <View style={styles.tabContent}>
      {watchHistory.length > 0 ? (
        <View style={styles.showsGrid}>
          {watchHistory.map((show) => (
            <Pressable
              key={show.id}
              style={styles.showGridItem}
              onPress={() => router.push(`/show/${show.id}`)}
            >
              <Image source={{ uri: show.poster }} style={styles.showGridPoster} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="tv" size={48} color={colors.grey1} />
          <Text style={styles.emptyStateTitle}>No shows yet</Text>
          <Text style={styles.emptyStateText}>
            Start logging shows to see them here!
          </Text>
          <Button variant="primary" onPress={() => setShowPostModal(true)}>
            Log your first show
          </Button>
        </View>
      )}
    </View>
  );

  const renderPlaylistsTab = () => (
    <View style={styles.tabContent}>
      {playlists.length > 0 ? (
        <>
          {playlists.map((playlist) => {
            const showCount = playlist.shows?.length || 0;
            return (
              <Pressable
                key={playlist.id}
                style={({ pressed }) => [
                  styles.playlistItem,
                  pressed && styles.playlistItemPressed,
                ]}
                onPress={() => handlePlaylistPress(playlist.id)}
              >
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{playlist.name}</Text>
                  <Text style={styles.playlistCount}>
                    {showCount} {showCount === 1 ? 'show' : 'shows'}
                  </Text>
                </View>
                <View style={styles.playlistActions}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePlaylistToggle(playlist.id, !playlist.isPublic);
                    }}
                  >
                    {playlist.isPublic ? (
                      <Eye size={20} color={colors.almostWhite} />
                    ) : (
                      <EyeOff size={20} color={colors.grey1} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.iconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSharePlaylist(playlist.id);
                    }}
                  >
                    <IconSymbol name="square.and.arrow.up" size={20} color={colors.almostWhite} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={colors.grey1} />
          <Text style={styles.emptyStateTitle}>No playlists yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first playlist to organize your shows!
          </Text>
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
          {renderMyRotation()}
          
          <View style={styles.tabSelectorContainer}>
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabKey) => setActiveTab(tabKey as Tab)}
              variant="default"
            />
          </View>

          {activeTab === 'posts' && renderPostsTab()}
          {activeTab === 'shows' && renderShowsTab()}
          {activeTab === 'playlists' && renderPlaylistsTab()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <FollowersModal
        visible={showFollowersModal || showFollowingModal}
        onClose={() => {
          setShowFollowersModal(false);
          setShowFollowingModal(false);
        }}
        users={followersType === 'followers' ? followers : following}
        title={followersType === 'followers' ? 'Followers' : 'Following'}
        currentUserId={currentUser.id}
        followingIds={following.map(u => u.id)}
        onFollowToggle={handleFollowToggle}
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
    padding: spacing.pageMargin,
    paddingTop: 60,
    backgroundColor: colors.cardBackground,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.gapLarge,
  },
  settingsButton: {
    padding: 0,
    minHeight: 0,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.gapLarge,
  },
  displayName: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapSmall,
  },
  username: {
    ...typography.subtitle,
    color: colors.grey1,
    marginBottom: spacing.gapSmall,
  },
  bio: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    marginBottom: spacing.gapLarge,
    paddingHorizontal: spacing.pageMargin,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.gapXLarge,
    marginTop: spacing.gapMedium,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleL,
    color: colors.almostWhite,
  },
  statLabel: {
    ...typography.smallSubtitle,
    color: colors.grey1,
    marginTop: spacing.gapSmall,
  },
  section: {
    padding: spacing.pageMargin,
  },
  sectionTitle: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapLarge,
  },
  rotationScroll: {
    marginHorizontal: -spacing.pageMargin,
    paddingHorizontal: spacing.pageMargin,
  },
  rotationPoster: {
    width: 120,
    height: 180,
    borderRadius: components.borderRadiusButton,
    marginRight: spacing.gapMedium,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  tabSelectorContainer: {
    paddingHorizontal: spacing.pageMargin,
    marginBottom: spacing.gapLarge,
  },
  tabContent: {
    paddingHorizontal: spacing.pageMargin,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.sectionSpacing,
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  emptyStateTitle: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginTop: spacing.gapLarge,
    marginBottom: spacing.gapSmall,
  },
  emptyStateText: {
    ...typography.p1,
    color: colors.grey1,
    textAlign: 'center',
    marginBottom: spacing.gapLarge,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapMedium,
  },
  showGridItem: {
    width: '31%',
    aspectRatio: 2 / 3,
    borderRadius: components.borderRadiusTag,
    overflow: 'hidden',
  },
  showGridPoster: {
    width: '100%',
    height: '100%',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    marginBottom: spacing.gapMedium,
  },
  playlistItemPressed: {
    opacity: 0.7,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginBottom: spacing.gapSmall,
  },
  playlistCount: {
    ...typography.p1,
    color: colors.grey1,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.gapSmall,
    backgroundColor: colors.pageBackground,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
});
