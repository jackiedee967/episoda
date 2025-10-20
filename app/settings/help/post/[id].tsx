
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { Heart, MessageCircle, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { HelpDeskPost, HelpDeskComment } from '@/types';

export default function HelpDeskPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [post, setPost] = useState<HelpDeskPost | null>(null);
  const [comments, setComments] = useState<HelpDeskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    loadPost();
    loadComments();
    loadCurrentUser();
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setCurrentUsername(profile.username);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadPost = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('help_desk_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get user's like status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: likeData } = await supabase
          .from('help_desk_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .single();

        // Get avatar
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', data.user_id)
          .single();

        setPost({
          ...data,
          isLiked: !!likeData,
          avatar: profileData?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        });
      } else {
        setPost({
          ...data,
          isLiked: false,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        });
      }
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post.');
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

      // Get avatars for all commenters
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.avatar_url]) || []);

      setComments(data.map(comment => ({
        ...comment,
        avatar: profilesMap.get(comment.user_id) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      })));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!post || !currentUserId) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (post.isLiked) {
        // Unlike
        await supabase
          .from('help_desk_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        await supabase
          .from('help_desk_posts')
          .update({ likes_count: Math.max(0, post.likes_count - 1) })
          .eq('id', post.id);

        setPost({
          ...post,
          likes_count: Math.max(0, post.likes_count - 1),
          isLiked: false,
        });
      } else {
        // Like
        await supabase
          .from('help_desk_likes')
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          });

        await supabase
          .from('help_desk_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', post.id);

        setPost({
          ...post,
          likes_count: post.likes_count + 1,
          isLiked: true,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !currentUserId || !post) return;

    try {
      setSubmittingComment(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('help_desk_comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          username: currentUsername,
          comment_text: commentText.trim(),
        });

      if (error) throw error;

      // Update comment count
      await supabase
        .from('help_desk_posts')
        .update({ comments_count: post.comments_count + 1 })
        .eq('id', post.id);

      setPost({
        ...post,
        comments_count: post.comments_count + 1,
      });

      setCommentText('');
      loadComments();

      // Scroll to bottom to show new comment
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
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
      case 'Admin Announcement':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  const isAdmin = post.username === 'jvckie';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Post',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Post Header */}
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

          {/* Category Tag */}
          <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(post.category) }]}>
              {post.category}
            </Text>
          </View>

          {/* Post Content */}
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postDetails}>{post.details}</Text>

          {/* Interaction Buttons */}
          <View style={styles.interactionRow}>
            <Pressable style={styles.interactionButton} onPress={handleLike}>
              <Heart
                size={22}
                color={post.isLiked ? colors.error : colors.textSecondary}
                fill={post.isLiked ? colors.error : 'none'}
              />
              <Text style={[styles.interactionText, post.isLiked && { color: colors.error }]}>
                {post.likes_count}
              </Text>
            </Pressable>

            <View style={styles.interactionButton}>
              <MessageCircle size={22} color={colors.textSecondary} />
              <Text style={styles.interactionText}>{post.comments_count}</Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({comments.length})
            </Text>

            {comments.length === 0 ? (
              <Text style={styles.noComments}>
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment) => {
                  const isCommentAdmin = comment.username === 'jvckie';
                  
                  return (
                    <View key={comment.id} style={styles.comment}>
                      <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <View style={styles.usernameRow}>
                            <Text style={styles.commentUsername}>{comment.username}</Text>
                            {isCommentAdmin && (
                              <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>Admin</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.commentTimestamp}>
                            {formatTimestamp(comment.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.comment_text}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, (!commentText.trim() || submittingComment) && styles.sendButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Send size={20} color={colors.background} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
    fontWeight: '700',
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
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 30,
  },
  postDetails: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  interactionRow: {
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentsSection: {
    marginTop: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  noComments: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  commentsList: {
    gap: 16,
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
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.purple,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
