
import { Settings, Eye, EyeOff } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import PostCard from '@/components/PostCard';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { currentUser, mockUsers, mockShows } from '@/data/mockData';
import { Show } from '@/types';
import React, { useState, useEffect } from 'react';
import { colors, commonStyles } from '@/styles/commonStyles';
import { Stack, useRouter } from 'expo-router';
import FollowersModal from '@/components/FollowersModal';
import PostModal from '@/components/PostModal';

type Tab = 'posts' | 'shows' | 'playlists';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
  const [showPostModal, setShowPostModal] = useState(false);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const {
    posts,
    playlists,
    loadPlaylists,
    updatePlaylistPrivacy,
    isFollowing,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowerCount,
    getFollowingCount,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    refreshFollowData,
  } = useData();

  const router = useRouter();

  useEffect(() => {
    loadPlaylists();
    loadStats();
    loadFollowData();
  }, [loadPlaylists]);

  const loadStats = async () => {
    try {
      const episodes = await getEpisodesWatchedCount(currentUser.id);
      const likes = await getTotalLikesReceived(currentUser.id);
      setEpisodesWatched(episodes);
      setTotalLikes(likes);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFollowData = async () => {
    try {
      console.log('📊 Profile - Loading follow data...');
      
      const [followers, following, followerCnt, followingCnt] = await Promise.all([
        getFollowers(currentUser.id),
        getFollowing(currentUser.id),
        getFollowerCount(currentUser.id),
        getFollowingCount(currentUser.id),
      ]);

      console.log('✅ Profile - Follow data loaded:');
      console.log('   Followers:', followers.length);
      console.log('   Following:', following.length);
      console.log('   Follower count:', followerCnt);
      console.log('   Following count:', followingCnt);

      setFollowersList(followers);
      setFollowingList(following);
      setFollowerCount(followerCnt);
      setFollowingCount(followingCnt);
    } catch (error) {
      console.error('❌ Profile - Error loading follow data:', error);
    }
  };

  const getMyRotation = (): Show[] => {
    return mockShows.slice(0, 3);
  };

  const getWatchHistory = (): Show[] => {
    return mockShows.slice(3, 9);
  };

  const handleShowFollowers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowersModalType('followers');
    setShowFollowersModal(true);
  };

  const handleShowFollowing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowersModalType('following');
    setShowFollowersModal(true);
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handlePlaylistToggle = async (playlistId: string, isPublic: boolean) => {
    try {
      await updatePlaylistPrivacy(playlistId, !isPublic);
      await loadPlaylists();
    } catch (error) {
      console.error('Error toggling playlist privacy:', error);
      Alert.alert('Error', 'Failed to update playlist privacy');
    }
  };

  const handleSharePlaylist = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share Playlist', 'Sharing functionality coming soon!');
  };

  const handlePlaylistPress = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/playlist/${playlistId}`);
  };

  const handleFollowToggle = async (userId: string) => {
    console.log('🔄 Profile - handleFollowToggle called for userId:', userId);
    
    try {
      const following = isFollowing(userId);
      console.log('   Current following state:', following);

      if (following) {
        console.log('   Calling unfollowUser...');
        await unfollowUser(userId);
      } else {
        console.log('   Calling followUser...');
        await followUser(userId);
      }

      console.log('✅ Profile - Follow toggle completed, refreshing data...');
      
      // Refresh follow data to update counts and lists
      await refreshFollowData();
      await loadFollowData();
      
      console.log('✅ Profile - Data refreshed');
    } catch (error) {
      console.error('❌ Profile - Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.profileInfo}>
        <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        <View style={styles.nameContainer}>
          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.username}>@{currentUser.username}</Text>
        </View>
        <Pressable onPress={handleSettingsPress} style={styles.settingsButton}>
          <Settings size={24} color={colors.text} />
        </Pressable>
      </View>

      {currentUser.bio && (
        <Text style={styles.bio}>{currentUser.bio}</Text>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{episodesWatched}</Text>
          <Text style={styles.statLabel}>Episodes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <Pressable style={styles.statItem} onPress={handleShowFollowers}>
          <Text style={styles.statValue}>{followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={handleShowFollowing}>
          <Text style={styles.statValue}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMyRotation = () => {
    const rotation = getMyRotation();
    return (
      <View style={styles.rotationContainer}>
        <Text style={styles.sectionTitle}>My Rotation</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rotationScroll}>
          {rotation.map((show) => (
            <Pressable
              key={show.id}
              style={styles.rotationItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/show/${show.id}`);
              }}
            >
              <Image source={{ uri: show.poster }} style={styles.rotationPoster} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
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

  const renderPostsTab = () => {
    const userPosts = posts.filter(post => post.user.id === currentUser.id);
    
    if (userPosts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No posts yet</Text>
          <Pressable
            style={styles.createButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPostModal(true);
            }}
          >
            <Text style={styles.createButtonText}>Create your first post</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.postsContainer}>
        {userPosts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </View>
    );
  };

  const renderShowsTab = () => {
    const watchHistory = getWatchHistory();
    
    return (
      <View style={styles.showsGrid}>
        {watchHistory.map((show) => (
          <Pressable
            key={show.id}
            style={styles.showItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/show/${show.id}`);
            }}
          >
            <Image source={{ uri: show.poster }} style={styles.showPoster} />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderPlaylistsTab = () => {
    const userPlaylists = playlists.filter(p => p.userId === currentUser.id);

    if (userPlaylists.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No playlists yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.playlistsContainer}>
        {userPlaylists.map((playlist) => (
          <Pressable
            key={playlist.id}
            style={styles.playlistItem}
            onPress={() => handlePlaylistPress(playlist.id)}
          >
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <Text style={styles.playlistCount}>{playlist.shows.length} shows</Text>
            </View>
            <View style={styles.playlistActions}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePlaylistToggle(playlist.id, playlist.isPublic);
                }}
                style={styles.iconButton}
              >
                {playlist.isPublic ? (
                  <Eye size={20} color={colors.textSecondary} />
                ) : (
                  <EyeOff size={20} color={colors.textSecondary} />
                )}
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleSharePlaylist(playlist.id);
                }}
                style={styles.iconButton}
              >
                <IconSymbol name="square.and.arrow.up" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderMyRotation()}
        {renderTabs()}
        {activeTab === 'posts' && renderPostsTab()}
        {activeTab === 'shows' && renderShowsTab()}
        {activeTab === 'playlists' && renderPlaylistsTab()}
      </ScrollView>

      <FollowersModal
        visible={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        users={followersModalType === 'followers' ? followersList : followingList}
        title={followersModalType === 'followers' ? 'Followers' : 'Following'}
        currentUserId={currentUser.id}
        followingIds={followingList.map(u => u.id)}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  nameContainer: {
    flex: 1,
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
  },
  settingsButton: {
    padding: 8,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rotationContainer: {
    paddingVertical: 20,
    paddingLeft: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  rotationScroll: {
    flexDirection: 'row',
  },
  rotationItem: {
    marginRight: 12,
  },
  rotationPoster: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.text,
  },
  postsContainer: {
    padding: 20,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  showItem: {
    width: '31%',
  },
  showPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  playlistsContainer: {
    padding: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.secondary,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
