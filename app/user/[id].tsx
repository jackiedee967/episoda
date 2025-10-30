
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
import { colors, commonStyles, typography, spacing, components } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import FollowersModal from '@/components/FollowersModal';
import Button from '@/components/Button';
import TabSelector, { Tab as TabType } from '@/components/TabSelector';
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
  const { 
    posts, 
    followUser, 
    unfollowUser, 
    isFollowing, 
    currentUser: contextCurrentUser, 
    playlists, 
    loadPlaylists, 
    updatePlaylistPrivacy, 
    createPlaylist,
    getFollowers,
    getFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');
  const [showBlockReportModal, setShowBlockReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  const user = id === currentUser.id ? currentUser : mockUsers.find((u) => u.id === id);
  
  // Get user's original posts
  const userPosts = posts.filter((p) => p.user.id === id);
  
  const isCurrentUser = id === currentUser.id;
  const isUserFollowing = isFollowing(id as string);

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

  // Effect 1: Load data when user changes (doesn't read from context to avoid stale data)
  useEffect(() => {
    const loadUserData = async () => {
      // Trigger playlist loading
      await loadPlaylists(id as string);

      // Load stats
      try {
        const episodesCount = await getEpisodesWatchedCount(id as string);
        const likesCount = await getTotalLikesReceived(id as string);
        setEpisodesWatched(episodesCount);
        setTotalLikes(likesCount);
      } catch (error) {
        console.error('Error loading stats:', error);
      }

      // Load follow data
      try {
        console.log('UserProfile - Loading follow data for user:', id);
        const followersData = await getFollowers(id as string);
        const followingData = await getFollowing(id as string);
        console.log('UserProfile - Followers:', followersData.length);
        console.log('UserProfile - Following:', followingData.length);
        setFollowers(followersData);
        setFollowing(followingData);
      } catch (error) {
        console.error('Error loading follow data:', error);
      }
    };

    loadUserData();
  }, [id]);

  // Effect 2: Update local playlists when context playlists change (no loading, just filtering)
  useEffect(() => {
    const userPlaylistsData = playlists.filter(p => 
      p.userId === id && (isCurrentUser || p.isPublic)
    );
    setUserPlaylists(userPlaylistsData);
  }, [id, playlists, isCurrentUser]);

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

  const handleFollowToggle = async (userId: string) => {
    console.log('UserProfile - handleFollowToggle called for userId:', userId);
    console.log('UserProfile - Currently following?', isFollowing(userId));
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (isFollowing(userId)) {
        console.log('UserProfile - Unfollowing user...');
        await unfollowUser(userId);
      } else {
        console.log('UserProfile - Following user...');
        await followUser(userId);
      }
      
      console.log('UserProfile - Follow action completed, reloading follow data...');
      
      // Reload follow data
      const followersData = await getFollowers(id as string);
      const followingData = await getFollowing(id as string);
      console.log('UserProfile - Updated followers:', followersData.length);
      console.log('UserProfile - Updated following:', followingData.length);
      setFollowers(followersData);
      setFollowing(followingData);
      
      console.log('UserProfile - Follow data reloaded successfully');
    } catch (error) {
      console.error('UserProfile - Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
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

  const handlePlaylistPress = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/playlist/${playlistId}`);
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
        <View style={styles.followButtonContainer}>
          <Button
            variant={isUserFollowing ? 'secondary' : 'primary'}
            size="large"
            onPress={() => handleFollowToggle(id as string)}
            fullWidth
          >
            {isUserFollowing ? 'Following' : 'Follow'}
          </Button>
        </View>
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
    const tabs: TabType[] = [
      { key: 'posts', label: 'Posts' },
      { key: 'shows', label: 'Watch History' },
    ];
    
    if (shouldShowPlaylistsTab) {
      tabs.push({ key: 'playlists', label: 'Playlists' });
    }

    return (
      <View style={styles.tabsWrapper}>
        <TabSelector
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabKey) => setActiveTab(tabKey as Tab)}
          variant="default"
        />
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
          {userPlaylists.map((playlist) => {
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
            );
          })}
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
        users={followersType === 'followers' ? followers : following}
        title={followersType === 'followers' ? 'Followers' : 'Following'}
        currentUserId={currentUser.id}
        followingIds={following.map(u => u.id)}
        onFollowToggle={handleFollowToggle}
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
    padding: spacing.gapXLarge,
    backgroundColor: colors.cardBackground,
    position: 'relative',
  },
  blockedProfile: {
    opacity: 0.5,
  },
  onlineStatus: {
    position: 'absolute',
    top: spacing.gapLarge,
    left: spacing.gapLarge,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.greenHighlight}20`,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: spacing.gapSmall,
    borderRadius: components.borderRadiusButton,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.greenHighlight,
    marginRight: spacing.gapSmall,
  },
  onlineText: {
    ...typography.p2Bold,
    color: colors.greenHighlight,
  },
  profileActions: {
    position: 'absolute',
    top: spacing.gapLarge,
    right: spacing.gapLarge,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  actionButtonBlocked: {
    backgroundColor: `${colors.error}20`,
    borderColor: colors.error,
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
    marginBottom: spacing.gapLarge,
  },
  displayName: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: spacing.gapSmall,
  },
  username: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.gapMedium,
  },
  bio: {
    ...typography.p1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.gapLarge,
    paddingHorizontal: spacing.gapLarge,
  },
  blockedBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: spacing.gapSmall,
    borderRadius: components.borderRadiusButton,
    marginBottom: spacing.gapLarge,
  },
  blockedBadgeText: {
    ...typography.p2Bold,
    color: colors.pureWhite,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.gapXLarge,
    marginBottom: spacing.gapLarge,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleL,
    color: colors.text,
  },
  statLabel: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: spacing.gapLarge,
    marginBottom: spacing.gapLarge,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  mutualFollowers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.gapLarge,
    paddingHorizontal: spacing.gapLarge,
  },
  mutualAvatars: {
    flexDirection: 'row',
    marginRight: spacing.gapSmall,
  },
  mutualAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  mutualText: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  followButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.pageMargin,
  },
  section: {
    padding: spacing.gapLarge,
  },
  sectionTitle: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: spacing.gapLarge,
  },
  rotationScroll: {
    marginHorizontal: -spacing.gapLarge,
    paddingHorizontal: spacing.gapLarge,
  },
  rotationPoster: {
    width: 120,
    height: 180,
    borderRadius: components.borderRadiusButton,
    marginRight: spacing.gapMedium,
    overflow: 'hidden',
  },
  commonShowPoster: {
    borderWidth: 3,
    borderColor: colors.greenHighlight,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  emptyRotation: {
    alignItems: 'center',
    padding: spacing.sectionSpacing,
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
  },
  emptyRotationText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.gapMedium,
    marginBottom: spacing.gapLarge,
  },
  logShowButton: {
    backgroundColor: colors.greenHighlight,
    paddingHorizontal: spacing.gapXLarge,
    paddingVertical: spacing.gapMedium,
    borderRadius: components.borderRadiusButton,
  },
  logShowButtonText: {
    ...typography.p1Bold,
    color: colors.black,
  },
  tabsWrapper: {
    padding: spacing.gapLarge,
  },
  tabContent: {
    padding: spacing.gapLarge,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.sectionSpacing,
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
  },
  emptyStateTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.gapLarge,
    marginBottom: spacing.gapSmall,
  },
  emptyStateText: {
    ...typography.p1,
    color: colors.textSecondary,
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
    borderRadius: components.borderRadiusButton,
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
    ...typography.p1Bold,
    color: colors.text,
    marginBottom: spacing.gapSmall,
  },
  playlistCount: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
    alignItems: 'center',
  },
  eyeIconButton: {
    padding: spacing.gapSmall,
    backgroundColor: colors.pageBackground,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  playlistActionButton: {
    padding: spacing.gapSmall,
    backgroundColor: colors.pageBackground,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
});
