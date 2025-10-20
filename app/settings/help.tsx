
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { HelpDeskPost } from '@/types';

export default function HelpDeskScreen() {
  const router = useRouter();
  const [adminPosts, setAdminPosts] = useState<HelpDeskPost[]>([]);
  const [communityPosts, setCommunityPosts] = useState<HelpDeskPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);

      // Load admin announcements
      const { data: adminData, error: adminError } = await supabase
        .from('help_desk_posts')
        .select('*')
        .eq('category', 'Admin Announcement')
        .order('created_at', { ascending: false });

      if (adminError) throw adminError;

      // Load community posts
      const { data: communityData, error: communityError } = await supabase
        .from('help_desk_posts')
        .select('*')
        .neq('category', 'Admin Announcement')
        .order('created_at', { ascending: false });

      if (communityError) throw communityError;

      // Get current user to check likes
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user's likes
        const { data: likesData } = await supabase
          .from('help_desk_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

        // Get profiles for avatars
        const allPosts = [...(adminData || []), ...(communityData || [])];
        const userIds = [...new Set(allPosts.map(p => p.user_id))];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.avatar_url]) || []);

        setAdminPosts((adminData || []).map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id),
          avatar: profilesMap.get(post.user_id) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        })));

        setCommunityPosts((communityData || []).map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id),
          avatar: profilesMap.get(post.user_id) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        })));
      } else {
        setAdminPosts((adminData || []).map(post => ({
          ...post,
          isLiked: false,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        })));

        setCommunityPosts((communityData || []).map(post => ({
          ...post,
          isLiked: false,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        })));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleCreatePost = () => {
    console.log('Create Post button pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings/help/create-post');
  };

  const handlePostPress = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/settings/help/post/${postId}`);
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
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
      default:
        return colors.textSecondary;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderAdminCard = (post: HelpDeskPost) => (
    <Pressable
      key={post.id}
      style={styles.adminCard}
      onPress={() => handlePostPress(post.id)}
    >
      <Text style={styles.adminCardTitle} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={styles.adminCardPreview} numberOfLines={3}>
        {post.details}
      </Text>
      <View style={styles.adminCardFooter}>
        <View style={styles.statsRow}>
          <Heart size={14} color={colors.textSecondary} />
          <Text style={styles.statText}>{post.likes_count}</Text>
          <MessageCircle size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.statText}>{post.comments_count}</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderCommunityPost = (post: HelpDeskPost) => {
    const isAdmin = post.username === 'jvckie';

    return (
      <Pressable
        key={post.id}
        style={styles.communityPost}
        onPress={() => handlePostPress(post.id)}
      >
        <View style={styles.postHeader}>
          <Image source={{ uri: post.avatar }} style={styles.avatar} />
          <View style={styles.postHeaderText}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{post.username}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.postPreview} numberOfLines={2}>
          {post.details}
        </Text>

        <View style={styles.postFooter}>
          <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(post.category) }]}>
              {post.category}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Heart size={16} color={colors.textSecondary} />
            <Text style={styles.statText}>{post.likes_count}</Text>
            <MessageCircle size={16} color={colors.textSecondary} style={{ marginLeft: 12 }} />
            <Text style={styles.statText}>{post.comments_count}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: 'Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={handleProfilePress} style={{ marginRight: 8 }}>
              <IconSymbol name="person.circle.fill" size={28} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>THE HELP DESK</Text>
          <Text style={styles.subtitle}>
            Have a feature question, need support, or just wanna chat with the founders? This is your space. We&apos;re building this platform with you, so let us know what matters!
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : (
          <>
            {/* From the Team Section */}
            {adminPosts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>FROM THE TEAM</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.adminScrollContent}
                >
                  {adminPosts.map(renderAdminCard)}
                </ScrollView>
              </View>
            )}

            {/* Community Posts Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>COMMUNITY POSTS</Text>
                <Pressable 
                  style={styles.createButton} 
                  onPress={handleCreatePost}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Plus size={16} color={colors.background} />
                  <Text style={styles.createButtonText}>Create post</Text>
                </Pressable>
              </View>

              {communityPosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No community posts yet. Be the first to start a conversation!
                  </Text>
                </View>
              ) : (
                <View style={styles.communityPostsContainer}>
                  {communityPosts.map(renderCommunityPost)}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 32,
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
    letterSpacing: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  adminScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  adminCard: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  adminCardPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  adminCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  communityPostsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  communityPost: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  adminBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  postPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
