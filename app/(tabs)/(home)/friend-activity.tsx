
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import PostCard from '@/components/PostCard';
import { useData } from '@/contexts/DataContext';
import { colors } from '@/styles/commonStyles';

type SortBy = 'recent' | 'hot';

export default function FriendActivityFeed() {
  const { posts, currentUser } = useData();
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  const handleLike = (postId: string) => {
    console.log('Like post:', postId);
  };

  const handleRepost = (postId: string) => {
    console.log('Repost post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  // Filter posts from users the current user is following
  const friendPosts = posts.filter(post => 
    currentUser.following?.includes(post.user.id)
  );

  // Sort posts based on selected sort option
  const sortedPosts = [...friendPosts].sort((a, b) => {
    if (sortBy === 'recent') {
      return b.timestamp.getTime() - a.timestamp.getTime();
    } else {
      // Hot: sort by engagement (likes + comments + reposts)
      const engagementA = a.likes + a.comments + a.reposts;
      const engagementB = b.likes + b.comments + b.reposts;
      return engagementB - engagementA;
    }
  });

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
        <Pressable
          style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
          onPress={() => setSortBy('recent')}
        >
          <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
            Recent
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sortButton, sortBy === 'hot' && styles.sortButtonActive]}
          onPress={() => setSortBy('hot')}
        >
          <Text style={[styles.sortText, sortBy === 'hot' && styles.sortTextActive]}>
            Hot
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          {sortedPosts.length > 0 ? (
            sortedPosts.map((post) => (
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  sortButtonActive: {
    backgroundColor: colors.secondary,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortTextActive: {
    color: colors.background,
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
