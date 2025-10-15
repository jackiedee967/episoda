
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import ShowCard from '@/components/ShowCard';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PostButton from '@/components/PostButton';
import { mockPosts, mockShows, mockUsers, currentUser } from '@/data/mockData';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function HomeScreen() {
  const router = useRouter();
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

  const handleLike = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleRepost = (postId: string) => {
    console.log('Repost post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  const handleFollowUser = (userId: string) => {
    console.log('Follow user:', userId);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Image
        source={require('@/assets/images/37b8ed8a-6d1a-4831-b023-91c2cb1a7f19.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable onPress={() => router.push('/user/' + currentUser.id)}>
        <Image
          source={{ uri: currentUser.avatar }}
          style={styles.profileImage}
        />
      </Pressable>
    </View>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommended Titles</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsContainer}
      >
        {mockShows.map((show) => {
          const friends = mockUsers.slice(0, Math.min(3, show.friendsWatching));
          return <ShowCard key={show.id} show={show} friends={friends} />;
        })}
      </ScrollView>
    </View>
  );

  const renderYouMayKnow = () => {
    // Get suggested users based on mutual friends
    const suggestedUsers = mockUsers.filter(user => {
      // Don't suggest users we already follow
      if (currentUser.following?.includes(user.id)) return false;
      
      // Check for mutual friends
      const mutualFriends = user.followers?.filter(followerId => 
        currentUser.following?.includes(followerId)
      ) || [];
      
      return mutualFriends.length > 0;
    }).slice(0, 3);

    if (suggestedUsers.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>You May Know</Text>
        <View style={styles.youMayKnowContainer}>
          {suggestedUsers.map((user) => {
            const mutualFriends = user.followers?.filter(followerId => 
              currentUser.following?.includes(followerId)
            ) || [];
            
            const mutualFriendUsers = mockUsers.filter(u => 
              mutualFriends.includes(u.id)
            );

            return (
              <View key={user.id} style={styles.suggestedUserCard}>
                <View style={styles.suggestedUserHeader}>
                  <Pressable 
                    onPress={() => router.push(`/user/${user.id}`)}
                    style={styles.suggestedUserInfo}
                  >
                    <View style={styles.avatarContainer}>
                      <Image 
                        source={{ uri: user.avatar }} 
                        style={styles.suggestedUserAvatar} 
                      />
                      {user.username === 'jackie' || user.username === 'liz' ? (
                        <View style={styles.verifiedBadge}>
                          <IconSymbol name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.suggestedUserDetails}>
                      <Text style={styles.suggestedUserName}>{user.displayName}</Text>
                      <Text style={styles.suggestedUserUsername}>@{user.username}</Text>
                    </View>
                  </Pressable>
                  <Pressable 
                    style={styles.followButton}
                    onPress={() => handleFollowUser(user.id)}
                  >
                    <Text style={styles.followButtonText}>Follow</Text>
                  </Pressable>
                </View>
                
                <View style={styles.mutualFriendsContainer}>
                  <View style={styles.mutualFriendsAvatars}>
                    {mutualFriendUsers.slice(0, 3).map((friend, index) => (
                      <Image 
                        key={friend.id}
                        source={{ uri: friend.avatar }} 
                        style={[
                          styles.mutualFriendAvatar,
                          index > 0 && { marginLeft: -8 }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={styles.mutualFriendsText}>
                    Followed by {mutualFriendUsers.length === 1 
                      ? mutualFriendUsers[0].displayName
                      : `${mutualFriendUsers[0].displayName} and ${mutualFriendUsers.length - 1} other${mutualFriendUsers.length > 2 ? 's' : ''}`
                    }
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFriendActivity = () => {
    // Include posts from current user and friends
    const friendActivity = mockPosts.filter(post => 
      post.user.id === currentUser.id || mockUsers.some(user => user.id === post.user.id)
    );

    // Show only first 10 posts
    const displayedPosts = friendActivity.slice(0, 10);
    const hasMore = friendActivity.length > 10;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friend Activity</Text>
        {displayedPosts.length > 0 ? (
          <>
            {displayedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post.id)}
                onRepost={() => handleRepost(post.id)}
                onShare={() => handleShare(post.id)}
              />
            ))}
            {hasMore && (
              <Pressable 
                style={styles.viewMoreButton}
                onPress={() => router.push('/(tabs)/(home)/friend-activity')}
              >
                <Text style={styles.viewMoreText}>View More</Text>
                <IconSymbol name="chevron.right" size={20} color={colors.text} />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activity yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to post or invite friends to see their activity
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderHeader()}

        <View style={styles.divider} />

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome Back, Jacqueline</Text>
        </View>

        <PostButton onPress={() => setIsPostModalVisible(true)} />

        {renderRecommendedTitles()}
        {renderFriendActivity()}
        {renderYouMayKnow()}
      </ScrollView>

      <PostModal
        visible={isPostModalVisible}
        onClose={() => setIsPostModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
  },
  logo: {
    width: 120,
    height: 24,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.card,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'FunnelDisplay_700Bold',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    fontFamily: 'FunnelDisplay_700Bold',
  },
  showsContainer: {
    gap: 8,
    paddingRight: 16,
  },
  youMayKnowContainer: {
    gap: 12,
  },
  suggestedUserCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  suggestedUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  suggestedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  suggestedUserDetails: {
    flex: 1,
  },
  suggestedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  suggestedUserUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  mutualFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mutualFriendsAvatars: {
    flexDirection: 'row',
  },
  mutualFriendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
  },
  mutualFriendsText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    fontFamily: 'System',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  viewMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
