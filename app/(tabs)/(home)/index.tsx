import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, ImageBackground } from 'react-native';
import { colors, typography } from '@/styles/commonStyles';
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Titles</Text>
          <ChevronRight size={9} color="#FFF" strokeWidth={1} />
        </View>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>You May Know</Text>
          <ChevronRight size={9} color="#FFF" strokeWidth={1} />
        </View>
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
              {user.mutualFriends && user.mutualFriends > 0 && (
                <View style={styles.mutualFriendsContainer}>
                  <View style={styles.mutualAvatars}>
                    {mockUsers.slice(0, 2).map((friend, index) => (
                      <Image
                        key={friend.id}
                        source={{ uri: friend.avatar }}
                        style={[styles.mutualAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.mutualText}>{user.mutualFriends} mutual</Text>
                </View>
              )}
              <Pressable
                style={[
                  styles.followButton,
                  isFollowing(user.id) && styles.followingButton
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFollowUser(user.id);
                }}
              >
                <Text style={[
                  styles.followButtonText,
                  isFollowing(user.id) && styles.followingButtonText
                ]}>
                  {isFollowing(user.id) ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
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
          <ChevronRight size={9} color="#FFF" strokeWidth={1} />
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
    <ImageBackground 
      source={require('@/assets/images/app-background.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    marginBottom: 23,
  },
  
  // Welcome section - exact specs
  welcomeSection: {
    gap: 7,
    marginBottom: 29,
  },
  welcomeBack: {
    fontSize: 17,
    fontWeight: '500',
    color: '#F4F4F4',
    lineHeight: 17,
    fontFamily: 'Funnel Display',
  },
  userName: {
    fontSize: 43,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 43,
    letterSpacing: -0.86,
    fontFamily: 'Funnel Display',
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
    fontSize: 13,
    fontWeight: '400',
    color: '#F4F4F4',
    letterSpacing: -0.26,
    fontFamily: 'Funnel Display',
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
    borderColor: 'rgba(255, 255, 255, 0.30)',
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
    borderColor: '#3E3E3E',
    backgroundColor: '#282828',
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
    fontSize: 10,
    fontWeight: '500',
    color: '#8BFC76',
    lineHeight: 10,
    fontFamily: 'Funnel Display',
  },
  friendsWatchingLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#F4F4F4',
    lineHeight: 10,
    fontFamily: 'Funnel Display',
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
    borderColor: '#3E3E3E',
    backgroundColor: '#282828',
    alignItems: 'center',
  },
  userProfilePic: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
  },
  userCardName: {
    fontSize: 13,
    fontWeight: '400',
    color: '#F4F4F4',
    lineHeight: 15.6,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
  },
  userCardUsername: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8BFC76',
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
  },
  mutualFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mutualAvatars: {
    flexDirection: 'row',
  },
  mutualAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.25,
    borderColor: '#F4F4F4',
  },
  mutualText: {
    fontSize: 8,
    fontWeight: '400',
    color: '#A9A9A9',
    fontFamily: 'Funnel Display',
  },
  followButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#8BFC76',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3E3E3E',
  },
  followButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Funnel Display',
  },
  followingButtonText: {
    color: '#F4F4F4',
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
    fontSize: 17,
    fontWeight: '500',
    color: '#F4F4F4',
    marginBottom: 8,
    fontFamily: 'Funnel Display',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#A9A9A9',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
  },
});
