import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, Platform, ImageBackground } from 'react-native';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import { LogAShow } from '@/components/LogAShow';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { mockShows, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { ChevronRight, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { posts, currentUser, followUser, unfollowUser, isFollowing, getAllReposts } = useData();
  const [postModalVisible, setPostModalVisible] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLike = (postId: string) => {
    console.log('Like post:', postId);
  };

  const handleRepost = (postId: string) => {
    console.log('Repost post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  const handleFollowUser = async (userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Stack.Screen options={{ headerShown: false }} />
      <Image 
        source={require('@/assets/images/8bb62a0a-b050-44de-b77b-ca88fbec6d81.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable onPress={handleProfilePress}>
        <Image 
          source={{ uri: currentUser.avatar }}
          style={styles.profilePic}
        />
      </Pressable>
    </View>
  );

  const renderDivider = () => (
    <View style={styles.divider} />
  );

  const renderWelcome = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeBack}>Welcome back</Text>
      <Text style={styles.userName}>{currentUser.displayName}</Text>
    </View>
  );

  const renderPostInput = () => (
    <LogAShow onPress={() => setPostModalVisible(true)} />
  );

  const renderRecommendedTitles = () => {
    const getFriendsWatchingCount = (showId: string) => {
      const friendIds = currentUser.following || [];
      const friendsWhoPosted = posts.filter(post => 
        friendIds.includes(post.user.id) && 
        post.show?.id === showId
      );
      const uniqueFriends = new Set(friendsWhoPosted.map(post => post.user.id));
      return uniqueFriends.size;
    };

    return (
      <View style={styles.recommendedSection}>
        <Pressable 
          style={styles.sectionHeader}
          onPress={() => router.push('/recommended-titles')}
        >
          <Text style={styles.sectionTitle}>Recommended Titles</Text>
          <ChevronRight size={10} color={tokens.colors.pureWhite} strokeWidth={1} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showsScroll}
          style={styles.showsScrollView}
        >
          {mockShows.slice(0, 6).map((show) => {
            const friendCount = getFriendsWatchingCount(show.id);
            const friendsToShow = mockUsers
              .filter(user => currentUser.following?.includes(user.id))
              .slice(0, Math.min(3, friendCount));

            return (
              <Pressable
                key={show.id}
                style={styles.showCard}
                onPress={() => router.push(`/show/${show.id}`)}
              >
                <Image 
                  source={{ uri: show.poster || 'https://via.placeholder.com/215x280' }}
                  style={styles.showImage}
                />
                {friendCount > 0 && (
                  <View style={styles.friendsBar}>
                    <View style={styles.friendAvatars}>
                      {friendsToShow.map((user, index) => (
                        <Image
                          key={user.id}
                          source={{ uri: user.avatar }}
                          style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                        />
                      ))}
                    </View>
                    <View style={styles.friendsWatchingTextContainer}>
                      <Text style={styles.friendsWatchingNumber}>{friendCount}</Text>
                      <Text style={styles.friendsWatchingLabel}> friends watching</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderYouMayKnow = () => {
    const suggestedUsers = mockUsers.filter(user => !isFollowing(user.id)).slice(0, 5);
    
    if (suggestedUsers.length === 0) return null;

    return (
      <View style={styles.youMayKnowSection}>
        <Pressable 
          style={styles.sectionHeader}
          onPress={() => router.push('/(tabs)/search?tab=users')}
        >
          <Text style={styles.sectionTitle}>You May Know</Text>
          <ChevronRight size={10} color={tokens.colors.pureWhite} strokeWidth={1} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.userCardsScroll}
        >
          {suggestedUsers.map((user) => (
            <Pressable
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserPress(user.id)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: user.avatar }} style={styles.userProfilePic} />
              <Text style={styles.userCardName} numberOfLines={1}>{user.displayName}</Text>
              <Text style={styles.userCardUsername} numberOfLines={1}>@{user.username}</Text>
              <View style={styles.friendsWatchingContainer}>
                <View style={styles.friendsAvatarRow}>
                  {mockUsers.slice(0, 3).map((friend, index) => (
                    <Image
                      key={friend.id}
                      source={{ uri: friend.avatar }}
                      style={[styles.friendAvatar, { marginLeft: index > 0 ? -6 : 0 }]}
                    />
                  ))}
                  <View style={[styles.friendAvatar, styles.countBadge, { marginLeft: -6 }]}>
                    <Text style={styles.countBadgeText}>+5</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFriendActivity = () => {
    const allReposts = getAllReposts();
    
    const friendPosts = posts.filter(post => 
      currentUser.following?.includes(post.user.id)
    );

    const friendReposts = allReposts.filter(repost =>
      currentUser.following?.includes(repost.repostedBy.id)
    );

    const allActivity = [
      ...friendPosts.map(post => ({
        post,
        isRepost: false,
        repostedBy: undefined,
        timestamp: post.timestamp,
      })),
      ...friendReposts.map(repost => ({
        post: repost.post,
        isRepost: true,
        repostedBy: { id: repost.repostedBy.id, displayName: repost.repostedBy.displayName },
        timestamp: repost.timestamp,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return (
      <View style={styles.friendActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Activity</Text>
        </View>
        {allActivity.length > 0 ? (
          allActivity.slice(0, 5).map((item, index) => (
            <PostCard
              key={`${item.post.id}-${item.isRepost ? 'repost' : 'post'}-${index}`}
              post={item.post}
              onLike={() => handleLike(item.post.id)}
              onRepost={() => handleRepost(item.post.id)}
              onShare={() => handleShare(item.post.id)}
              isRepost={item.isRepost}
              repostedBy={item.repostedBy}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No friend activity yet</Text>
            <Text style={styles.emptyText}>Follow friends to see what they're watching</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderDivider()}
        {renderWelcome()}
        {renderPostInput()}
        {renderRecommendedTitles()}
        {renderYouMayKnow()}
        {renderFriendActivity()}
      </ScrollView>

      <PostModal
        visible={postModalVisible}
        onClose={() => setPostModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Header - exact Figma specs
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logo: {
    width: 123.2,
    height: 21.6,
  },
  profilePic: {
    width: 36.286,
    height: 36.286,
    borderRadius: 14,
  },
  
  // Divider - exact specs
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.imageStroke,
    marginBottom: 23,
  },
  
  // Welcome section - exact specs
  welcomeSection: {
    gap: 7,
    marginBottom: 29,
  },
  welcomeBack: {
    ...tokens.typography.subtitle,
    color: tokens.colors.almostWhite,
  },
  userName: {
    ...tokens.typography.titleXl,
    color: tokens.colors.pureWhite,
  },
  
  
  // Recommended Titles - exact specs
  recommendedSection: {
    gap: 17,
    marginBottom: 29,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
  },
  showsScrollView: {
    marginLeft: -20,
    marginRight: -20,
  },
  showsScroll: {
    gap: 9,
    paddingLeft: 20,
    paddingRight: 20,
  },
  showCard: {
    width: 215,
    height: 280,
    position: 'relative',
  },
  showImage: {
    width: 215,
    height: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
  },
  friendsBar: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 191,
    height: 38,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  friendAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  friendsWatchingTextContainer: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendsWatchingNumber: {
    ...tokens.typography.p3M,
    color: tokens.colors.greenHighlight,
  },
  friendsWatchingLabel: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
  },
  
  // You May Know - exact specs
  youMayKnowSection: {
    gap: 16,
    marginBottom: 29,
  },
  userCardsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  userCard: {
    width: 114,
    paddingVertical: 12,
    paddingHorizontal: 11,
    gap: 10,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    alignItems: 'center',
  },
  userProfilePic: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
  },
  userCardName: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    textAlign: 'center',
  },
  userCardUsername: {
    ...tokens.typography.p3M,
    color: tokens.colors.greenHighlight,
    textAlign: 'center',
  },
  friendsWatchingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  friendsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.25,
    borderColor: tokens.colors.almostWhite,
  },
  countBadge: {
    backgroundColor: tokens.colors.tabBack4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...tokens.typography.p4,
    color: tokens.colors.black,
  },
  
  // Friend Activity - exact specs
  friendActivitySection: {
    gap: 17,
    marginBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.almostWhite,
    marginBottom: 8,
  },
  emptyText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
});
