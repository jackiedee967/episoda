import { View, Text, StyleSheet, ScrollView, Pressable, Image, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, components, typography } from '@/styles/commonStyles';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import Button from '@/components/Button';
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
  
  // Animation for pulsing green dot
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
    <LinearGradient
      colors={['#9334E9', '#FF5E00']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.headerContent}>
        <Image 
          source={require('@/assets/images/8bb62a0a-b050-44de-b77b-ca88fbec6d81.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Pressable onPress={handleProfilePress}>
          <Image 
            source={{ uri: currentUser.avatar }}
            style={styles.profilePicture}
          />
        </Pressable>
      </View>
    </LinearGradient>
  );

  const renderWelcomeSection = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeText}>Welcome back</Text>
      <Text style={styles.userName}>{currentUser.displayName}</Text>
    </View>
  );

  const renderPostInput = () => (
    <View style={styles.postInputCard}>
      <View style={styles.postInputContent}>
        <Animated.View 
          style={[
            styles.greenDot,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={styles.postInputText}>What are you watching?</Text>
      </View>
      <Button
        variant="primary"
        size="medium"
        onPress={() => setPostModalVisible(true)}
      >
        Tell your friends
      </Button>
    </View>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended Titles</Text>
        <Pressable onPress={() => console.log('See all')}>
          <ChevronRight size={20} color={colors.almostWhite} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScroll}
      >
        {mockShows.slice(0, 6).map((show) => (
          <Pressable
            key={show.id}
            style={styles.showCard}
            onPress={() => router.push(`/show/${show.id}`)}
          >
            <Image 
              source={{ uri: show.poster || 'https://via.placeholder.com/300x400' }}
              style={styles.showImage}
            />
            <Pressable style={styles.bookmarkButton}>
              <Bookmark size={20} color={colors.almostWhite} />
            </Pressable>
            <View style={styles.showOverlay}>
              <View style={styles.friendAvatars}>
                {mockUsers.slice(0, Math.min(3, show.friendsWatching || 0)).map((user, index) => (
                  <Image
                    key={user.id}
                    source={{ uri: user.avatar }}
                    style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                  />
                ))}
              </View>
              <Text style={styles.friendsWatchingText}>
                {show.friendsWatching || 0} friends watching
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderYouMayKnow = () => {
    const suggestedUsers = mockUsers.filter(user => !isFollowing(user.id)).slice(0, 5);
    
    if (suggestedUsers.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>You May Know</Text>
          <Pressable onPress={() => console.log('See all')}>
            <ChevronRight size={20} color={colors.almostWhite} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.usersScroll}
        >
          {suggestedUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserPress(user.id)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
              <Text style={styles.userDisplayName} numberOfLines={1}>{user.displayName}</Text>
              <Text style={styles.userUsername} numberOfLines={1}>@{user.username}</Text>
              {user.mutualFriends && user.mutualFriends > 0 && (
                <View style={styles.mutualFriendsContainer}>
                  <View style={styles.mutualAvatars}>
                    {mockUsers.slice(0, 2).map((friend, index) => (
                      <Image
                        key={friend.id}
                        source={{ uri: friend.avatar }}
                        style={[styles.mutualAvatar, { marginLeft: index > 0 ? -6 : 0 }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.mutualFriendsText}>
                    {user.mutualFriends} mutual
                  </Text>
                </View>
              )}
              <Button
                variant={isFollowing(user.id) ? 'secondary' : 'primary'}
                size="small"
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handleFollowUser(user.id);
                }}
                fullWidth
              >
                {isFollowing(user.id) ? 'Following' : 'Follow'}
              </Button>
            </TouchableOpacity>
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Activity</Text>
          <Pressable onPress={() => console.log('See all')}>
            <ChevronRight size={20} color={colors.almostWhite} />
          </Pressable>
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
            <Text style={styles.emptyStateTitle}>No friend activity yet</Text>
            <Text style={styles.emptyStateText}>
              Follow friends to see what they're watching
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeSection()}
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
    backgroundColor: colors.pageBackground,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: spacing.pageMargin,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 24,
  },
  profilePicture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.pureWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  welcomeContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingTop: spacing.gapLarge,
    paddingBottom: spacing.gapMedium,
  },
  welcomeText: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginBottom: 4,
  },
  userName: {
    ...typography.titleXL,
    color: colors.pureWhite,
  },
  postInputCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    marginHorizontal: spacing.pageMargin,
    marginBottom: spacing.gapLarge,
    padding: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gapMedium,
  },
  postInputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.greenHighlight,
  },
  postInputText: {
    ...typography.subtitle,
    color: colors.almostWhite,
  },
  section: {
    marginBottom: spacing.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageMargin,
    marginBottom: spacing.gapLarge,
  },
  sectionTitle: {
    ...typography.titleL,
    color: colors.pureWhite,
  },
  showsScroll: {
    paddingLeft: spacing.pageMargin,
    paddingRight: spacing.pageMargin,
    gap: spacing.gapMedium,
  },
  showCard: {
    width: 160,
    height: 240,
    borderRadius: components.borderRadiusCard,
    overflow: 'hidden',
    position: 'relative',
  },
  showImage: {
    width: '100%',
    height: '100%',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  friendAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.pureWhite,
  },
  friendsWatchingText: {
    ...typography.p2,
    color: colors.almostWhite,
  },
  usersScroll: {
    paddingLeft: spacing.pageMargin,
    paddingRight: spacing.pageMargin,
    gap: spacing.gapMedium,
  },
  userCard: {
    width: 140,
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.gapMedium,
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.gapSmall,
  },
  userDisplayName: {
    ...typography.p1Bold,
    color: colors.pureWhite,
    textAlign: 'center',
  },
  userUsername: {
    ...typography.p2,
    color: colors.grey1,
    textAlign: 'center',
  },
  mutualFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mutualAvatars: {
    flexDirection: 'row',
  },
  mutualAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.pureWhite,
  },
  mutualFriendsText: {
    ...typography.p3,
    color: colors.grey1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.pageMargin,
    paddingVertical: spacing.sectionSpacing,
  },
  emptyStateTitle: {
    ...typography.titleL,
    color: colors.pureWhite,
    marginBottom: spacing.gapSmall,
  },
  emptyStateText: {
    ...typography.p1,
    color: colors.grey1,
    textAlign: 'center',
  },
});
