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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, RefreshCw, ChevronLeft, Upload, Send } from 'lucide-react-native';
import CommentCard from '@/components/CommentCard';
import PostTags from '@/components/PostTags';
import StarRatings from '@/components/StarRatings';
import { mockComments, currentUser } from '@/data/mockData';
import * as ImagePicker from 'expo-image-picker';
import { Comment } from '@/types';
import { useData } from '@/contexts/DataContext';
import tokens from '@/styles/tokens';

function getRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getPost, likePost, unlikePost, repostPost, unrepostPost, hasUserReposted, updateCommentCount, posts } = useData();
  const [comments, setComments] = useState<Comment[]>(mockComments.filter(c => c.postId === id));
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Get the latest post data reactively from context
  const post = getPost(id as string);
  const isReposted = post ? hasUserReposted(post.id) : false;

  // Force re-render when posts change to get latest engagement data
  useEffect(() => {
    if (post && comments.length !== post.comments) {
      updateCommentCount(post.id, comments.length);
    }
  }, [comments.length, post, updateCommentCount, posts]);

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

  const handleSubmitComment = () => {
    if (!commentText.trim() && !commentImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      postId: post.id,
      user: currentUser,
      text: commentText,
      image: commentImage || undefined,
      likes: 0,
      isLiked: false,
      timestamp: new Date(),
      replies: [],
    };

    setComments([...comments, newComment]);
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

  const handleReply = (commentId: string, text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newReply = {
      id: `reply_${Date.now()}`,
      commentId,
      user: currentUser,
      text,
      likes: 0,
      isLiked: false,
      timestamp: new Date(),
    };

    setComments(comments.map(comment =>
      comment.id === commentId
        ? { ...comment, replies: [...comment.replies, newReply] }
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Custom Back Header */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={24} color={tokens.colors.almostWhite} strokeWidth={1.5} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>

          {/* Post Container */}
          <View style={styles.postContainer}>
            {/* User Info & Time */}
            <View style={styles.userRow}>
              <Pressable onPress={handleUserPress}>
                <Image source={{ uri: post.user.avatar }} style={styles.userAvatar} />
              </Pressable>
              <View style={styles.userInfo}>
                <Pressable onPress={handleUserPress}>
                  <Text style={styles.username}>{post.user.displayName}</Text>
                </Pressable>
                <Text style={styles.timestamp}>{getRelativeTime(post.timestamp)}</Text>
              </View>
            </View>

            {/* Star Rating */}
            {post.rating && (
              <View style={styles.starRatingsContainer}>
                <StarRatings rating={post.rating} size={14} />
              </View>
            )}

            {/* Episode and Show Tags */}
            <View style={styles.tagsRow}>
              {post.episodes && post.episodes.length > 0 && (
                <PostTags
                  prop="Large"
                  state="S_E_"
                  text={`S${post.episodes[0].seasonNumber} E${post.episodes[0].episodeNumber}`}
                  onPress={() => handleEpisodePress(post.episodes![0].id)}
                />
              )}
              <PostTags
                prop="Large"
                state="Show_Name"
                text={post.show.title}
                onPress={handleShowPress}
              />
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

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onLike={() => handleCommentLike(comment.id)}
                onReply={(text) => handleReply(comment.id, text)}
                onReplyLike={(replyId) => handleReplyLike(comment.id, replyId)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          {commentImage && (
            <View style={styles.imagePreview}>
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
              <Upload size={20} color={tokens.colors.almostWhite} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              onPress={handleSubmitComment}
              style={[styles.sendButton, (!commentText.trim() && !commentImage) && styles.sendButtonDisabled]}
              disabled={!commentText.trim() && !commentImage}
              accessibilityLabel="Send comment"
              accessibilityRole="button"
            >
              <Send
                size={20}
                color={(!commentText.trim() && !commentImage) ? tokens.colors.grey1 : tokens.colors.almostWhite}
                strokeWidth={1.5}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.pageBackground,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    ...tokens.typography.subtitle,
    color: tokens.colors.almostWhite,
  },
  postContainer: {
    backgroundColor: tokens.colors.cardBackground,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.07)',
    shadowRadius: 10.9,
    shadowOffset: { width: 0, height: 4 },
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    ...tokens.typography.p1M,
    color: tokens.colors.almostWhite,
  },
  timestamp: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  starRatingsContainer: {
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  postTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginBottom: 10,
  },
  postBody: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    marginBottom: 12,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.30)',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  commentsSection: {
    backgroundColor: tokens.colors.cardBackground,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 100,
  },
  commentsTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.almostWhite,
    marginBottom: 16,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.cardBackground,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.cardStroke,
    padding: 16,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
    width: 80,
    height: 80,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: tokens.colors.imageStroke,
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
    gap: 12,
  },
  inputBox: {
    flex: 1,
    backgroundColor: tokens.colors.grey3,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  commentInput: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    minHeight: 20,
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.cardStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.greenHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.cardStroke,
  },
  errorText: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    textAlign: 'center',
    marginTop: 40,
  },
});
