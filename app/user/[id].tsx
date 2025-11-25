import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { spacing, components, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import FollowersModal from '@/components/FollowersModal';
import EditProfileModal from '@/components/EditProfileModal';
import InviteFriendsModal from '@/components/InviteFriendsModal';
import BlockReportModal from '@/components/BlockReportModal';
import FriendsInCommonModal from '@/components/FriendsInCommonModal';
import { Friends } from '@/components/Friends';
import FloatingTabBar from '@/components/FloatingTabBar';
import Button from '@/components/Button';
import TabSelector, { Tab as TabSelectorTab } from '@/components/TabSelector';
import WatchHistoryCard from '@/components/WatchHistoryCard';
import { mockUsers, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { User, Playlist, ReportReason, Show, SocialLink } from '@/types';
import * as Haptics from 'expo-haptics';
import { Instagram, Music, Globe, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import StatCardSkeleton from '@/components/skeleton/StatCardSkeleton';
import FadeInView from '@/components/FadeInView';
import FadeInImage from '@/components/FadeInImage';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { Image } from 'expo-image';

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
    allReposts, 
    playlists, 
    loadPlaylists, 
    updatePlaylistPrivacy, 
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    isShowInPlaylist,
    getWatchHistory: getWatchHistoryFromContext,
    getProfileFeed
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');
  const [showBlockReportModal, setShowBlockReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [showFriendsInCommonModal, setShowFriendsInCommonModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<Show | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [topFollowers, setTopFollowers] = useState<any[]>([]);
  const [topFollowing, setTopFollowing] = useState<any[]>([]);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<any[]>([]);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Helper to check if string is a UUID
  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch user by username or ID
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      
      setIsLoadingUser(true);
      const idString = id as string;
      
      // Check if current user first
      if (contextCurrentUser && (idString === contextCurrentUser.id || idString === contextCurrentUser.username)) {
        setProfileUser(contextCurrentUser);
        setResolvedUserId(contextCurrentUser.id);
        setIsLoadingUser(false);
        return;
      }
      
      // If it's a UUID, lookup by id
      // If it's a username, lookup by username
      const isIdUUID = isUUID(idString);
      
      try {
        let query = supabase.from('profiles').select('*');
        
        if (isIdUUID) {
          query = query.eq('id', idString);
        } else {
          query = query.eq('username', idString);
        }
        
        const { data, error } = await query.single();
        
        if (error || !data) {
          console.log('User not found:', idString);
          setProfileUser(null);
          setResolvedUserId(null);
        } else {
          // Map Supabase profile to User type
          const mappedUser: User = {
            id: data.id,
            username: data.username || 'unknown',
            displayName: data.display_name || data.username || 'Unknown',
            avatar: data.avatar || 'https://i.pravatar.cc/150?img=1',
            bio: data.bio || '',
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
            isFollowing: false,
          };
          setProfileUser(mappedUser);
          setResolvedUserId(data.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setProfileUser(null);
        setResolvedUserId(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    fetchUser();
  }, [id, contextCurrentUser]);

  const isCurrentUser = contextCurrentUser && resolvedUserId === contextCurrentUser.id;
  const isUserFollowing = isFollowing(resolvedUserId || id as string);

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist ? isShowInPlaylist(pl.id, showId) : false);
  };

  const loadStats = async (userId: string) => {
    setIsLoadingStats(true);
    try {
      const episodesCount = await getEpisodesWatchedCount(userId);
      const likesCount = await getTotalLikesReceived(userId);
      setEpisodesWatched(episodesCount);
      setTotalLikes(likesCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadFollowData = async (userId: string) => {
    try {
      const followersData = await getFollowers(userId);
      const followingData = await getFollowing(userId);
      const topFollowersData = await getTopFollowers(userId, 3);
      const topFollowingData = await getTopFollowing(userId, 3);
      
      // Also fetch current user's following list for friends in common calculation
      const currentUserFollowingData = !isCurrentUser && contextCurrentUser 
        ? await getFollowing(contextCurrentUser.id) 
        : [];
      
      setFollowers(followersData || []);
      setFollowing(followingData || []);
      setTopFollowers(topFollowersData || []);
      setTopFollowing(topFollowingData || []);
      setCurrentUserFollowing(currentUserFollowingData || []);
    } catch (error) {
      console.error('Error loading follow data:', error);
      setFollowers([]);
      setFollowing([]);
      setTopFollowers([]);
      setTopFollowing([]);
      setCurrentUserFollowing([]);
    }
  };

  // Load user data when resolvedUserId is available
  useEffect(() => {
    if (!resolvedUserId || isLoadingUser) return;
    
    const loadUserData = async () => {
      await loadPlaylists(resolvedUserId);
      await loadStats(resolvedUserId);
      await loadFollowData(resolvedUserId);
    };

    loadUserData();
  }, [resolvedUserId, isLoadingUser]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const userPlaylistsData = playlists.filter(p => 
      p.userId === resolvedUserId && (isCurrentUser || p.isPublic)
    );
    setUserPlaylists(userPlaylistsData);
  }, [resolvedUserId, playlists, isCurrentUser]);

  const allUserActivity = useMemo(() => {
    if (!resolvedUserId) return [];
    return getProfileFeed(resolvedUserId);
  }, [getProfileFeed, resolvedUserId]);

  const myRotation = useMemo((): Show[] => {
    if (!resolvedUserId) return [];
    const userShowPosts = posts.filter((p) => p.user.id === resolvedUserId);
    const sortedPosts = [...userShowPosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    const uniqueShows: Show[] = [];
    const seenShowIds = new Set<string>();
    
    for (const post of sortedPosts) {
      if (!seenShowIds.has(post.show.id)) {
        uniqueShows.push(post.show);
        seenShowIds.add(post.show.id);
        
        if (uniqueShows.length === 3) {
          break;
        }
      }
    }
    
    return uniqueShows;
  }, [posts, resolvedUserId]);

  const commonShows = isCurrentUser ? [] : mockShows.slice(0, 2);

  const watchHistory = useMemo(() => 
    resolvedUserId ? getWatchHistoryFromContext(resolvedUserId) : [],
    [resolvedUserId]
  );

  // Calculate friends in common (people who follow the profile user AND are followed by the current viewer)
  const friendsInCommon = useMemo(() => {
    if (isCurrentUser || !followers.length || !currentUserFollowing.length) return [];
    
    // Find mutual friends (people who follow this profile user AND are followed by the current viewer)
    const mutualFriends = followers.filter(follower => 
      currentUserFollowing.some(f => f.id === follower.id)
    );
    
    return mutualFriends;
  }, [isCurrentUser, followers, currentUserFollowing]);

  // Calculate tabs - MUST be before early return to maintain hook order
  const tabs: TabSelectorTab[] = useMemo(() => {
    const baseTabs = [
      { key: 'posts', label: 'Logs' },
      { key: 'shows', label: 'Watch History' },
    ];
    
    // Only show playlists tab if user has playlists OR if viewing own profile
    if (isCurrentUser || (userPlaylists && userPlaylists.length > 0)) {
      baseTabs.push({ key: 'playlists', label: 'Playlists' });
    }
    
    return baseTabs;
  }, [isCurrentUser, userPlaylists]);

  // Handler functions - MUST be before early return
  const handleFollowToggle = async (userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      
      if (resolvedUserId) {
        await loadFollowData(resolvedUserId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    }
  };

  // Show loading state while fetching user
  if (isLoadingUser) {
    return (
      <View style={styles.pageContainer}>
        <Stack.Screen options={{ title: 'Loading...', headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.pageContainer}>
        <Stack.Screen options={{ title: 'User Not Found', headerShown: false }} />
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const handleBlock = () => {
    setIsBlocked(!isBlocked);
    if (!isBlocked && resolvedUserId) {
      unfollowUser(resolvedUserId);
    }
  };

  const handleReport = async (reason: ReportReason, details: string) => {
    if (!resolvedUserId) return;
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        Alert.alert('Error', 'You must be logged in to report users.');
        return;
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: authUser.id,
          reported_user_id: resolvedUserId,
          reason: reason,
          details: details || null,
          status: 'pending',
        });

      if (error) {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
        return;
      }

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

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handleHelpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings/help');
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (data: {
    displayName: string;
    username: string;
    bio: string;
    socialLinks: SocialLink[];
  }) => {
    try {
      setProfileUser(prev => prev ? ({
        ...prev,
        displayName: data.displayName,
        username: data.username,
        bio: data.bio,
        socialLinks: data.socialLinks,
      }) : null);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error handling profile save:', error);
    }
  };

  const handleSocialLinkPress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
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

  const getSocialIcon = (platform: SocialLink['platform']) => {
    const iconProps = { size: 16, color: colors.almostWhite };
    switch (platform) {
      case 'instagram':
        return <Instagram {...iconProps} />;
      case 'tiktok':
      case 'spotify':
        return <Music {...iconProps} />;
      case 'x':
        return <Text style={styles.xIconSmall}>𝕏</Text>;
      case 'website':
        return <Globe {...iconProps} />;
      default:
        return null;
    }
  };

  // Section 1: Profile Info
  const renderProfileInfo = () => {
    if (!profileUser) return null;
    
    return (
    <View style={styles.profileInfoSection}>
      {profileUser.avatar ? (
        <Image source={{ uri: profileUser.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarPlaceholderText}>
            {(profileUser.displayName || profileUser.username || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      
      <View style={styles.profileTextContainer}>
        <Text style={styles.username}>@{profileUser.username}</Text>
        <Text style={styles.displayName}>{profileUser.displayName}</Text>
        {profileUser.bio ? <Text style={styles.bio}>{profileUser.bio}</Text> : null}
        
        {profileUser.socialLinks && profileUser.socialLinks.length > 0 ? (
          <View style={styles.socialLinksRow}>
            {profileUser.socialLinks.map((link, index) => (
              <Pressable
                key={index}
                style={styles.socialIconButton}
                onPress={() => handleSocialLinkPress(link.url)}
              >
                {getSocialIcon(link.platform)}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
  };

  // Section 2: Action Buttons - CONDITIONAL
  const renderActionButtons = () => {
    if (isCurrentUser) {
      return (
        <View style={styles.actionButtonsSection}>
          <Pressable style={styles.actionButton} onPress={handleEditProfile}>
            <Image source={require('@/assets/images/edit_1761625354124.png')} style={styles.actionIcon} />
            <Text style={styles.actionButtonLabel}>Edit</Text>
          </Pressable>
          
          <Pressable style={styles.actionButton} onPress={handleSettingsPress}>
            <Image source={require('@/assets/images/Setting_line_light_1761625354125.png')} style={styles.actionIcon} />
            <Text style={styles.actionButtonLabel}>Settings</Text>
          </Pressable>
          
          <Pressable style={styles.actionButton} onPress={handleHelpPress}>
            <Image source={require('@/assets/images/Question_light_1761625354125.png')} style={styles.actionIcon} />
            <Text style={styles.actionButtonLabel}>Help</Text>
          </Pressable>
        </View>
      );
    } else {
      return (
        <View style={styles.actionButtonsSection}>
          <Pressable 
            style={[styles.followButton, isUserFollowing && styles.followButtonActive]} 
            onPress={() => resolvedUserId && handleFollowToggle(resolvedUserId)}
          >
            <Text style={[styles.followButtonText, isUserFollowing && styles.followButtonTextActive]}>
              {isUserFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>
      );
    }
  };

  // Section 3: Stats Grid
  const renderStatsGrid = () => (
    <View style={styles.statsSection}>
      {isLoadingStats ? (
        <>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </>
      ) : (
        <>
          <View style={styles.statCard}>
            <FadeInView delay={0}>
              <View style={styles.statContent}>
                <FadeInImage source={require('@/assets/images/Eye_light_1761625354125.png')} style={styles.statIcon} contentFit="contain" />
                <Text style={styles.statValue}>
                  <Text style={styles.statNumber}>{episodesWatched}</Text> Episodes
                </Text>
              </View>
            </FadeInView>
          </View>

          <View style={styles.statCard}>
            <FadeInView delay={50}>
              <View style={styles.statContent}>
                <FadeInImage source={require('@/assets/images/Fire_light_1761625354125.png')} style={styles.statIcon} contentFit="contain" />
                <Text style={styles.statValue}>
                  <Text style={styles.statNumber}>{totalLikes}</Text> Likes
                </Text>
              </View>
            </FadeInView>
          </View>

          <Pressable style={styles.statCard} onPress={handleShowFollowers}>
            <FadeInView delay={100}>
              <View style={styles.statContent}>
                <View style={styles.avatarRow}>
                  {topFollowers.slice(0, 3).filter(Boolean).map((follower, index) => (
                    follower.avatar ? (
                      <FadeInImage
                        key={follower.id}
                        source={{ uri: follower.avatar }}
                        style={[
                          styles.miniAvatar,
                          index > 0 && { marginLeft: -8 }
                        ]}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        key={follower.id}
                        style={[
                          styles.miniAvatar,
                          styles.miniAvatarPlaceholder,
                          index > 0 && { marginLeft: -8 }
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>
                          {(follower.displayName || follower.username || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
                <Text style={styles.statValue}>
                  <Text style={styles.statNumber}>{followers.length}</Text> Followers
                </Text>
              </View>
            </FadeInView>
          </Pressable>

          <Pressable style={styles.statCard} onPress={handleShowFollowing}>
            <FadeInView delay={150}>
              <View style={styles.statContent}>
                <View style={styles.avatarRow}>
                  {topFollowing.slice(0, 3).filter(Boolean).map((user, index) => (
                    user.avatar ? (
                      <FadeInImage
                        key={user.id}
                        source={{ uri: user.avatar }}
                        style={[
                          styles.miniAvatar,
                          index > 0 && { marginLeft: -8 }
                        ]}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        key={user.id}
                        style={[
                          styles.miniAvatar,
                          styles.miniAvatarPlaceholder,
                          index > 0 && { marginLeft: -8 }
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>
                          {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
                <Text style={styles.statValue}>
                  <Text style={styles.statNumber}>{following.length}</Text> Following
                </Text>
              </View>
            </FadeInView>
          </Pressable>
        </>
      )}
    </View>
  );

  // Section 4: My Rotation
  const renderMyRotation = () => {
    if (myRotation.length === 0) return null;

    return (
      <View style={styles.rotationSection}>
        <Text style={styles.rotationTitle}>Currently Watching</Text>
        <View style={styles.rotationRow}>
          {myRotation.map((show) => {
            const isCommon = commonShows.some((s) => s.id === show.id);
            return (
              <Pressable
                key={show.id}
                style={[styles.rotationPoster, isCommon && styles.commonShowPoster]}
                onPress={() => router.push(`/show/${show.id}`)}
              >
                <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.rotationPosterImage} contentFit="cover" />
                <Pressable 
                  style={({ pressed }) => [
                    styles.saveIconRotation,
                    pressed && styles.saveIconPressed,
                  ]} 
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPlaylistModal(show);
                  }}
                >
                  <IconSymbol 
                    name={isShowSaved(show.id) ? "heart.fill" : "heart"} 
                    size={18} 
                    color={colors.pureWhite} 
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      {allUserActivity.length > 0 ? (
        allUserActivity.map((item, index) => (
          <PostCard 
            key={`${item.post.id}-${item.repostContext ? 'repost' : 'post'}-${index}`} 
            post={item.post}
            repostContext={item.repostContext}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <FadeInImage 
            source={require('@/assets/images/empty-states/logs-empty.png')} 
            style={styles.emptyStateImage}
            contentFit="contain"
          />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            {isCurrentUser 
              ? 'Start logging shows to see your posts here!'
              : `${user.displayName} hasn't posted anything yet.`
            }
          </Text>
          {isCurrentUser ? (
            <Button variant="primary" onPress={() => setShowPostModal(true)}>
              Log your first show
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );

  const renderShowsTab = () => (
    <View style={styles.tabContent}>
      {watchHistory.length > 0 ? (
        <View style={styles.watchHistoryList}>
          {watchHistory.map((item) => (
            <WatchHistoryCard
              key={item.show.id}
              show={item.show}
              mostRecentEpisode={item.mostRecentEpisode || undefined}
              loggedCount={item.loggedCount}
              totalCount={item.totalCount}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <FadeInImage 
            source={require('@/assets/images/empty-states/watch-history-empty.png')} 
            style={styles.emptyStateImage}
            contentFit="contain"
          />
          <Text style={styles.emptyStateTitle}>No shows yet</Text>
          <Text style={styles.emptyStateText}>
            {isCurrentUser 
              ? 'Start logging shows to see them here!'
              : `${user.displayName} hasn't watched anything yet.`
            }
          </Text>
          {isCurrentUser ? (
            <Button variant="primary" onPress={() => setShowPostModal(true)}>
              Log your first show
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );

  const renderPlaylistsTab = () => (
    <View style={styles.tabContent}>
      {userPlaylists.length > 0 ? (
        <>
          {userPlaylists.map((playlist) => {
            const showCount = playlist.showCount || 0;
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
                {isCurrentUser ? (
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
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyState}>
          <FadeInImage 
            source={require('@/assets/images/empty-states/playlists-empty.png')} 
            style={styles.emptyStateImage}
            contentFit="contain"
          />
          <Text style={styles.emptyStateTitle}>No playlists yet</Text>
          {isCurrentUser ? (
            <Text style={styles.emptyStateText}>
              Tap the heart icon on any show's poster to save it to a playlist!
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageContainer}>
        {/* Back Button - Top Left */}
        <Pressable 
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Top-Right Header Button - CONDITIONAL */}
        {isCurrentUser ? (
          <Pressable 
            style={styles.inviteFloatingButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowInviteFriendsModal(true);
            }}
          >
            <Image 
              source={require('@/assets/images/user-plus.png')} 
              style={styles.inviteButtonIcon}
            />
          </Pressable>
        ) : (
          <Pressable 
            style={styles.menuFloatingButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBlockReportModal(true);
            }}
          >
            <IconSymbol name="ellipsis" size={20} color="#FFFFFF" />
          </Pressable>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderProfileInfo()}
          
          {/* Friends in Common Bar - Only for other users' profiles */}
          {!isCurrentUser && friendsInCommon.length > 0 ? (
            <View style={styles.friendsInCommonContainer}>
              <Friends 
                state="FriendsInCommonBar"
                prop="Small"
                friends={friendsInCommon}
                text={(() => {
                  const firstName = friendsInCommon[0]?.displayName || friendsInCommon[0]?.username || 'Someone';
                  if (friendsInCommon.length === 1) {
                    return `${firstName} follows`;
                  } else if (friendsInCommon.length === 2) {
                    const secondName = friendsInCommon[1]?.displayName || friendsInCommon[1]?.username;
                    return `${firstName} and ${secondName} follow`;
                  } else {
                    const othersCount = friendsInCommon.length - 1;
                    return `${firstName} and ${othersCount} other${othersCount !== 1 ? 's' : ''} follow`;
                  }
                })()}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFriendsInCommonModal(true);
                }}
              />
            </View>
          ) : null}
          
          {renderActionButtons()}
          {renderStatsGrid()}
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

        <FollowersModal
          visible={showFollowersModal || showFollowingModal}
          onClose={() => {
            setShowFollowersModal(false);
            setShowFollowingModal(false);
          }}
          users={(() => {
            const usersList = followersType === 'followers' ? followers : following;
            const currentUserId = contextCurrentUser?.id;
            if (!currentUserId) return usersList;
            
            const currentUserIndex = usersList.findIndex(u => u.id === currentUserId);
            if (currentUserIndex === -1) return usersList;
            
            const sortedUsers = [...usersList];
            const [currentUser] = sortedUsers.splice(currentUserIndex, 1);
            return [currentUser, ...sortedUsers];
          })()}
          title={followersType === 'followers' ? 'Followers' : 'Following'}
          currentUserId={contextCurrentUser?.id || ''}
          followingIds={following.map(u => u.id)}
          onFollowToggle={handleFollowToggle}
        />

        <FriendsInCommonModal
          visible={showFriendsInCommonModal}
          onClose={() => setShowFriendsInCommonModal(false)}
          friends={friendsInCommon}
          profileUsername={user?.username || ''}
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

        {isCurrentUser ? (
          <>
            <EditProfileModal
              visible={showEditProfileModal}
              onClose={() => setShowEditProfileModal(false)}
              displayName={profileUser.displayName}
              username={profileUser.username}
              bio={profileUser.bio || ''}
              socialLinks={profileUser.socialLinks || []}
              onSave={handleSaveProfile}
            />

            <InviteFriendsModal
              visible={showInviteFriendsModal}
              onClose={() => setShowInviteFriendsModal(false)}
            />
          </>
        ) : null}

        {showPlaylistModal ? (
          <PlaylistModal
            visible={!!showPlaylistModal}
            onClose={() => setShowPlaylistModal(null)}
            show={showPlaylistModal}
            onAddToPlaylist={() => {}}
          />
        ) : null}
      </View>
      
      {/* FloatingTabBar - Show main menu on profile pages */}
      <FloatingTabBar 
        tabs={[
          { name: 'Home', icon: 'house.fill', route: '/(home)' },
          { name: 'Search', icon: 'magnifyingglass', route: '/search' },
          { name: 'Notifications', icon: 'bell.fill', route: '/notifications' },
          { name: 'Profile', icon: 'person.fill', route: '/profile' },
        ]} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: colors.pageBackground,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    ...typography.subtitle,
    color: colors.almostWhite,
    textAlign: 'center',
    marginTop: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.subtitle,
    color: colors.almostWhite,
  },
  
  // Section 1: Profile Info
  profileInfoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  avatar: {
    width: 127,
    height: 127,
    borderRadius: 20,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  avatarPlaceholderText: {
    ...typography.largeTitle,
    color: colors.greenHighlight,
    fontSize: 48,
  },
  profileTextContainer: {
    width: 331,
    alignItems: 'center',
    gap: 10,
  },
  username: {
    ...typography.p1B,
    color: colors.greenHighlight,
    textAlign: 'center',
  },
  displayName: {
    fontFamily: 'Instrument Serif',
    fontSize: 25,
    fontWeight: '400',
    color: colors.pureWhite,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  bio: {
    ...typography.p1,
    color: colors.pureWhite,
    textAlign: 'center',
    maxWidth: 308,
  },
  socialLinksRow: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 4,
  },
  socialIconButton: {
    padding: 6,
  },
  xIconSmall: {
    fontSize: 16,
    color: colors.almostWhite,
    fontWeight: '600',
  },

  // Friends in Common Container - Centered
  friendsInCommonContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  // Section 2: Action Buttons
  actionButtonsSection: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    flex: 1,
    height: 46,
    paddingVertical: 11,
    paddingHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    backgroundColor: colors.cardBackground,
  },
  actionButtonLabel: {
    ...typography.p1,
    color: colors.pureWhite,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionIcon: {
    width: 19,
    height: 19,
  },
  followButton: {
    flex: 1,
    height: 46,
    paddingVertical: 11,
    paddingHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.greenHighlight,
    backgroundColor: colors.greenHighlight,
  },
  followButtonActive: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardStroke,
  },
  followButtonText: {
    ...typography.p1,
    color: colors.pageBackground,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: colors.pureWhite,
  },

  // Section 3: Stats Grid
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  statCard: {
    width: 'calc(50% - 4px)' as any,
    height: 57,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    backgroundColor: colors.cardBackground,
  },
  statContent: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    ...typography.p1,
    height: 15,
    color: colors.grey1,
    textAlign: 'center',
  },
  statNumber: {
    color: colors.pureWhite,
  },
  statIcon: {
    width: 24,
    height: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBackground,
  },
  miniAvatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    ...typography.p1,
    color: colors.greenHighlight,
    fontSize: 10,
    fontWeight: '600',
  },

  // Section 4: My Rotation
  rotationSection: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  rotationTitle: {
    ...typography.smallSubtitle,
    color: colors.pureWhite,
    marginBottom: 16,
  },
  rotationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rotationPoster: {
    position: 'relative',
    width: 128.67,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  commonShowPoster: {
    borderWidth: 0.5,
    borderColor: colors.greenHighlight,
  },
  rotationPosterImage: {
    width: '100%',
    height: '100%',
  },
  saveIconRotation: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },

  // Tab Selector
  tabSelectorContainer: {
    paddingHorizontal: 16,
    marginTop: 30,
    marginBottom: 18,
  },
  
  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  emptyStateImage: {
    width: 280,
    height: 180,
    marginBottom: 8,
  },
  emptyStateTitle: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    ...typography.p1,
    color: colors.grey1,
    textAlign: 'center',
    marginBottom: 16,
  },
  watchHistoryList: {
    gap: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  playlistCount: {
    ...typography.p1,
    color: colors.grey1,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    backgroundColor: colors.pageBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },

  // Floating Buttons - Top Left & Right
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteFloatingButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  inviteButtonIcon: {
    width: 20,
    height: 20,
  },
  menuFloatingButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
