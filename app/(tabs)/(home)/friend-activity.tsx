
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import PostCard from '@/components/PostCard';
import { mockPosts, mockUsers, currentUser } from '@/data/mockData';
import { colors } from '@/styles/commonStyles';

export default function FriendActivityFeed() {
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

  // Include posts from current user and friends
  const friendActivity = mockPosts.filter(post => 
    post.user.id === currentUser.id || mockUsers.some(user => user.id === post.user.id)
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Friend Activity',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          {friendActivity.length > 0 ? (
            friendActivity.map((post) => (
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
