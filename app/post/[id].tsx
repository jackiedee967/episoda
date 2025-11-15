import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, RefreshCw, ChevronLeft, Upload, Send, MoreVertical } from 'lucide-react-native';
import CommentCard from '@/components/CommentCard';
import PostTags from '@/components/PostTags';
import StarRatings from '@/components/StarRatings';
import { mockComments } from '@/data/mockData';
import * as ImagePicker from 'expo-image-picker';
import { Comment } from '@/types';
import { useData } from '@/contexts/DataContext';
import tokens from '@/styles/tokens';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { supabase } from '@/app/integrations/supabase/client';

function getRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else {
    return `${Math.floor(diffHours / 24)}d`;
  }
}

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentUser, getPost, deletePost, likePost, unlikePost, repostPost, unrepostPost, hasUserReposted, updateCommentCount, posts, isDeletingPost, userProfileCache } = useData();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string; textPreview: string } | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const post = getPost(id as string);
  const isReposted = post ? hasUserReposted(post.id) : false;
  const canDelete = post && currentUser && post.user.id === currentUser.id;

  // Load comments from Supabase
  useEffect(() => {
    const loadComments = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading comments:', error);
          return;
        }

        if (data) {
          const transformedComments: Comment[] = data.map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            user: userProfileCache[c.user_id] || {
              id: c.user_id,
              username: 'user',
              displayName: 'User',
              avatar: '',
              bio: '',
              socialLinks: {},
              following: [],
              followers: [],
            },
            text: c.content,
            likes: 0, // TODO: Load likes count
            isLiked: false, // TODO: Check if current user liked
            timestamp: new Date(c.created_at),
            replies: [],
          }));
          setComments(transformedComments);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();
  }, [id, userProfileCache]);

  useEffect(() => {
    if (post && comments.length !== post.comments) {
      updateCommentCount(post.id, comments.length);
    }
  }, [comments.length, post?.id, post?.comments, updateCommentCount]);

  if (!post) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleShowPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/show/${post.show.id}`);
  };

  const handleUserPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${post.user.id}`);
  };

  const handleEpisodePress = (episodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/episode/${episodeId}`);
  };

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (post.isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isReposted) {
        await unrepostPost(post.id);
      } else {
        await repostPost(post.id);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setCommentImage(result.assets[0].uri);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() && !commentImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (replyingTo) {
      // Submit as a reply - TODO: Implement reply saving to Supabase
      const newReply = {
        id: `reply_${Date.now()}`,
        commentId: replyingTo.commentId,
        user: currentUser,
        text: commentText,
        image: commentImage || undefined,
        likes: 0,
        isLiked: false,
        timestamp: new Date(),
      };

      setComments(comments.map(comment =>
        comment.id === replyingTo.commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      ));
      setReplyingTo(null);
    } else {
      // Submit as a new comment - with Supabase persistence
      const tempId = `comment_${Date.now()}`;
      const newComment: Comment = {
        id: tempId,
        postId: post.id,
        user: currentUser,
        text: commentText,
        image: commentImage || undefined,
        likes: 0,
        isLiked: false,
        timestamp: new Date(),
        replies: [],
      };

      // Optimistically update UI
      setComments([...comments, newComment]);

      // Save to Supabase
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert({
            post_id: post.id,
            user_id: currentUser.id,
            comment_text: commentText,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ FAILED TO SAVE COMMENT TO SUPABASE:', error);
          // TODO: Show error to user and remove optimistic comment
        } else if (data) {
          console.log('✅ Comment saved to Supabase:', data.id);
          // Update comment with real ID from Supabase
          setComments(prev => prev.map(c => 
            c.id === tempId ? { ...c, id: data.id } : c
          ));
          
          // Update post comment count
          updateCommentCount(post.id, comments.length + 1);
        }
      } catch (error) {
        console.error('Error saving comment:', error);
      }
    }

    setCommentText('');
    setCommentImage(null);
  };

  const handleCommentLike = (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments(comments.map(comment =>
      comment.id === commentId
        ? { ...comment, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1, isLiked: !comment.isLiked }
        : comment
    ));
  };

  const handleReplyLike = (commentId: string, replyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments(comments.map(comment =>
      comment.id === commentId
        ? {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === replyId
                ? { ...reply, likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1, isLiked: !reply.isLiked }
                : reply
            ),
          }
        : comment
    ));
  };

  const handleReplyStart = (commentId: string, username: string, textPreview: string) => {
    setReplyingTo({ commentId, username, textPreview });
  };

  const handleCancelReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(null);
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDeleteMenu(!showDeleteMenu);
  };

  const handleDeletePost = async () => {
    setShowDeleteMenu(false);
    
    // Web-compatible confirmation
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this post?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this post?',
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
    
    if (confirmed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await deletePost(post.id);
        router.back();
      } catch (error) {
        console.error('Error deleting post:', error);
        if (Platform.OS === 'web') {
          alert('Failed to delete post. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to delete post. Please try again.');
        }
      }
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header with Back Button and Menu */}
            <View style={styles.headerRow}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <ChevronLeft size={16} color={tokens.colors.almostWhite} strokeWidth={1.5} />
                <Text style={styles.backText}>Back</Text>
              </Pressable>
              
              {canDelete && (
                <Pressable 
                  onPress={handleDeletePress} 
                  style={[styles.menuButton, isDeletingPost && styles.menuButtonDisabled]}
                  disabled={isDeletingPost}
                >
                  <MoreVertical 
                    size={20} 
                    color={isDeletingPost ? tokens.colors.grey1 : tokens.colors.almostWhite} 
                    strokeWidth={1.5} 
                  />
                </Pressable>
              )}
            </View>

            {/* Post Content - No background */}
            <View style={styles.postContainer}>
              {/* User Info */}
              <View style={styles.userRow}>
                <Pressable onPress={handleUserPress}>
                  <Image source={{ uri: post.user.avatar }} style={styles.userAvatar} />
                </Pressable>
                <View style={styles.userInfoColumn}>
                  <Pressable onPress={handleUserPress}>
                    <Text style={styles.username}>{post.user.displayName}</Text>
                  </Pressable>
                  <Text style={styles.timestamp}>{getRelativeTime(post.timestamp)}</Text>
                </View>
              </View>

              {/* Star Rating */}
              {post.rating && (
                <StarRatings rating={post.rating} size={14} />
              )}

              {/* Episode and Show Tags */}
              <View style={styles.tagsRow}>
                <PostTags
                  prop="Large"
                  state="Show_Name"
                  text={post.show.title}
                  onPress={handleShowPress}
                />
                {post.episodes && post.episodes.length > 0 && (
                  <PostTags
                    prop="Large"
                    state="S_E_"
                    text={`S${post.episodes[0].seasonNumber} E${post.episodes[0].episodeNumber}`}
                    onPress={() => handleEpisodePress(post.episodes![0].id)}
                  />
                )}
              </View>

              {/* Post Title */}
              {post.title && (
                <Text style={styles.postTitle}>{post.title}</Text>
              )}

              {/* Post Body */}
              {post.body && (
                <Text style={styles.postBody}>{post.body}</Text>
              )}

              {/* Post Tags (Discussion, Fan Theory, etc.) */}
              {post.tags.length > 0 && (
                <View style={styles.postTagsContainer}>
                  {post.tags.map((tag, index) => {
                    let tagState: 'Fan_Theory' | 'Discussion' | 'Episode_Recap' | 'Spoiler' | 'Misc' = 'Misc';
                    const tagLower = tag.toLowerCase();
                    if (tagLower.includes('theory') || tagLower.includes('fan')) tagState = 'Fan_Theory';
                    else if (tagLower.includes('discussion')) tagState = 'Discussion';
                    else if (tagLower.includes('recap')) tagState = 'Episode_Recap';
                    else if (tagLower.includes('spoiler')) tagState = 'Spoiler';

                    return (
                      <PostTags
                        key={index}
                        prop="Small"
                        state={tagState}
                        text={tag}
                      />
                    );
                  })}
                </View>
              )}

              {/* Engagement Row */}
              <View style={styles.engagementRow}>
                <Pressable onPress={handleLike} style={styles.engagementButton}>
                  <Heart
                    size={16}
                    color={post.isLiked ? tokens.colors.greenHighlight : tokens.colors.grey1}
                    fill={post.isLiked ? tokens.colors.greenHighlight : 'none'}
                    strokeWidth={1.5}
                  />
                  <Text style={styles.engagementText}>{post.likes}</Text>
                </Pressable>

                <View style={styles.engagementButton}>
                  <MessageCircle size={16} color={tokens.colors.grey1} strokeWidth={1.5} />
                  <Text style={styles.engagementText}>{comments.length}</Text>
                </View>

                <Pressable onPress={handleRepost} style={styles.engagementButton}>
                  <RefreshCw
                    size={16}
                    color={isReposted ? tokens.colors.greenHighlight : tokens.colors.grey1}
                    strokeWidth={1.5}
                  />
                  <Text style={styles.engagementText}>{post.reposts}</Text>
                </Pressable>
              </View>
            </View>

            {/* Comments Title */}
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

            {/* Comments - No background */}
            <View style={styles.commentsContainer}>
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onLike={() => handleCommentLike(comment.id)}
                  onReplyStart={handleReplyStart}
                  onReplyLike={(replyId) => handleReplyLike(comment.id, replyId)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Comment Input Popup */}
          <View style={styles.commentPopup}>
            {/* Replying To Indicator */}
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <View style={styles.replyingToContent}>
                  <Text style={styles.replyingToLabel}>Replying to: </Text>
                  <Text style={styles.replyingToUsername}>{replyingTo.username}</Text>
                  <Text style={styles.replyingToPreview}> {replyingTo.textPreview}</Text>
                </View>
                <Pressable onPress={handleCancelReply} style={styles.cancelReplyButton}>
                  <Text style={styles.cancelReplyText}>✕</Text>
                </Pressable>
              </View>
            )}
            
            {commentImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: commentImage }} style={styles.previewImage} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setCommentImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment"
                  placeholderTextColor={tokens.colors.grey1}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
              </View>
              <Pressable 
                onPress={handlePickImage} 
                style={styles.uploadButton}
                accessibilityLabel="Upload image"
                accessibilityRole="button"
              >
                <Upload size={20} color={tokens.colors.black} strokeWidth={1.5} />
              </Pressable>
              <Pressable
                onPress={handleSubmitComment}
                style={styles.sendButton}
                disabled={!commentText.trim() && !commentImage}
                accessibilityLabel="Send comment"
                accessibilityRole="button"
              >
                <Send
                  size={20}
                  color={tokens.colors.black}
                  strokeWidth={1.5}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Delete Menu - Rendered outside ScrollView for proper click handling */}
        {canDelete && showDeleteMenu && !isDeletingPost && (
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.pageBackground,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 160,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
  },
  menuButton: {
    padding: 4,
  },
  menuButtonDisabled: {
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
    backgroundColor: tokens.colors.pureWhite,
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
    color: tokens.colors.error,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    fontWeight: '500',
  },
  postContainer: {
    gap: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userInfoColumn: {
    flexDirection: 'column',
  },
  username: {
    color: tokens.colors.greenHighlight,
    fontFamily: 'FunnelDisplay_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 8,
    fontWeight: '300',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  postTitle: {
    color: tokens.colors.pureWhite,
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  postBody: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
    fontWeight: '300',
  },
  commentsTitle: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.26,
    marginTop: 20,
    marginBottom: 16,
  },
  commentsContainer: {
    gap: 10,
  },
  commentPopup: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: 'rgba(255, 255, 255, 0.20)',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 8,
  },
  replyingToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyingToLabel: {
    ...tokens.typography.p3R,
    color: tokens.colors.black,
  },
  replyingToUsername: {
    ...tokens.typography.p3B,
    color: tokens.colors.tabStroke2,
  },
  replyingToPreview: {
    ...tokens.typography.p3R,
    color: tokens.colors.black,
    flex: 1,
  },
  cancelReplyButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReplyText: {
    color: tokens.colors.grey1,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    width: 80,
    height: 80,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.tabStroke5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: tokens.colors.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBox: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    backgroundColor: tokens.colors.almostWhite,
    minHeight: 48,
  },
  commentInput: {
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
    minHeight: 32,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    backgroundColor: tokens.colors.almostWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.colors.greenHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
