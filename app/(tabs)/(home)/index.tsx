
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { Stack } from 'expo-router';
import ShowCard from '@/components/ShowCard';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import PostButton from '@/components/PostButton';
import { mockPosts, mockShows, mockUsers, currentUser } from '@/data/mockData';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function HomeScreen() {
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
    // TODO: Implement repost functionality
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
    // TODO: Implement share functionality
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Image
        source={require('@/assets/images/59e4d593-53e7-4f24-ac6a-4b6a77fdf55c.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable>
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

  const renderFriendActivity = () => {
    // Include posts from current user and friends
    const friendActivity = mockPosts.filter(post => 
      post.user.id === currentUser.id || mockUsers.some(user => user.id === post.user.id)
    );

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friend Activity</Text>
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
