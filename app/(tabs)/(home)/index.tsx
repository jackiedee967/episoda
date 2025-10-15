
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import PostButton from '@/components/PostButton';
import PostCard from '@/components/PostCard';
import ShowCard from '@/components/ShowCard';
import PostModal from '@/components/PostModal';
import { mockPosts, mockShows, mockUsers } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';

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
          source={require('@/assets/images/fbbcb56a-80e4-45a8-b588-5a910d5e5b2a.png')}
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

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeText}>Welcome back</Text>
      <Text style={styles.userName}>Jacqueline</Text>
    </View>
  );

  const renderRecommendedTitles = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended Titles</Text>
        <IconSymbol name="arrow.right" size={20} color={colors.text} />
      </View>
      <View style={styles.showsGrid}>
        {mockShows.slice(0, 6).map((show, index) => (
          <ShowCard 
            key={show.id} 
            show={show}
            friends={mockUsers.slice(0, Math.min(3, show.friendsWatching))}
          />
        ))}
      </View>
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
          <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
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
          {renderWelcome()}
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
    paddingBottom: 12,
  },
  logo: {
    height: 32,
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
    marginHorizontal: 16,
    opacity: 0.3,
  },
  welcomeContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 16,
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
    fontWeight: '600',
    color: colors.text,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
