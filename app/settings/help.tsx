
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Asset } from 'expo-asset';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';

const appBackground = Asset.fromModule(require('../../assets/images/app-background.jpg')).uri;
import { supabase } from '@/integrations/supabase/client';
import { HelpDeskPost } from '@/types';
import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { isAdmin } from '@/config/admins';
import ButtonL from '@/components/ButtonL';

export default function HelpDeskScreen() {
  const router = useRouter();
  const { currentUser } = useData();
  const [posts, setPosts] = useState<HelpDeskPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userIsAdmin = isAdmin(currentUser?.id);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('help_desk_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/settings/help/create-post');
  };

  const handleCreateAnnouncement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/settings/help/create-announcement');
  };

  const handlePostPress = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/settings/help/post/${postId}`);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Feature Request':
        return colors.purple;
      case 'Support':
        return colors.blue;
      case 'Feedback':
        return colors.green;
      case 'Admin Announcement':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const adminPosts = posts.filter(p => p.category === 'Admin Announcement');
  const communityPosts = posts.filter(p => p.category !== 'Admin Announcement');

  const renderAdminCard = (post: HelpDeskPost) => (
    <Pressable
      key={post.id}
      style={styles.adminCard}
      onPress={() => handlePostPress(post.id)}
    >
      <Text style={styles.adminCardTitle}>{post.title}</Text>
      <Text style={styles.adminCardPreview}>
        {truncateText(post.details, 100)}
      </Text>
      <View style={styles.adminCardFooter}>
        <View style={styles.adminCardStats}>
          <Heart size={14} color={colors.textSecondary} />
          <Text style={styles.adminCardStatText}>{post.likes_count}</Text>
        </View>
        <View style={styles.adminCardStats}>
          <MessageCircle size={14} color={colors.textSecondary} />
          <Text style={styles.adminCardStatText}>{post.comments_count}</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderCommunityPost = (post: HelpDeskPost) => (
    <Pressable
      key={post.id}
      style={styles.communityPost}
      onPress={() => handlePostPress(post.id)}
    >
      <View style={styles.communityPostHeader}>
        <Image
          source={{ uri: currentUser.avatar }}
          style={styles.communityPostAvatar}
        />
        <View style={styles.communityPostHeaderText}>
          <View style={styles.communityPostUserRow}>
            <Text style={styles.communityPostUsername}>{post.username}</Text>
            {post.username === 'jvckie' ? (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Team</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.communityPostTimestamp}>
            {formatTimestamp(post.created_at)}
          </Text>
        </View>
      </View>

      <Text style={styles.communityPostTitle}>{post.title}</Text>
      <Text style={styles.communityPostPreview}>
        {truncateText(post.details, 120)}
      </Text>

      <View style={styles.communityPostFooter}>
        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
          <Text style={[styles.categoryTagText, { color: getCategoryColor(post.category) }]}>
            {post.category}
          </Text>
        </View>
        <View style={styles.communityPostStats}>
          <Heart size={14} color={colors.textSecondary} />
          <Text style={styles.communityPostStatText}>{post.likes_count}</Text>
          <MessageCircle size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.communityPostStatText}>{post.comments_count}</Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      />
      <ImageBackground
        source={{ uri: appBackground }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
          }
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>The Help Desk</Text>
          <Text style={styles.headerSubtitle}>
            Have a feature question, need support, or just wanna chat with the founders? This is your space. 
            We&apos;re building this platform with you, so let us know what matters!
          </Text>
        </View>

        {/* From the Team Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FROM THE TEAM</Text>
            {userIsAdmin ? (
              <Pressable style={styles.createButton} onPress={handleCreateAnnouncement}>
                <Plus size={16} color={colors.background} />
                <Text style={styles.createButtonText}>Announce</Text>
              </Pressable>
            ) : null}
          </View>
          {adminPosts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.adminCardsContainer}
            >
              {adminPosts.map(renderAdminCard)}
            </ScrollView>
          ) : (
            <Text style={styles.emptyAdminText}>No announcements yet.</Text>
          )}
        </View>

        {/* Community Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>COMMUNITY POSTS</Text>
            <Pressable style={styles.createButton} onPress={handleCreatePost}>
              <Plus size={16} color={colors.background} />
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>
          <View style={styles.communityPostsContainer}>
            {communityPosts.length > 0 ? (
              communityPosts.map(renderCommunityPost)
            ) : (
              <Text style={styles.emptyText}>No community posts yet. Be the first to post!</Text>
            )}
          </View>
        </View>
      </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  adminCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  adminCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: 280,
    gap: 8,
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  adminCardPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  adminCardFooter: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  adminCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminCardStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  communityPostsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  communityPost: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  communityPostHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  communityPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  communityPostHeaderText: {
    flex: 1,
    gap: 2,
  },
  communityPostUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  communityPostUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  adminBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
  communityPostTimestamp: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  communityPostTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  communityPostPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  communityPostFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  communityPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityPostStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  emptyAdminText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
});
