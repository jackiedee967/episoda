
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
import { Heart, MessageCircle, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { HelpDeskPost, HelpDeskComment } from '@/types';
import { useData } from '@/contexts/DataContext';

export default function HelpDeskPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentUser } = useData();
  const [post, setPost] = useState<HelpDeskPost | null>(null);
  const [comments, setComments] = useState<HelpDeskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (id) {
      loadPost();
      loadComments();
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

  const handleLike = async () => {
    if (!post) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newLikesCount = post.likes_count + 1;

      const { error } = await supabase
        .from('help_desk_posts')
        .update({ likes_count: newLikesCount })
        .eq('id', post.id);

      if (error) throw error;

      setPost({ ...post, likes_count: newLikesCount });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // AUTHENTICATION BYPASSED - Using mock user
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

      // Update comments count
      const newCommentsCount = post.comments_count + 1;
      await supabase
        .from('help_desk_posts')
        .update({ comments_count: newCommentsCount })
        .eq('id', post.id);

      setPost({ ...post, comments_count: newCommentsCount });
      setComments([...comments, data]);
      setCommentText('');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Post Header */}
          <View style={styles.postHeader}>
            <Image
              source={{ uri: currentUser.avatar }}
              style={styles.avatar}
            />
            <View style={styles.postHeaderText}>
              <View style={styles.userRow}>
                <Text style={styles.username}>{post.username}</Text>
                {post.username === 'jvckie' && (
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
              <Heart size={20} color={colors.textSecondary} />
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
                        {comment.username === 'jvckie' && (
                          <View style={styles.adminBadgeSmall}>
                            <Text style={styles.adminBadgeTextSmall}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentTimestamp}>
                        {formatTimestamp(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
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
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
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
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  postHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
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
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  details: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  commentsSection: {
    marginTop: 20,
    gap: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  adminBadgeSmall: {
    backgroundColor: colors.purple,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  adminBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
  },
  commentTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  noComments: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
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
    opacity: 0.5,
  },
});
