
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '@/styles/commonStyles';
import { Heart, MessageCircle, Plus, MoreVertical } from 'lucide-react-native';
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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const appBackground = Asset.fromModule(require('../../assets/images/app-background.jpg')).uri;
import { supabase } from '@/integrations/supabase/client';
import { HelpDeskPost, HelpDeskCategory } from '@/types';
import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { isAdmin } from '@/config/admins';
import ButtonL from '@/components/ButtonL';

// Helper function to validate and normalize category
const normalizeCategory = (category: string): HelpDeskCategory => {
  const validCategories: HelpDeskCategory[] = [
    'Feature Request',
    'Support',
    'Feedback',
    'Misc',
    'Admin Announcement'
  ];
  
  if (validCategories.includes(category as HelpDeskCategory)) {
    return category as HelpDeskCategory;
  }
  
  // Default to 'Misc' for unknown categories
  console.warn(`Unknown help desk category: "${category}", defaulting to "Misc"`);
  return 'Misc';
};

export default function HelpDeskScreen() {
  const router = useRouter();
  const { currentUser } = useData();
  const { refresh } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<HelpDeskPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const userIsAdmin = isAdmin(currentUser?.id);

  useEffect(() => {
    loadPosts();
    loadUserLikes();
  }, []);

  useEffect(() => {
    if (refresh) {
      setActiveMenuPostId(null); // Close any open menus
      loadPosts();
      loadUserLikes();
    }
  }, [refresh]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('help_desk_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize categories to ensure type safety
      const normalizedPosts: HelpDeskPost[] = (data || []).map(post => ({
        ...post,
        category: normalizeCategory(post.category)
      }));

      setPosts(normalizedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('help_desk_likes')
        .select('post_id')
        .eq('user_id', currentUser.id);

      if (error) throw error;

      const likedPostIds = new Set(data?.map(like => like.post_id) || []);
      setLikedPosts(likedPostIds);
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setActiveMenuPostId(null); // Close any open menus
    await Promise.all([loadPosts(), loadUserLikes()]);
    setRefreshing(false);
  };

  const handleLike = async (postId: string, e?: any) => {
    if (e) e.stopPropagation();
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const isLiked = likedPosts.has(postId);
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('help_desk_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (deleteError) throw deleteError;

        // Update likes_count in posts table
        const { error: updateError } = await supabase
          .from('help_desk_posts')
          .update({ likes_count: post.likes_count - 1 })
          .eq('id', postId);

        if (updateError) throw updateError;

        // Update local state
        setLikedPosts(prev => {
          const updated = new Set(prev);
          updated.delete(postId);
          return updated;
        });

        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
        ));
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('help_desk_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id,
          });

        if (insertError) throw insertError;

        // Update likes_count in posts table
        const { error: updateError } = await supabase
          .from('help_desk_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', postId);

        if (updateError) throw updateError;

        // Update local state
        setLikedPosts(prev => new Set(prev).add(postId));

        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
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

  const handleMenuPress = (postId: string, e?: any) => {
    if (e) e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveMenuPostId(activeMenuPostId === postId ? null : postId);
  };

  const handleDeletePost = async (postId: string) => {
    setActiveMenuPostId(null);
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this post? This action cannot be undone.')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this post? This action cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  resolve(false);
                },
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  resolve(true);
                },
              },
            ]
          );
        });

    if (!confirmed) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const { error } = await supabase
        .from('help_desk_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Reload posts after deletion
      setActiveMenuPostId(null); // Close menu
      await loadPosts();
      await loadUserLikes();
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
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

  const renderAdminCard = (post: HelpDeskPost) => {
    const isLiked = likedPosts.has(post.id);
    const canDelete = currentUser.id === post.user_id;
    
    return (
      <Pressable
        key={post.id}
        style={styles.adminCard}
        onPress={() => handlePostPress(post.id)}
      >
        <View style={styles.adminCardHeader}>
          <Text style={styles.adminCardTitle}>{post.title}</Text>
          {canDelete && (
            <Pressable
              style={styles.deleteButton}
              onPress={(e) => handleMenuPress(post.id, e)}
            >
              <MoreVertical size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Text style={styles.adminCardPreview}>
          {truncateText(post.details, 100)}
        </Text>
        <View style={styles.adminCardFooter}>
          <Pressable 
            style={styles.adminCardStats}
            onPress={(e) => handleLike(post.id, e)}
          >
            <Heart 
              size={14} 
              color={isLiked ? colors.error : colors.textSecondary}
              fill={isLiked ? colors.error : 'none'}
            />
            <Text style={styles.adminCardStatText}>{post.likes_count}</Text>
          </Pressable>
          <View style={styles.adminCardStats}>
            <MessageCircle size={14} color={colors.textSecondary} />
            <Text style={styles.adminCardStatText}>{post.comments_count}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderCommunityPost = (post: HelpDeskPost) => {
    const isLiked = likedPosts.has(post.id);
    const canDelete = currentUser.id === post.user_id;
    
    return (
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
          {canDelete && (
            <Pressable
              style={styles.deleteButton}
              onPress={(e) => handleMenuPress(post.id, e)}
            >
              <MoreVertical size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Text style={styles.communityPostTitle}>{post.title}</Text>
        <Text style={styles.communityPostPreview}>
          {truncateText(post.details, 120)}
        </Text>

        <View style={styles.communityPostFooter}>
          <View style={[
            styles.categoryTag,
            {
              backgroundColor: getCategoryColor(post.category) + '20',
              borderWidth: 1,
              borderColor: getCategoryColor(post.category)
            }
          ]}>
            <Text style={[styles.categoryTagText, { color: getCategoryColor(post.category) }]}>
              {post.category}
            </Text>
          </View>
          <View style={styles.communityPostStats}>
            <Pressable 
              style={styles.likeButton}
              onPress={(e) => handleLike(post.id, e)}
            >
              <Heart 
                size={14} 
                color={isLiked ? colors.error : colors.textSecondary}
                fill={isLiked ? colors.error : 'none'}
              />
              <Text style={styles.communityPostStatText}>{post.likes_count}</Text>
            </Pressable>
            <MessageCircle size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
            <Text style={styles.communityPostStatText}>{post.comments_count}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
          headerShown: false,
          statusBarTranslucent: true,
          statusBarBackgroundColor: 'transparent',
          contentStyle: { backgroundColor: 'transparent' },
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
        {/* Custom Header with Back Button */}
        <View style={[styles.customHeader, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
        </View>

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

      {/* Delete Menu */}
      {activeMenuPostId && (
        <Pressable 
          style={styles.menuOverlay} 
          onPress={() => setActiveMenuPostId(null)}
        >
          <View style={styles.deleteMenu}>
            <Pressable onPress={() => handleDeletePost(activeMenuPostId)} style={styles.deleteMenuItem}>
              <Text style={styles.deleteMenuText}>Delete Post</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  headerTitle: {
    ...typography.titleL,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.p1,
    color: colors.textSecondary,
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
    ...typography.smallSubtitle,
    color: colors.text,
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
    ...typography.buttonSmall,
    color: colors.background,
  },
  adminCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  adminCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    width: 280,
    gap: 8,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminCardTitle: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
  },
  adminCardPreview: {
    ...typography.p1,
    color: colors.textSecondary,
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
    ...typography.p1,
    color: colors.textSecondary,
  },
  communityPostsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  communityPost: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  deleteButton: {
    padding: 4,
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
    ...typography.subtitle,
    color: colors.text,
  },
  adminBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    ...typography.p3Bold,
    color: colors.background,
  },
  communityPostTimestamp: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  communityPostTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  communityPostPreview: {
    ...typography.p1,
    color: colors.textSecondary,
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
    ...typography.p1Bold,
  },
  communityPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityPostStatText: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    ...typography.p1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  emptyAdminText: {
    ...typography.p1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  deleteMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
  },
  deleteMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteMenuText: {
    color: colors.error,
    fontFamily: typography.p1Bold.fontFamily,
    fontSize: 13,
    fontWeight: '500',
  },
});
