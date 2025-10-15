
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import PostButton from '@/components/PostButton';
import PostCard from '@/components/PostCard';
import ShowCard from '@/components/ShowCard';
import PostModal from '@/components/PostModal';
import { mockPosts, mockShows, mockUsers } from '@/data/mockData';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [posts, setPosts] = useState(mockPosts);

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <Image
          source={require('@/assets/images/b3d4fad8-9b2d-48bf-abdd-0dad6f1f4ff3.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
          style={styles.profilePic}
        />
      </View>
      <View style={styles.divider} />
    </>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommended Titles</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScrollContainer}
      >
        {mockShows.slice(0, 6).map((show, index) => (
          <ShowCard 
            key={show.id} 
            show={show}
            friends={mockUsers.slice(0, Math.min(3, show.friendsWatching))}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderFriendActivity = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Friend Activity</Text>
      {posts.length > 0 ? (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No friend activity yet</Text>
          <Text style={styles.emptyStateText}>
            Invite your friends to see what they&apos;re watching!
          </Text>
          <Pressable style={styles.inviteButton}>
            <Text style={styles.inviteButtonText}>Invite Friends</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          <View style={styles.content}>
            <PostButton onPress={() => setModalVisible(true)} />
            {renderRecommendedTitles()}
            {renderFriendActivity()}
          </View>
        </ScrollView>
      </View>
      <PostModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  logo: {
    height: 24,
    width: 120,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
  },
  showsScrollContainer: {
    paddingRight: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
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
    marginBottom: 16,
  },
  inviteButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
