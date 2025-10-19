
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import FollowersModal from '@/components/FollowersModal';
import BlockReportModal from '@/components/BlockReportModal';
import { mockUsers, currentUser, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { User, Playlist, ReportReason, Show } from '@/types';
import * as Haptics from 'expo-haptics';
import { Instagram, Music, Globe, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/app/integrations/supabase/client';

type Tab = 'posts' | 'shows' | 'playlists';

export default function UserProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { posts, followUser, unfollowUser, isFollowing, currentUser: contextCurrentUser, playlists, loadPlaylists, updatePlaylistPrivacy, createPlaylist } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');
  const [showBlockReportModal, setShowBlockReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  const user = id === currentUser.id ? currentUser : mockUsers.find((u) => u.id === id);
  
  // Get user's original posts
  const userPosts = posts.filter((p) => p.user.id === id);
  
  const isCurrentUser = id === currentUser.id;
  const following = isFollowing(id as string);

  // Get last 4 unique shows from user's posts (rotation)
  const getMyRotation = (): Show[] => {
    const userShowPosts = posts.filter((p) => p.user.id === id);
    
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
  const commonShows = isCurrentUser ? [] : mockShows.slice(0, 2);

  // Get watch history - all unique shows the user has logged, sorted chronologically
  const getWatchHistory = (): Show[] => {
    const userShowPosts = posts.filter((p) => p.user.id === id);
    
    // Sort by timestamp (most recent first)
    const sortedPosts = [...userShowPosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    // Get unique shows in chronological order
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

  // Mock mutual followers
  const mutualFollowers = mockUsers.slice(0, 3);

  // Load playlists when component mounts or user changes
  useEffect(() => {
    const loadUserPlaylists = async () => {
      if (isCurrentUser) {
        // Load all playlists for current user
        await loadPlaylists();
        setUserPlaylists(playlists);
      } else {
        // Load only public playlists for other users
        await loadPlaylists(id as string);
        const publicPlaylists = playlists.filter(p => p.userId === id && p.isPublic);
        setUserPlaylists(publicPlaylists);
      }
    };

    loadUserPlaylists();
  }, [id, isCurrentUser, loadPlaylists, playlists]);

  // Determine if we should show the playlists tab
  const shouldShowPlaylistsTab = userPlaylists.length > 0;

  console.log('UserProfile - User ID:', id);
  console.log('UserProfile - User posts:', userPosts.length);
  console.log('UserProfile - My Rotation:', myRotation.length, myRotation.map(s => s.title));
  console.log('UserProfile - Watch History:', watchHistory.length, watchHistory.map(s => s.title));

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <Stack.Screen options={{ title: 'User Not Found' }} />
        <Text style={commonStyles.text}>User not found</Text>
      </View>
    );
  }

  const handleFollowToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (following) {
      unfollowUser(id as string);
    } else {
      followUser(id as string);
    }
  };

  const handleBlock = () => {
    setIsBlocked(!isBlocked);
    if (!isBlocked) {
      unfollowUser(id as string);
    }
  };

  const handleReport = async (reason: ReportReason, details: string) => {
    try {
      console.log('Submitting report:', { userId: id, reason, details });
      
      // Get the current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Error getting authenticated user:', authError);
        Alert.alert('Error', 'You must be logged in to report users.');
        return;
      }

      // Insert the report into the database
      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: authUser.id,
          reported_user_id: id as string,
          reason: reason,
          details: details || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting report:', error);
        Alert.alert('Error', 'Failed to submit report. Please try again.');
        return;
      }

      console.log('Report submitted successfully:', data);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
      
    } catch (error) {
      console.error('Error in handleReport:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleShowFollowers = () => {
    setFollowersType('followers');
    setShowFollowersModal(true);
  };

  const handleShowFollowing = () => {
    setFollowersType('following');
    setShowFollowingModal(true);
  };

  const handleSocialLink = (platform: string, url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Opening social link:', platform, url);
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

  const handlePlaylistPress = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Opening playlist:', playlist.name);
    const playlistShows = mockShows.filter(show => playlist.shows?.includes(show.id));
    const showTitles = playlistShows.map(show => show.title).join('\n');
    Alert.alert(
      playlist.name,
      showTitles || 'No shows in this playlist yet',
      [{ text: 'OK' }]
    );
  };

  const renderOnlineStatus = () => {
    if (isCurrentUser) return null;

    const isOnline = Math.random() > 0.5;
    if (!isOnline) return null;

    return (
      <View style={styles.onlineStatus}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>Online now</Text>
      </View>
    );
  };

  const renderProfileActions = () => {
    if (isCurrentUser) return null;

    return (
      <View style={styles.profileActions}>
        <Pressable
          style={[styles.actionButton, isBlocked && styles.actionButtonBlocked]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowBlockReportModal(true);
          }}
        >
          <Image 
            source={require('@/assets/images/6301ea24-0c77-488f-9baa-c180e58d5023.png')} 
            style={styles.prohibitionIcon}
          />
        </Pressable>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, isBlocked && styles.blockedProfile]}>
      {renderOnlineStatus()}
      {renderProfileActions()}

      <Image
        source={{ uri: user.avatar }}
        style={styles.avatar}
      />
      <Text style={styles.displayName}>{user.displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.bio && (
        <Text style={styles.bio} numberOfLines={3}>
          {user.bio}
        </Text>
      )}

      {isBlocked && (
        <View style={styles.blockedBadge}>
          <Text style={styles.blockedBadgeText}>Blocked</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <Pressable style={styles.statItem} onPress={handleShowFollowers}>
          <Text style={styles.statValue}>{user.followers?.length || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={handleShowFollowing}>
          <Text style={styles.statValue}>{user.following?.length || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.episodesWatchedCount || 0}</Text>
          <Text style={styles.statLabel}>Episodes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.totalLikesReceived || 0}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      {user.socialLinks && user.socialLinks.length > 0 && (
        <View style={styles.socialLinks}>
          {user.socialLinks.map((link) => (
            <Pressable
              key={link.platform}
              style={styles.socialIcon}
              onPress={() => handleSocialLink(link.platform, link.url)}
            >
              {link.platform === 'instagram' && <Instagram size={24} color={colors.text} />}
              {link.platform === 'tiktok' && <Music size={24} color={colors.text} />}
              {link.platform === 'x' && <IconSymbol name="xmark" size={24} color={colors.text} />}
              {link.platform === 'spotify' && <Music size={24} color={colors.text} />}
              {link.platform === 'website' && <Globe size={24} color={colors.text} />}
            </Pressable>
          ))}
        </View>
      )}

      {!isCurrentUser && mutualFollowers.length > 0 && (
        <Pressable style={styles.mutualFollowers} onPress={handleShowFollowers}>
          <View style={styles.mutualAvatars}>
            {mutualFollowers.slice(0, 3).map((follower, index) => (
              <Image
                key={follower.id}
                source={{ uri: follower.avatar }}
                style={[styles.mutualAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
              />
            ))}
          </View>
          <Text style={styles.mutualText}>
            Followed by @{mutualFollowers[0].username}
            {mutualFollowers.length > 1 && ` & ${mutualFollowers.length - 1} others`}
          </Text>
        </Pressable>
      )}

      {!isCurrentUser && (
        <Pressable
          style={[styles.followButton, following && styles.followingButton]}
          onPress={handleFollowToggle}
        >
          <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
            {following ? 'Unfollow' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );

  const renderMyRotation = () => {
    // Only show rotation section if there are shows to display
    if (myRotation.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isCurrentUser ? 'My Rotation' : `${user.displayName}'s Rotation`}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rotationScroll}>
          {myRotation.map((show) => {
            const isCommon = commonShows.some((s) => s.id === show.id);
            return (
              <Pressable
                key={show.id}
                style={[styles.rotationPoster, isCommon && styles.commonShowPoster]}
                onPress={() => router.push(`/show/${show.id}`)}
              >
                <Image source={{ uri: show.poster }} style={styles.posterImage} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTabs = () => {
    // Only show tabs that have content or are relevant
    const tabs = ['posts', 'shows'];
    if (shouldShowPlaylistsTab) {
      tabs.push('playlists');
    }

    return (
      <View style={styles.tabs}>
        {tabs.includes('posts') && (
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
        )}
        {tabs.includes('shows') && (
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
        )}
        {tabs.includes('playlists') && (
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
        )}
      </View>
    );
  };

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      {userPosts.length > 0 ? (
        userPosts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="bubble.left" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>
            {isCurrentUser ? 'No posts yet' : 'No posts yet'}
          </Text>
          <Text style={styles.emptyStateText}>
            {isCurrentUser
              ? 'Start logging shows to see your posts here!'
              : `${user.displayName} hasn't posted anything yet.`}
          </Text>
          {isCurrentUser && (
            <Pressable style={styles.logShowButton} onPress={() => setShowPostModal(true)}>
              <Text style={styles.logShowButtonText}>Log your first show</Text>
            </Pressable>
          )}
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
          <IconSymbol name="tv" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>
            {isCurrentUser ? 'No shows yet' : "Haven't watched anything yet"}
          </Text>
          {isCurrentUser && (
            <Pressable style={styles.logShowButton} onPress={() => setShowPostModal(true)}>
              <Text style={styles.logShowButtonText}>Log your first show</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  const renderPlaylistsTab = () => (
    <View style={styles.tabContent}>
      {userPlaylists.length > 0 ? (
        <>
          {userPlaylists.map((playlist) => (
            <Pressable
              key={playlist.id}
              style={styles.playlistItem}
              onPress={() => handlePlaylistPress(playlist)}
            >
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistCount}>{playlist.showCount} shows</Text>
              </View>
              {isCurrentUser && (
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
              )}
              {!isCurrentUser && (
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              )}
            </Pressable>
          ))}
        </>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No playlists yet</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: user.username,
        }}
      />
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

      <BlockReportModal
        visible={showBlockReportModal}
        onClose={() => setShowBlockReportModal(false)}
        username={user.username}
        onBlock={handleBlock}
        onReport={handleReport}
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
    backgroundColor: colors.card,
    position: 'relative',
  },
  blockedProfile: {
    opacity: 0.5,
  },
  onlineStatus: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.secondary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  profileActions: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonBlocked: {
    backgroundColor: '#FF3B3020',
    borderColor: '#FF3B30',
  },
  prohibitionIcon: {
    width: 24,
    height: 24,
    tintColor: colors.text,
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
    paddingHorizontal: 16,
  },
  blockedBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  blockedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
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
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mutualFollowers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  mutualAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  mutualAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
  },
  mutualText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  followButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  followingButtonText: {
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
  commonShowPoster: {
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  emptyRotation: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyRotationText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
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
