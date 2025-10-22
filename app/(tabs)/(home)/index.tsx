
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TouchableOpacity } from 'react-native';
import { colors, commonStyles, spacing, components } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import ShowCard from '@/components/ShowCard';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { mockShows, mockUsers } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { posts, currentUser, followUser, unfollowUser, isFollowing, getAllReposts } = useData();
  const [postModalVisible, setPostModalVisible] = useState(false);

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
        console.log('Unfollowed user:', userId);
      } else {
        await followUser(userId);
        console.log('Followed user:', userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {/* Gradient Background Image */}
      <Image 
        source={require('@/assets/images/a0502b07-d8ba-485c-bc74-1f95e0dc49d6.png')}
        style={styles.gradientImage}
        resizeMode="cover"
      />
      
      {/* Logo and Profile Photo on top of gradient */}
      <View style={styles.headerTopRow}>
        <Image 
          source={require('@/assets/images/f0aae236-2720-450c-a947-ed57bcf670ec.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Pressable onPress={() => router.push('/(tabs)/profile')}>
          <Image 
            source={{ uri: currentUser.avatar }}
            style={styles.profilePhoto}
          />
        </Pressable>
      </View>

      {/* Welcome text and name below gradient */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.userName}>{currentUser.displayName}</Text>
      </View>
    </View>
  );

  const renderPostBar = () => (
    <Pressable style={styles.postBar} onPress={() => setPostModalVisible(true)}>
      <View style={styles.postBarLeft}>
        <View style={styles.greenDot} />
        <Text style={styles.postBarText}>What are you watching?</Text>
      </View>
      <View style={styles.postBarButton}>
        <Text style={styles.postBarButtonText}>Tell your friends</Text>
      </View>
    </Pressable>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended Titles</Text>
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/recommended-titles');
          }}
        >
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScroll}
      >
        {mockShows.slice(0, 6).map((show) => (
          <View key={show.id} style={styles.showCardWrapper}>
            <Pressable 
              style={styles.showCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/show/${show.id}`);
              }}
            >
              <Image 
                source={{ uri: show.poster }}
                style={styles.showPoster}
              />
              {/* Gradient overlay at bottom */}
              <View style={styles.showCardOverlay}>
                <View style={styles.friendsWatchingContainer}>
                  <View style={styles.friendAvatarsRow}>
                    {mockUsers.slice(0, 3).map((user, index) => (
                      <Image 
                        key={user.id}
                        source={{ uri: user.avatar }}
                        style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.friendsWatchingText}>
                    Max and {show.friendsWatching} friends watching
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderYouMayKnow = () => {
    const suggestedUsers = mockUsers.filter(user => !isFollowing(user.id));
    
    if (suggestedUsers.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>You May Know</Text>
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
              <Text style={styles.userDisplayName}>{user.displayName}</Text>
              <Text style={styles.userUsername}>@{user.username}</Text>
              <Pressable
                style={styles.followButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFollowUser(user.id);
                }}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </Pressable>
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
          <Pressable 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/(home)/friend-activity');
            }}
          >
            <ChevronRight size={24} color={colors.text} />
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
            <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No friend activity yet</Text>
            <Text style={styles.emptyStateText}>
              Follow friends to see what they&apos;re watching
            </Text>
            <Pressable
              style={styles.inviteButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                console.log('Invite friends');
              }}
            >
              <IconSymbol name="person.badge.plus" size={20} color="#000000" />
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </Pressable>
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
        {renderPostBar()}
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // HEADER SECTION
  headerContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  gradientImage: {
    width: '100%',
    height: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  logo: {
    width: 120,
    height: 30,
    tintColor: colors.text,
  },
  profilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    paddingTop: 136,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 0,
  },
  userName: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'FunnelDisplay_700Bold',
    lineHeight: 52,
  },

  // POST BAR
  postBar: {
    backgroundColor: colors.card,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    height: 56,
    marginHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
  },
  postBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 12,
  },
  postBarText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  postBarButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postBarButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },

  // SECTIONS
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  // RECOMMENDED TITLES
  showsScroll: {
    paddingLeft: 24,
    gap: 12,
  },
  showCardWrapper: {
    width: 160,
  },
  showCard: {
    width: 160,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  showPoster: {
    width: '100%',
    height: '100%',
  },
  showCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    background: 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.9))',
    justifyContent: 'flex-end',
    padding: 12,
  },
  friendsWatchingContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  friendAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.text,
  },
  friendsWatchingText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text,
  },

  // YOU MAY KNOW
  usersScroll: {
    paddingLeft: 24,
    gap: 12,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: 16,
    alignItems: 'center',
    width: 160,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  followButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  // EMPTY STATE
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
