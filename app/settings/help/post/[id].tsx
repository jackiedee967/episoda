
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
} from 'react-native';
import { Heart, MessageCircle, Send, MoreVertical } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { HelpDeskPost, HelpDeskComment } from '@/types';
import { useData } from '@/contexts/DataContext';
import { Asset } from 'expo-asset';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MentionInput from '@/components/MentionInput';
import MentionText from '@/components/MentionText';
import { extractMentions, getUserIdsByUsernames, saveHelpDeskCommentMentions, createMentionNotifications } from '@/utils/mentionUtils';

const appBackground = Asset.fromModule(require('../../../../assets/images/app-background.jpg')).uri;

export default function HelpDeskPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentUser } = useData();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<HelpDeskPost | null>(null);
  const [comments, setComments] = useState<HelpDeskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (id) {
      setShowDeleteMenu(false); // Close menu on navigation
      loadPost();
      loadComments();
      loadUserLike();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('help_desk_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('help_desk_comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUserLike = async () => {
    try {
      const { data, error } = await supabase
        .from('help_desk_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error loading user like:', error);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('help_desk_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id);

        if (deleteError) throw deleteError;

        // Update likes_count in posts table
        const { error: updateError } = await supabase
          .from('help_desk_posts')
          .update({ likes_count: post.likes_count - 1 })
          .eq('id', post.id);

        if (updateError) throw updateError;

        setIsLiked(false);
        setPost({ ...post, likes_count: post.likes_count - 1 });
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('help_desk_likes')
          .insert({
            post_id: post.id,
            user_id: currentUser.id,
          });

        if (insertError) throw insertError;

        // Update likes_count in posts table
        const { error: updateError } = await supabase
          .from('help_desk_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', post.id);

        if (updateError) throw updateError;

        setIsLiked(true);
        setPost({ ...post, likes_count: post.likes_count + 1 });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDeleteMenu(!showDeleteMenu);
  };

  const handleDeletePost = async () => {
    setShowDeleteMenu(false);
    
    if (!post) return;
    
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
        .eq('id', post.id);

      if (error) throw error;

      // Navigate back after successful deletion
      router.back();
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Use authenticated user from session
      const userId = currentUser.id;
      const username = currentUser.username;

      const { data, error } = await supabase
        .from('help_desk_comments')
        .insert({
          post_id: post.id,
          user_id: userId,
          username,
          text: commentText.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Save mentions to database
      if (commentMentions.length > 0) {
        await saveHelpDeskCommentMentions(data.id, commentMentions);
        
        // Get user IDs for mentioned users
        const userMap = await getUserIdsByUsernames(commentMentions);
        const mentionedUserIds = Array.from(userMap.values());
        
        // Create notifications for mentioned users
        await createMentionNotifications(
          mentionedUserIds,
          userId,
          'mention_comment',
          post.id,
          data.id
        );
      }

      // Update comments count
      const newCommentsCount = post.comments_count + 1;
      await supabase
        .from('help_desk_posts')
        .update({ comments_count: newCommentsCount })
        .eq('id', post.id);

      setPost({ ...post, comments_count: newCommentsCount });
      setComments([...comments, data]);
      setCommentText('');
      setCommentMentions([]);
      commentInputRef.current?.blur();
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Post not found</Text>
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
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Custom Header with Back Button */}
          <View style={[styles.customHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.pageTitle}>Post</Text>
            {post && currentUser.id === post.user_id && (
              <Pressable style={styles.deleteButtonHeader} onPress={handleMenuPress}>
                <MoreVertical size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Post Header */}
          <View style={styles.postHeader}>
            <Image
              source={{ uri: currentUser.avatar }}
              style={styles.avatar}
            />
            <View style={styles.postHeaderText}>
              <View style={styles.userRow}>
                <Text style={styles.username}>{post.username}</Text>
                {post.username === 'jvckie' ? (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
            </View>
          </View>

          {/* Category Tag */}
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

          {/* Post Content */}
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.details}>{post.details}</Text>

          {/* Post Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={handleLike}>
              <Heart 
                size={20} 
                color={isLiked ? colors.green : colors.textSecondary}
                fill={isLiked ? colors.green : 'none'}
              />
              <Text style={styles.actionText}>{post.likes_count}</Text>
            </Pressable>
            <View style={styles.actionButton}>
              <MessageCircle size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{post.comments_count}</Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.comment}>
                  <Image
                    source={{ uri: currentUser.avatar }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUserRow}>
                        <Text style={styles.commentUsername}>{comment.username}</Text>
                        {comment.username === 'jvckie' ? (
                          <View style={styles.adminBadgeSmall}>
                            <Text style={styles.adminBadgeTextSmall}>Admin</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.commentTimestamp}>
                        {formatTimestamp(comment.created_at)}
                      </Text>
                    </View>
                    <MentionText 
                      text={comment.text} 
                      style={styles.commentText}
                      mentionColor={colors.greenHighlight}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <MentionInput
              value={commentText}
              onChangeText={(text, mentions) => {
                setCommentText(text);
                setCommentMentions(mentions);
              }}
              currentUserId={currentUser.id}
              placeholder="Write a comment..."
              placeholderTextColor={tokens.colors.grey1}
              style={styles.commentInput}
              inputBackgroundColor={tokens.colors.almostWhite}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={tokens.colors.black} />
              ) : (
                <Send size={20} color={tokens.colors.black} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Delete Menu */}
      {post && currentUser.id === post.user_id && showDeleteMenu && (
        <Pressable 
          style={styles.menuOverlay} 
          onPress={() => setShowDeleteMenu(false)}
        >
          <View style={styles.deleteMenu}>
            <Pressable onPress={handleDeletePost} style={styles.deleteMenuItem}>
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
  errorText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  pageTitle: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
  },
  deleteButtonHeader: {
    padding: 4,
  },
  postHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    flex: 1,
    gap: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    ...typography.p1Bold,
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
  timestamp: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    marginLeft: 20,
  },
  categoryTagText: {
    ...typography.p1Bold,
  },
  title: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  details: {
    ...typography.p1,
    color: colors.text,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  commentsSection: {
    marginTop: 20,
    gap: 16,
    paddingHorizontal: 20,
  },
  commentsTitle: {
    ...typography.titleS,
    color: colors.text,
  },
  comment: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    gap: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentUsername: {
    ...typography.p1Bold,
    color: colors.text,
  },
  adminBadgeSmall: {
    backgroundColor: colors.purple,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  adminBadgeTextSmall: {
    ...typography.p3Bold,
    color: colors.background,
  },
  commentTimestamp: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  commentText: {
    ...typography.p1,
    color: colors.text,
  },
  noComments: {
    ...typography.p1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentInputContainer: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: tokens.colors.pureWhite,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.grey2,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...typography.p1,
    color: tokens.colors.black,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: tokens.colors.greenHighlight,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
