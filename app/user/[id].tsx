
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import { mockUsers, mockPosts, currentUser } from '@/data/mockData';

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const [isFollowing, setIsFollowing] = useState(false);

  const user = id === currentUser.id ? currentUser : mockUsers.find((u) => u.id === id);
  const userPosts = mockPosts.filter((p) => p.user.id === id);
  const isCurrentUser = id === currentUser.id;

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <Text style={commonStyles.text}>User not found</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <Text style={styles.displayName}>{user.displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>127</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>342</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>1.2K</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
      </View>

      {!isCurrentUser && (
        <Pressable
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={() => setIsFollowing(!isFollowing)}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );

  const renderPosts = () => (
    <View style={styles.postsContainer}>
      <Text style={styles.sectionTitle}>Posts</Text>
      {userPosts.length > 0 ? (
        userPosts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="bubble.left" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            {isCurrentUser
              ? 'Start logging shows to see your posts here!'
              : `${user.displayName} hasn't posted anything yet.`}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: user.username,
          headerBackTitle: 'Back',
          headerTintColor: colors.text,
        }}
      />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          {renderPosts()}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  followButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  followingButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
  postsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
