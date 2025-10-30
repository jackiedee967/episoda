
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import PostCard from '@/components/PostCard';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import { useData } from '@/contexts/DataContext';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';

export default function FriendActivityFeed() {
  const { posts, currentUser, allReposts } = useData();
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const handleLike = (postId: string) => {
    console.log('Like post:', postId);
  };

  const handleRepost = (postId: string) => {
    console.log('Repost post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };
  
  // Filter posts from users the current user is following (original posts)
  const friendPosts = useMemo(() => 
    posts.filter(post => 
      currentUser.following?.includes(post.user.id)
    ),
    [posts, currentUser.following]
  );

  // Filter reposts from friends
  const friendReposts = useMemo(() => 
    allReposts.filter(repost =>
      repost && repost.repostedBy && currentUser.following?.includes(repost.repostedBy.id)
    ),
    [allReposts, currentUser.following]
  );

  // Combine original posts and reposts (using repost timestamp for reposts, not original post timestamp)
  const allActivity = useMemo(() => [
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
      timestamp: repost.timestamp, // Use the repost timestamp, not the original post timestamp
    })),
  ], [friendPosts, friendReposts]);

  // Sort posts based on selected sort option
  const sortedActivity = useMemo(() => [...allActivity].sort((a, b) => {
    if (sortBy === 'recent') {
      // Sort by the activity timestamp (repost time for reposts, post time for original posts)
      return b.timestamp.getTime() - a.timestamp.getTime();
    } else {
      // Hot: sort by engagement (likes + comments + reposts)
      const engagementA = a.post.likes + a.post.comments + a.post.reposts;
      const engagementB = b.post.likes + b.post.comments + b.post.reposts;
      return engagementB - engagementA;
    }
  }), [allActivity, sortBy]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Friend Activity',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <SortDropdown 
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          {sortedActivity.length > 0 ? (
            sortedActivity.map((item, index) => (
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
              <Text style={styles.emptyStateText}>No activity yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Be the first to post or invite friends to see their activity
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
