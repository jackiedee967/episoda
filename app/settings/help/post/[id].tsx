
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

const MAX_DEPTH = 4;

export default function HelpDeskPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentUser, userProfileCache } = useData();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<HelpDeskPost | null>(null);
  const [comments, setComments] = useState<HelpDeskComment[]>([]);
  const [rawComments, setRawComments] = useState<any[]>([]);
  const [commentLikesData, setCommentLikesData] = useState<any[]>([]);
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
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
      const { data: commentsData, error } = await supabase
        .from('help_desk_comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setRawComments(commentsData || []);

      if (commentsData && commentsData.length > 0) {
        // Fetch comment likes in parallel
        const commentIds = commentsData.map((c: any) => c.id);
        const [likesResult, userLikesResult] = await Promise.all([
          supabase.from('help_desk_comment_likes').select('comment_id').in('comment_id', commentIds),
          supabase.from('help_desk_comment_likes').select('comment_id').eq('user_id', currentUser.id).in('comment_id', commentIds),
        ]);

        setCommentLikesData(likesResult.data || []);
        setUserCommentLikes(new Set((userLikesResult.data || []).map((like: any) => like.comment_id)));
      } else {
        setCommentLikesData([]);
        setUserCommentLikes(new Set());
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Build nested comment tree from raw comments
  useEffect(() => {
    if (rawComments.length === 0) {
      setComments([]);
      return;
    }

    // Count likes per comment
    const likesCount = new Map<string, number>();
    commentLikesData.forEach((like: any) => {
      likesCount.set(like.comment_id, (likesCount.get(like.comment_id) || 0) + 1);
    });

    // Group comments by parent ID
    const childrenByParent = new Map<string, any[]>();
    rawComments.forEach((c: any) => {
      const parentId = c.parent_comment_id || 'root';
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(c);
    });

    // Recursive function to build comment tree
    const buildCommentTree = (commentData: any): HelpDeskComment => {
      const children = childrenByParent.get(commentData.id) || [];
      const replies = children.map(child => buildCommentTree(child));

      return {
        id: commentData.id,
        post_id: commentData.post_id,
        user_id: commentData.user_id,
        username: commentData.username || userProfileCache?.[commentData.user_id]?.username || 'User',
        avatar: commentData.avatar || userProfileCache?.[commentData.user_id]?.avatar,
        comment_text: commentData.comment_text,
        created_at: commentData.created_at,
        parent_comment_id: commentData.parent_comment_id || null,
        likes: likesCount.get(commentData.id) || 0,
        isLiked: userCommentLikes.has(commentData.id),
        replies: replies.length > 0 ? replies : undefined,
      };
    };

    // Build top-level comments (those without parent)
    const rootComments = childrenByParent.get('root') || [];
    const nestedComments = rootComments.map(c => buildCommentTree(c));
    setComments(nestedComments);
  }, [rawComments, commentLikesData, userCommentLikes, userProfileCache]);

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

  // Helper functions for nested comment updates
  const findAndUpdateComment = (
    commentsList: HelpDeskComment[],
    targetId: string,
    updateFn: (comment: HelpDeskComment) => HelpDeskComment
  ): HelpDeskComment[] => {
    return commentsList.map((comment) => {
      if (comment.id === targetId) {
        return updateFn(comment);
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: findAndUpdateComment(comment.replies, targetId, updateFn),
        };
      }
      return comment;
    });
  };

  const handleCommentLike = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCurrentlyLiked = userCommentLikes.has(commentId);

    // Optimistic update
    setComments(prev => findAndUpdateComment(prev, commentId, (c) => ({
      ...c,
      likes: isCurrentlyLiked ? c.likes - 1 : c.likes + 1,
      isLiked: !isCurrentlyLiked,
    })));

    // Update local state
    setUserCommentLikes(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    try {
      if (isCurrentlyLiked) {
        // Unlike: delete from help_desk_comment_likes
        const { error } = await supabase
          .from('help_desk_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id);

        if (error) {
          console.error('Failed to unlike comment:', error);
          // Revert optimistic update
          setComments(prev => findAndUpdateComment(prev, commentId, (c) => ({
            ...c,
            likes: c.likes + 1,
            isLiked: true,
          })));
          setUserCommentLikes(prev => {
            const newSet = new Set(prev);
            newSet.add(commentId);
            return newSet;
          });
        }
      } else {
        // Like: insert into help_desk_comment_likes
        const { error } = await supabase
          .from('help_desk_comment_likes')
          .insert({
            comment_id: commentId,
            user_id: currentUser.id,
          });

        if (error) {
          console.error('Failed to like comment:', error);
          // Revert optimistic update
          setComments(prev => findAndUpdateComment(prev, commentId, (c) => ({
            ...c,
            likes: c.likes - 1,
            isLiked: false,
          })));
          setUserCommentLikes(prev => {
            const newSet = new Set(prev);
            newSet.delete(commentId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleReplyStart = (commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
    setCommentText(`@${username} `);
    commentInputRef.current?.focus();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const userId = currentUser.id;
      const username = currentUser.username;

      // Insert comment (with optional parent_comment_id for replies)
      const insertData: any = {
        post_id: post.id,
        user_id: userId,
        username,
        comment_text: commentText.trim(),
      };

      if (replyingTo) {
        insertData.parent_comment_id = replyingTo.commentId;
      }

      const { data, error } = await supabase
        .from('help_desk_comments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Save mentions to database
      const mentionedUsernames = extractMentions(commentText);
      if (mentionedUsernames.length > 0) {
        await saveHelpDeskCommentMentions(data.id, mentionedUsernames);

        const userMap = await getUserIdsByUsernames(mentionedUsernames);
        const mentionedUserIds = Array.from(userMap.values());

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

      // Add new comment to raw comments list (will rebuild tree in useEffect)
      const newRawComment = {
        id: data.id,
        post_id: post.id,
        user_id: userId,
        username,
        comment_text: commentText.trim(),
        parent_comment_id: replyingTo?.commentId || null,
        created_at: new Date().toISOString(),
      };
      setRawComments(prev => [...prev, newRawComment]);

      setCommentText('');
      setCommentMentions([]);
      setReplyingTo(null);
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
        return colors.greenHighlight;
      case 'Admin Announcement':
        return colors.greenHighlight;
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
          contentStyle: { 
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          },
        }}
      />
      <ImageBackground
        source={{ uri: appBackground }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.outerContainer}>
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
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  formatTimestamp={formatTimestamp}
                  onLike={handleCommentLike}
                  onReply={handleReplyStart}
                  userProfileCache={userProfileCache}
                  currentUserAvatar={currentUser.avatar}
                />
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
            )}
          </View>
        </ScrollView>

        {/* Reply indicator */}
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Replying to @{replyingTo.username}
            </Text>
            <Pressable onPress={() => {
              setReplyingTo(null);
              setCommentText('');
            }}>
              <Text style={styles.cancelReply}>Cancel</Text>
            </Pressable>
          </View>
        )}

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
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
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
        </View>

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

// Recursive comment item component
interface CommentItemProps {
  comment: HelpDeskComment;
  depth: number;
  formatTimestamp: (timestamp: string) => string;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, username: string) => void;
  userProfileCache: any;
  currentUserAvatar: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  formatTimestamp,
  onLike,
  onReply,
  userProfileCache,
  currentUserAvatar,
}) => {
  const avatarSize = depth === 0 ? 36 : 28;
  const marginLeft = depth > 0 ? 20 : 0;
  const avatar = comment.avatar || userProfileCache?.[comment.user_id]?.avatar || currentUserAvatar;

  return (
    <View style={{ marginLeft }}>
      <View style={commentItemStyles.comment}>
        <Image
          source={{ uri: avatar }}
          style={[commentItemStyles.commentAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
        <View style={commentItemStyles.commentContent}>
          <View style={commentItemStyles.commentHeader}>
            <View style={commentItemStyles.commentUserRow}>
              <Text style={commentItemStyles.commentUsername}>{comment.username}</Text>
              {comment.username === 'jvckie' || comment.username === 'jvckiee' ? (
                <View style={commentItemStyles.adminBadgeSmall}>
                  <Text style={commentItemStyles.adminBadgeTextSmall}>Admin</Text>
                </View>
              ) : null}
            </View>
            <Text style={commentItemStyles.commentTimestamp}>
              {formatTimestamp(comment.created_at)}
            </Text>
          </View>
          <MentionText 
            text={comment.comment_text} 
            style={commentItemStyles.commentText}
            mentionColor={colors.greenHighlight}
          />
          
          {/* Comment actions */}
          <View style={commentItemStyles.commentActions}>
            <Pressable 
              style={commentItemStyles.commentAction} 
              onPress={() => onLike(comment.id)}
            >
              <Heart 
                size={14} 
                color={comment.isLiked ? colors.greenHighlight : colors.textSecondary}
                fill={comment.isLiked ? colors.greenHighlight : 'none'}
              />
              {comment.likes > 0 && (
                <Text style={[
                  commentItemStyles.commentActionText,
                  comment.isLiked && { color: colors.greenHighlight }
                ]}>
                  {comment.likes}
                </Text>
              )}
            </Pressable>
            
            {depth < MAX_DEPTH && (
              <Pressable 
                style={commentItemStyles.commentAction}
                onPress={() => onReply(comment.id, comment.username)}
              >
                <MessageCircle size={14} color={colors.textSecondary} />
                <Text style={commentItemStyles.commentActionText}>Reply</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && depth < MAX_DEPTH && (
        <View style={commentItemStyles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              formatTimestamp={formatTimestamp}
              onLike={onLike}
              onReply={onReply}
              userProfileCache={userProfileCache}
              currentUserAvatar={currentUserAvatar}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const commentItemStyles = StyleSheet.create({
  comment: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    backgroundColor: colors.purple + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeTextSmall: {
    ...typography.smallSubtitle,
    color: colors.purple,
  },
  commentTimestamp: {
    ...typography.smallSubtitle,
    color: colors.textSecondary,
  },
  commentText: {
    ...typography.p1,
    color: colors.text,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    ...typography.smallSubtitle,
    color: colors.textSecondary,
  },
  repliesContainer: {
    marginTop: 8,
  },
});

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  outerContainer: {
    flex: 1,
    paddingHorizontal: 0,
    marginHorizontal: 0,
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
    paddingHorizontal: 0,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Platform.select({ web: 0, default: 16 }),
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
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
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyIndicatorText: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  cancelReply: {
    ...typography.p2Bold,
    color: colors.greenHighlight,
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
