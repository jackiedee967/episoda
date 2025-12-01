import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, Platform, Linking, RefreshControl } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { spacing, components, commonStyles } from '@/styles/commonStyles';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PlaylistModal from '@/components/PlaylistModal';
import PlaylistViewModal from '@/components/PlaylistViewModal';
import FollowersModal from '@/components/FollowersModal';
import EditProfileModal from '@/components/EditProfileModal';
import InviteFriendsModal from '@/components/InviteFriendsModal';
import TabSelector, { Tab as TabSelectorTab } from '@/components/TabSelector';
import Button from '@/components/Button';
import WatchHistoryCard from '@/components/WatchHistoryCard';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Instagram, Music, Globe, MoreHorizontal } from 'lucide-react-native';
import { Show, SocialLink, User } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/integrations/supabase/client';
import { generateAvatarDataURI } from '@/utils/profilePictureGenerator';
import StatCardSkeleton from '@/components/skeleton/StatCardSkeleton';
import FadeInView from '@/components/FadeInView';
import FadeInImage from '@/components/FadeInImage';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import FavoritesSection from '@/components/FavoritesSection';

type Tab = 'posts' | 'shows' | 'playlists';

export default function ProfileScreen() {
  const router = useRouter();
  const { authReady } = useAuth();
  const { 
    posts, 
    followUser, 
    unfollowUser, 
    isFollowing, 
    allReposts, 
    playlists, 
    loadPlaylists,
    deletePlaylist,
    getFollowers,
    getFollowing,
    getTopFollowers,
    getTopFollowing,
    getEpisodesWatchedCount,
    getTotalLikesReceived,
    isShowInPlaylist,
    getWatchHistory: getWatchHistoryFromContext,
    currentUser: contextCurrentUser,
    getProfileFeed
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<Show | null>(null);
  const [showPlaylistViewModal, setShowPlaylistViewModal] = useState<string | null>(null);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [topFollowers, setTopFollowers] = useState<any[]>([]);
  const [topFollowing, setTopFollowing] = useState<any[]>([]);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist ? isShowInPlaylist(pl.id, showId) : false);
  };

  useEffect(() => {
    if (contextCurrentUser) {
      setProfileUser(contextCurrentUser);
    }
  }, [contextCurrentUser]);

  useEffect(() => {
    if (!profileUser) return;
    // Load data when profile user is set
    loadStats();
    loadFollowData();
  }, [profileUser?.id]);

  const loadProfileData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          const { data: socialLinks } = await supabase
            .from('social_links')
            .select('*')
            .eq('user_id', user.id);

          // Keep the contextCurrentUser.id to maintain compatibility with mock data
          // Only update profile-specific fields from Supabase
          setProfileUser(prev => {
            // Generate avatar data URI if no uploaded avatar but has auto-generated avatar config
            let avatarUrl = profile.avatar_url || prev?.avatar;
            if (!profile.avatar_url && profile.avatar_color_scheme && profile.avatar_icon) {
              avatarUrl = generateAvatarDataURI(profile.avatar_color_scheme, profile.avatar_icon);
            }
            
            return {
              ...prev,
              username: profile.username || prev?.username,
              displayName: profile.display_name || prev?.displayName,
              avatar: avatarUrl,
              bio: profile.bio || '',
              socialLinks: socialLinks?.map(link => ({
                platform: link.platform as SocialLink['platform'],
                url: link.url,
              })) || [],
            };
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!profileUser) return;
    setIsLoadingStats(true);
    try {
      const episodesCount = await getEpisodesWatchedCount(profileUser.id);
      const likesCount = await getTotalLikesReceived(profileUser.id);
      setEpisodesWatched(episodesCount);
      setTotalLikes(likesCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [profileUser?.id]);

  const loadFollowData = useCallback(async () => {
    if (!profileUser) return;
    try {
      const followersData = await getFollowers(profileUser.id);
      const followingData = await getFollowing(profileUser.id);
      const topFollowersData = await getTopFollowers(profileUser.id, 3);
      const topFollowingData = await getTopFollowing(profileUser.id, 3);
      
      setFollowers(followersData || []);
      setFollowing(followingData || []);
      setTopFollowers(topFollowersData || []);
      setTopFollowing(topFollowingData || []);
    } catch (error) {
      console.error('Error loading follow data:', error);
      setFollowers([]);
      setFollowing([]);
      setTopFollowers([]);
      setTopFollowing([]);
    }
  }, [profileUser?.id]);

  const handleRefresh = useCallback(async () => {
    if (!profileUser) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfileData(),
        loadStats(),
        loadFollowData(),
        loadPlaylists()
      ]);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [profileUser?.id, loadProfileData, loadStats, loadFollowData, loadPlaylists]);

  // Silent auto-refresh when page comes into focus (no spinner)
  useFocusEffect(
    useCallback(() => {
      const silentRefresh = async () => {
        if (!profileUser) return;
        
        try {
          await Promise.all([
            loadProfileData(),
            loadStats(),
            loadFollowData(),
            loadPlaylists()
          ]);
        } catch (error) {
          console.error('Error auto-refreshing profile:', error);
        }
      };
      
      silentRefresh();
    }, [profileUser?.id, loadProfileData, loadStats, loadFollowData, loadPlaylists])
  );

  const allUserActivity = useMemo(() => {
    if (!profileUser) return [];
    return getProfileFeed(profileUser.id);
  }, [getProfileFeed, profileUser?.id]);

  const myRotation = useMemo((): Show[] => {
    if (!profileUser) return [];
    const userShowPosts = posts.filter((p) => p.user.id === profileUser.id);
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
  }, [posts, profileUser?.id]);

  const watchHistory = useMemo(() => {
    if (!profileUser) return [];
    return getWatchHistoryFromContext(profileUser.id);
  }, [profileUser?.id]);

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
    avatar?: string;
    socialLinks: SocialLink[];
  }) => {
    try {
      // Update local state to reflect changes in UI
      // EditProfileModal already saves to Supabase
      setProfileUser(prev => ({
        ...prev,
        displayName: data.displayName,
        username: data.username,
        bio: data.bio,
        avatar: data.avatar || prev.avatar,
        socialLinks: data.socialLinks,
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error handling profile save:', error);
    }
  };

  const handleSocialLinkPress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const handleSharePlaylist = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share Playlist', 'Deep link copied to clipboard!');
  };

  const handlePlaylistPress = (playlistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPlaylistViewModal(playlistId);
  };

  const handleDeletePlaylist = (playlistId: string, playlistName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Web-compatible confirmation
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete "${playlistName}"?`);
      if (confirmed) {
        (async () => {
          try {
            await deletePlaylist(playlistId);
            await loadPlaylists();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error('Error deleting playlist:', error);
            window.alert('Failed to delete playlist');
          }
        })();
      }
    } else {
      Alert.alert(
        'Delete Playlist',
        `Are you sure you want to delete "${playlistName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePlaylist(playlistId);
                await loadPlaylists();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.error('Error deleting playlist:', error);
                Alert.alert('Error', 'Failed to delete playlist');
              }
            },
          },
        ]
      );
    }
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      
      await loadFollowData();
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    }
  };

  const getSocialIcon = (platform: SocialLink['platform']) => {
    const iconProps = { size: 16, color: colors.almostWhite };
    if (platform === 'instagram') {
      return <Instagram {...iconProps} />;
    } else if (platform === 'tiktok' || platform === 'spotify') {
      return <Music {...iconProps} />;
    } else if (platform === 'x') {
      return <Text style={styles.xIconSmall}>𝕏</Text>;
    } else if (platform === 'website') {
      return <Globe {...iconProps} />;
    }
    return null;
  };

  const tabs: TabSelectorTab[] = [
    { key: 'posts', label: 'Logs' },
    { key: 'shows', label: 'Watch History' },
    { key: 'playlists', label: 'Playlists' },
  ];

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

  // Section 2: Action Buttons
  const renderActionButtons = () => (
    <View style={styles.actionButtonsSection}>
      <Pressable style={styles.actionButton} onPress={handleEditProfile}>
        <FadeInImage source={require('@/assets/images/edit_1761625354124.png')} style={styles.actionIcon} contentFit="contain" />
        <Text style={styles.actionButtonLabel}>Edit</Text>
      </Pressable>
      
      <Pressable style={styles.actionButton} onPress={handleSettingsPress}>
        <FadeInImage source={require('@/assets/images/Setting_line_light_1761625354125.png')} style={styles.actionIcon} contentFit="contain" />
        <Text style={styles.actionButtonLabel}>Settings</Text>
      </Pressable>
      
      <Pressable style={styles.actionButton} onPress={handleHelpPress}>
        <FadeInImage source={require('@/assets/images/Question_light_1761625354125.png')} style={styles.actionIcon} contentFit="contain" />
        <Text style={styles.actionButtonLabel}>Help</Text>
      </Pressable>
    </View>
  );

  // Section 3: Stats Grid
  const renderStatsGrid = () => (
    <View style={styles.statsSection}>
      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <FadeInImage source={require('@/assets/images/Eye_light_1761625354125.png')} style={styles.statIcon} contentFit="contain" />
          <Text style={styles.statValue}>
            <Text style={styles.statNumber}>{episodesWatched}</Text> Episodes
          </Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statContent}>
          <FadeInImage source={require('@/assets/images/Fire_light_1761625354125.png')} style={styles.statIcon} contentFit="contain" />
          <Text style={styles.statValue}>
            <Text style={styles.statNumber}>{totalLikes}</Text> Likes
          </Text>
        </View>
      </View>

      <Pressable style={styles.statCard} onPress={handleShowFollowers}>
        <View style={styles.statContent}>
          <View style={styles.avatarRow}>
            {topFollowers.slice(0, 3).map((follower, index) => {
              if (!follower) return null;
              return follower.avatar ? (
                <FadeInImage
                  key={follower.id}
                  source={{ uri: follower.avatar }}
                  style={[
                    styles.miniAvatar,
                    index > 0 ? { marginLeft: -8 } : null
                  ]}
                  contentFit="cover"
                />
              ) : (
                <View
                  key={follower.id}
                  style={[
                    styles.miniAvatar,
                    styles.miniAvatarPlaceholder,
                    index > 0 ? { marginLeft: -8 } : null
                  ]}
                >
                  <Text style={styles.miniAvatarText}>
                    {(follower.displayName || follower.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.statValue}>
            <Text style={styles.statNumber}>{followers.length}</Text> Followers
          </Text>
        </View>
      </Pressable>

      <Pressable style={styles.statCard} onPress={handleShowFollowing}>
        <View style={styles.statContent}>
          <View style={styles.avatarRow}>
            {topFollowing.slice(0, 3).map((user, index) => {
              if (!user) return null;
              return user.avatar ? (
                <FadeInImage
                  key={user.id}
                  source={{ uri: user.avatar }}
                  style={[
                    styles.miniAvatar,
                    index > 0 ? { marginLeft: -8 } : null
                  ]}
                  contentFit="cover"
                />
              ) : (
                <View
                  key={user.id}
                  style={[
                    styles.miniAvatar,
                    styles.miniAvatarPlaceholder,
                    index > 0 ? { marginLeft: -8 } : null
                  ]}
                >
                  <Text style={styles.miniAvatarText}>
                    {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.statValue}>
            <Text style={styles.statNumber}>{following.length}</Text> Following
          </Text>
        </View>
      </Pressable>
    </View>
  );

  // Section 4: My Rotation
  const renderMyRotation = () => {
    if (myRotation.length === 0) return null;

    return (
      <View style={styles.rotationSection}>
        <Text style={styles.rotationTitle}>Currently Watching</Text>
        <View style={styles.rotationRow}>
          {myRotation.map((show) => (
            <Pressable
              key={show.id}
              style={styles.rotationPoster}
              onPress={() => router.push(`/show/${show.id}`)}
            >
              <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.rotationPosterImage} contentFit="cover" />
              <Pressable 
                style={({ pressed }) => [
                  styles.saveIconRotation,
                  pressed ? styles.saveIconPressed : null,
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
          ))}
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
            Start logging shows to see your posts here!
          </Text>
          <Button variant="primary" fullWidth onPress={() => setShowPostModal(true)}>
            Log your first show
          </Button>
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
            Start logging shows to see them here!
          </Text>
          <Button variant="primary" fullWidth onPress={() => setShowPostModal(true)}>
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
            const showCount = playlist.showCount || 0;
            const isOwnPlaylist = playlist.userId === contextCurrentUser?.id;
            return (
              <View key={playlist.id} style={styles.playlistItem}>
                <Pressable
                  style={styles.playlistCardPressable}
                  onPress={() => handlePlaylistPress(playlist.id)}
                >
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistCount}>
                      {showCount} {showCount === 1 ? 'show' : 'shows'}
                    </Text>
                  </View>
                </Pressable>
                {isOwnPlaylist && (
                  <Pressable
                    style={styles.playlistMenuButton}
                    onPress={() => {
                      console.log('🔥 Three dots clicked for playlist:', playlist.id);
                      handleDeletePlaylist(playlist.id, playlist.name);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MoreHorizontal size={20} color={colors.almostWhite} />
                  </Pressable>
                )}
              </View>
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
          <Text style={styles.emptyStateText}>
            Tap the heart icon on any show's poster to save it to a playlist!
          </Text>
        </View>
      )}
    </View>
  );

  // Wait for auth to initialize before showing content
  if (!authReady || !profileUser) {
    return (
      <View style={styles.pageContainer}>
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.pageContainer}>
        {/* Invite Friends Button - Top Right Corner (Owner Only) */}
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
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.almostWhite}
              colors={[colors.almostWhite]}
            />
          }
        >
          {renderProfileInfo()}
          {renderActionButtons()}
          {renderStatsGrid()}
          {renderMyRotation()}
          
          {profileUser && (
            <FavoritesSection 
              userId={profileUser.id} 
              isOwnProfile={true} 
            />
          )}
          
          <View style={styles.tabSelectorContainer}>
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabKey) => setActiveTab(tabKey as Tab)}
              variant="default"
            />
          </View>

          {activeTab === 'posts' ? renderPostsTab() : null}
          {activeTab === 'shows' ? renderShowsTab() : null}
          {activeTab === 'playlists' ? renderPlaylistsTab() : null}
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
            const currentUserId = profileUser.id;
            if (!currentUserId) return usersList;
            
            const currentUserIndex = usersList.findIndex(u => u.id === currentUserId);
            if (currentUserIndex === -1) return usersList;
            
            const sortedUsers = [...usersList];
            const [currentUser] = sortedUsers.splice(currentUserIndex, 1);
            return [currentUser, ...sortedUsers];
          })()}
          title={followersType === 'followers' ? 'Followers' : 'Following'}
          currentUserId={profileUser.id}
          followingIds={following.map(u => u.id)}
          onFollowToggle={handleFollowToggle}
        />

        <PostModal
          visible={showPostModal}
          onClose={() => setShowPostModal(false)}
        />

        <EditProfileModal
          visible={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          displayName={profileUser.displayName}
          username={profileUser.username}
          bio={profileUser.bio || ''}
          avatar={profileUser.avatar || ''}
          socialLinks={profileUser.socialLinks || []}
          onSave={handleSaveProfile}
        />

        <InviteFriendsModal
          visible={showInviteFriendsModal}
          onClose={() => setShowInviteFriendsModal(false)}
          onInvite={async () => {
            // Trigger iOS share sheet
            const APP_STORE_URL = 'https://apps.apple.com/app/episoda/idXXXXXXXXX';
            const message = `Check out EPISODA - the app for TV show discussions and recommendations! ${APP_STORE_URL}`;
            
            try {
              const { Share } = await import('react-native');
              const result = await Share.share({
                message: message,
                url: APP_STORE_URL,
              });

              if (result.action === Share.sharedAction) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowInviteFriendsModal(false);
              }
            } catch (error) {
              console.error('Error sharing:', error);
              if (Platform.OS === 'web') {
                window.alert('Failed to share. Link copied to clipboard.');
              } else {
                Alert.alert('Error', 'Failed to share.');
              }
            }
          }}
        />

        {showPlaylistModal ? (
          <PlaylistModal
            visible={!!showPlaylistModal}
            onClose={() => setShowPlaylistModal(null)}
            show={showPlaylistModal}
            onAddToPlaylist={() => {}}
          />
        ) : null}

        {showPlaylistViewModal ? (
          <PlaylistViewModal
            visible={!!showPlaylistViewModal}
            onClose={() => setShowPlaylistViewModal(null)}
            playlistId={showPlaylistViewModal}
          />
        ) : null}
      </View>
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
    fontFamily: 'InstrumentSerif_400Regular',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
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
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
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
    marginBottom: 34,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  showGridItem: {
    width: '31%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  watchHistoryList: {
    gap: 8,
  },
  showGridPoster: {
    width: '100%',
    height: '100%',
  },
  playlistItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    marginBottom: 12,
    overflow: 'hidden',
  },
  playlistCardPressable: {
    flex: 1,
    padding: 15,
  },
  playlistMenuButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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

  // Invite Friends Floating Button
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
});
