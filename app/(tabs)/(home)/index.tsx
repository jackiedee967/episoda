
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
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

export default function HomeScreen() {
  const router = useRouter();
  const { posts, currentUser, followUser, unfollowUser, isFollowing } = useData();
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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Text style={styles.headerTitle}>Home</Text>
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
          <ChevronRight size={24} color={colors.secondary} />
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
            <View key={user.id} style={styles.userCard}>
              <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
              <Text style={styles.userDisplayName}>{user.displayName}</Text>
              <Text style={styles.userUsername}>@{user.username}</Text>
              <Pressable
                style={styles.followButton}
                onPress={() => handleFollowUser(user.id)}
              >
                <Text style={styles.followButtonText}>
                  {isFollowing(user.id) ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFriendActivity = () => {
    // Filter posts from users the current user is following
    const friendPosts = posts.filter(post => 
      currentUser.following?.includes(post.user.id)
    );

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friend Activity</Text>
          <Pressable 
            onPress={() => router.push('/(tabs)/(home)/friend-activity')}
            style={styles.seeAllButton}
          >
            <ChevronRight size={24} color={colors.secondary} />
          </Pressable>
        </View>
        {friendPosts.length > 0 ? (
          friendPosts.slice(0, 5).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post.id)}
              onRepost={() => handleRepost(post.id)}
              onShare={() => handleShare(post.id)}
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
              <IconSymbol name="person.badge.plus" size={20} color={colors.background} />
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </Pressable>
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
        {/* Post Button */}
        <PostButton onPress={() => setPostModalVisible(true)} />

        {/* Recommended Titles */}
        {renderRecommendedTitles()}

        {/* You May Know */}
        {renderYouMayKnow()}

        {/* Friend Activity */}
        {renderFriendActivity()}
      </ScrollView>

      {/* Post Modal */}
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
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    gap: 16,
    paddingRight: 20,
  },
  usersScroll: {
    gap: 16,
    paddingRight: 20,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: 160,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  followButton: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
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
    backgroundColor: colors.secondary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
