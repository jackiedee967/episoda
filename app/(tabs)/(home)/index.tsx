
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import PostButton from '@/components/PostButton';
import PostCard from '@/components/PostCard';
import ShowCard from '@/components/ShowCard';
import PostModal from '@/components/PostModal';
import { mockPosts, mockShows } from '@/data/mockData';
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
    <View style={styles.headerContainer}>
      <Text style={styles.logo}>EPISADA</Text>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
        style={styles.profilePic}
      />
    </View>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showsScroll}>
        {mockShows.slice(0, 6).map((show) => (
          <ShowCard key={show.id} show={show} />
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
    paddingTop: 60,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  welcomeContainer: {
    paddingHorizontal: 16,
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
  showsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
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
