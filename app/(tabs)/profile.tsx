
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import FollowersModal from '@/components/FollowersModal';
import { currentUser, mockUsers, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import * as Haptics from 'expo-haptics';
import { Settings, Eye, EyeOff } from 'lucide-react-native';
import { Show } from '@/types';

type Tab = 'posts' | 'shows' | 'playlists';

export default function ProfileScreen() {
  const router = useRouter();
  const { posts, followUser, unfollowUser, isFollowing, getAllReposts, playlists, loadPlaylists, updatePlaylistPrivacy, createPlaylist } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');

  // Load playlists on mount
  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

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
      timestamp: repost.timestamp,
      repostedBy: { id: currentUser.id, displayName: currentUser.displayName }
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Get last 4 unique shows from user's posts (rotation)
  const getMyRotation = (): Show[] => {
    const userShowPosts = posts.filter((p) => p.user.id === currentUser.id);
    
    // Sort by timestamp (most recent first)
    const sortedPosts = [...userShowPosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    // Get unique shows (last 4)
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

  console.log('Profile - User posts:', userPosts.length);
  console.log('Profile - User reposts:', userReposts.length);
  console.log('Profile - Total activity:', allUserActivity.length);
  console.log('Profile - Playlists:', playlists.length);
  console.log('Profile - My Rotation:', myRotation.length, myRotation.map(s => s.title));

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
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      const playlistShows = mockShows.filter(show => playlist.shows?.includes(show.id));
      const showTitles = playlistShows.map(show => show.title).join('\n');
      Alert.alert(
        playlist.name,
        showTitles || 'No shows in this playlist yet',
        [{ text: 'OK' }]
      );
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Pressable
          style={styles.settingsButton}
          onPress={handleSettingsPress}
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

  const renderMyRotation = () => {
    // Only show rotation section if there are shows to display
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
          Watch History
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

  const renderShowsTab = () => (
    <View style={styles.tabContent}>
      {mockShows.length > 0 ? (
        <View style={styles.showsGrid}>
          {mockShows.map((show) => (
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
          <IconSymbol name="tv" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No shows yet</Text>
          <Text style={styles.emptyStateText}>
            Start logging shows to see them here!
          </Text>
          <Pressable style={styles.logShowButton} onPress={() => setShowPostModal(true)}>
            <Text style={styles.logShowButtonText}>Log your first show</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderPlaylistsTab = () => (
    <View style={styles.tabContent}>
      {playlists.length > 0 ? (
        <>
          {playlists.map((playlist) => (
            <Pressable
              key={playlist.id}
              style={styles.playlistItem}
              onPress={() => handlePlaylistPress(playlist.id)}
            >
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistCount}>{playlist.showCount} shows</Text>
              </View>
              <View style={styles.playlistActions}>
                <Pressable
                  style={styles.eyeIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePlaylistToggle(playlist.id, !playlist.isPublic);
                  }}
                >
                  {playlist.isPublic ? (
                    <Eye size={24} color={colors.text} />
                  ) : (
                    <EyeOff size={24} color={colors.textSecondary} />
                  )}
                </Pressable>
                <Pressable
                  style={styles.playlistActionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleSharePlaylist(playlist.id);
                  }}
                >
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.text} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={colors.textSecondary} />
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
          {renderTabs()}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  rotationScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  rotationPoster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
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
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  showGridItem: {
    width: '31%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
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
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
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
    alignItems: 'center',
  },
  eyeIconButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playlistActionButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
