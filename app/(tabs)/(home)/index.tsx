
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { colors, commonStyles, spacing, components } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import ShowCard from '@/components/ShowCard';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import PostButton from '@/components/PostButton';
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

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.headerContent}>
        <Image 
          source={require('@/assets/images/f0aae236-2720-450c-a947-ed57bcf670ec.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Pressable onPress={handleProfilePress} style={styles.profileButton}>
          <Image 
            source={{ uri: currentUser.avatar }}
            style={styles.profilePicture}
          />
        </Pressable>
      </View>
      <View style={styles.separator} />
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.userName}>{currentUser.displayName}</Text>
      </View>
    </View>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended Titles</Text>
        <Pressable 
          onPress={() => router.push('/recommended-titles')}
          style={styles.seeAllButton}
        >
          <ChevronRight size={24} color={colors.accent} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScroll}
      >
        {mockShows.slice(0, 6).map((show) => (
          <ShowCard
            key={show.id}
            show={show}
            friends={mockUsers.slice(0, show.friendsWatching)}
          />
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
                <Text style={styles.followButtonText}>
                  {isFollowing(user.id) ? 'Following' : 'Follow'}
                </Text>
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
            onPress={() => router.push('/(tabs)/(home)/friend-activity')}
            style={styles.seeAllButton}
          >
            <ChevronRight size={24} color={colors.accent} />
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
              onPress={() => console.log('Invite friends')}
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
    <ImageBackground
      source={require('@/assets/images/473b5b23-a63c-4cdf-88f7-c09d28793226.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {renderHeader()}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PostButton onPress={() => setPostModalVisible(true)} />
          {renderRecommendedTitles()}
          {renderYouMayKnow()}
          {renderFriendActivity()}
        </ScrollView>

        <PostModal
          visible={postModalVisible}
          onClose={() => setPostModalVisible(false)}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(14, 14, 14, 0.85)',
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageMargin,
    paddingBottom: 16,
  },
  logo: {
    width: 120,
    height: 32,
  },
  profileButton: {
    padding: 2,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    width: '100%',
  },
  welcomeContainer: {
    paddingHorizontal: spacing.pageMargin,
    paddingTop: 16,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.pageMargin,
    paddingTop: spacing.pageMargin,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.gapLarge,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllButton: {
    padding: 4,
  },
  showsScroll: {
    gap: spacing.gapLarge,
    paddingRight: spacing.pageMargin,
  },
  usersScroll: {
    gap: spacing.gapLarge,
    paddingRight: spacing.pageMargin,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusCard,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.cardPadding,
    alignItems: 'center',
    width: 160,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.gapMedium,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.gapMedium,
  },
  followButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusCard,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.sectionSpacing,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.gapLarge,
    marginBottom: spacing.gapSmall,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.pageMargin,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: spacing.gapMedium,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
