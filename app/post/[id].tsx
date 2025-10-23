
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { colors, commonStyles, typography, spacing, components } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Button from '@/components/Button';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Repeat, Share2, Lightbulb, AlertTriangle, MoreHorizontal, List } from 'lucide-react-native';
import CommentCard from '@/components/CommentCard';
import { mockComments, currentUser } from '@/data/mockData';
import * as ImagePicker from 'expo-image-picker';
import { Comment, Reply } from '@/types';
import { useData } from '@/contexts/DataContext';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getPost, likePost, unlikePost, repostPost, unrepostPost, hasUserReposted, updateCommentCount } = useData();
  const [comments, setComments] = useState<Comment[]>(mockComments.filter(c => c.postId === id));
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const post = getPost(id as string);
  const isReposted = post ? hasUserReposted(post.id) : false;

  useEffect(() => {
    if (post && comments.length !== post.comments) {
      updateCommentCount(post.id, comments.length);
    }
  }, [comments.length, post, updateCommentCount]);

  if (!post) {
    return (
      <View style={commonStyles.container}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <Text style={commonStyles.text}>Post not found</Text>
      </View>
    );
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
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

  const getShowTagColor = (showTitle: string) => {
    const tagColors = [
      { bg: colors.tabBack5, border: colors.tabStroke5, text: colors.tabStroke5 },
      { bg: colors.tabBack4, border: colors.tabStroke4, text: colors.tabStroke4 },
      { bg: colors.tabBack2, border: colors.tabStroke3, text: colors.tabStroke3 },
      { bg: colors.tabBack3, border: colors.tabStroke4, text: colors.tabStroke4 },
      { bg: colors.tabBack, border: colors.tabStroke2, text: colors.tabStroke2 },
    ];
    const index = showTitle.length % tagColors.length;
    return tagColors[index];
  };

  const getTagIcon = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('theory')) return <Lightbulb size={16} color={getTagColor(tag).text} />;
    if (tagLower.includes('discussion')) return <MessageCircle size={16} color={getTagColor(tag).text} />;
    if (tagLower.includes('spoiler')) return <AlertTriangle size={16} color={getTagColor(tag).text} />;
    if (tagLower.includes('recap')) return <List size={16} color={getTagColor(tag).text} />;
    return <MoreHorizontal size={16} color={getTagColor(tag).text} />;
  };

  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('theory')) return { bg: colors.tabBack2, border: colors.tabStroke3, text: colors.tabStroke3 };
    if (tagLower.includes('discussion')) return { bg: colors.tabBack3, border: colors.tabStroke4, text: colors.tabStroke4 };
    if (tagLower.includes('spoiler')) return { bg: colors.tabBack4, border: colors.tabStroke4, text: colors.tabStroke4 };
    if (tagLower.includes('recap')) return { bg: colors.tabBack5, border: colors.tabStroke5, text: colors.tabStroke5 };
    return { bg: colors.grey3, border: colors.grey1, text: colors.grey1 };
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

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Share post');
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const newReply: Reply = {
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

  const showTagColor = getShowTagColor(post.show.title);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Post',
        }}
      />
      <KeyboardAvoidingView
        style={commonStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Content */}
          <View style={styles.postContainer}>
            {/* User Info */}
            <Pressable onPress={handleUserPress} style={styles.userHeader}>
              <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.username}>{post.user.displayName}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
              </View>
            </Pressable>

            {/* Show Poster */}
            <Pressable onPress={handleShowPress}>
              <Image source={{ uri: post.show.poster }} style={styles.showPoster} />
            </Pressable>

            {/* Episode and Show Tags */}
            <View style={styles.tagsRow}>
              {post.episodes && post.episodes.length > 0 && (
                <>
                  {post.episodes.map((episode, index) => (
                    <Pressable
                      key={episode.id}
                      onPress={() => handleEpisodePress(episode.id)}
                      style={styles.episodeTag}
                    >
                      <Text style={styles.episodeTagText}>
                        S{episode.seasonNumber}E{episode.episodeNumber}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
              <Pressable onPress={handleShowPress}>
                <View
                  style={[
                    styles.showTag,
                    {
                      backgroundColor: showTagColor.bg,
                      borderColor: showTagColor.border,
                    },
                  ]}
                >
                  <Text style={[styles.showTagText, { color: showTagColor.text }]}>
                    {post.show.title}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Rating */}
            {post.rating && (
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <IconSymbol
                    key={i}
                    name={i < post.rating! ? 'star.fill' : 'star'}
                    size={20}
                    color={i < post.rating! ? colors.greenHighlight : colors.grey1}
                  />
                ))}
              </View>
            )}

            {/* Post Title and Body */}
            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            {post.body && <Text style={styles.postBody}>{post.body}</Text>}

            {/* Post Tags */}
            {post.tags.length > 0 && (
              <View style={styles.postTagsContainer}>
                {post.tags.map((tag, index) => {
                  const tagColor = getTagColor(tag);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.postTag,
                        {
                          backgroundColor: tagColor.bg,
                          borderColor: tagColor.border,
                        },
                      ]}
                    >
                      {getTagIcon(tag)}
                      <Text style={[styles.postTagText, { color: tagColor.text }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable onPress={handleLike} style={styles.actionButton}>
                <Heart
                  size={24}
                  color={post.isLiked ? colors.error : colors.grey1}
                  fill={post.isLiked ? colors.error : 'none'}
                />
                <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                  {post.likes}
                </Text>
              </Pressable>

              <View style={styles.actionButton}>
                <MessageCircle size={24} color={colors.grey1} />
                <Text style={styles.actionText}>{comments.length}</Text>
              </View>

              <Pressable onPress={handleRepost} style={styles.actionButton}>
                <Repeat
                  size={24}
                  color={isReposted ? colors.greenHighlight : colors.grey1}
                  fill={isReposted ? colors.greenHighlight : 'none'}
                />
                <Text style={[styles.actionText, isReposted && styles.actionTextRepost]}>
                  {post.reposts}
                </Text>
              </Pressable>

              <Pressable onPress={handleShare} style={styles.actionButton}>
                <Share2 size={24} color={colors.grey1} />
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
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.grey1} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <Image source={{ uri: currentUser.avatar }} style={styles.commentAvatar} />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.grey1}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <Pressable onPress={handlePickImage} style={styles.imageButton}>
              <IconSymbol name="photo" size={24} color={colors.grey1} />
            </Pressable>
            <Pressable
              onPress={handleSubmitComment}
              style={styles.sendButton}
              disabled={!commentText.trim() && !commentImage}
            >
              <IconSymbol
                name="paperplane.fill"
                size={20}
                color={(!commentText.trim() && !commentImage) ? colors.grey1 : colors.greenHighlight}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.cardPadding,
    marginBottom: spacing.gapSmall,
    borderRadius: components.borderRadiusCard,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.gapLarge,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.gapMedium,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    ...typography.subtitle,
    color: colors.almostWhite,
  },
  timestamp: {
    ...typography.p2,
    color: colors.grey1,
    marginTop: 2,
  },
  showPoster: {
    width: '100%',
    height: 400,
    borderRadius: spacing.gapMedium,
    marginBottom: spacing.gapLarge,
    borderWidth: 1,
    borderColor: colors.imageStroke,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapLarge,
  },
  episodeTag: {
    backgroundColor: colors.tabBack,
    borderWidth: 1,
    borderColor: colors.tabStroke2,
    borderRadius: components.borderRadiusTag,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
  },
  episodeTagText: {
    ...typography.p1Bold,
    color: colors.tabStroke2,
  },
  showTag: {
    borderWidth: 1,
    borderRadius: components.borderRadiusTag,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
  },
  showTagText: {
    ...typography.p1Bold,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.gapLarge,
  },
  postTitle: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapMedium,
  },
  postBody: {
    ...typography.p1,
    color: colors.almostWhite,
    lineHeight: typography.p1.lineHeight * 1.5,
    marginBottom: spacing.gapLarge,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapLarge,
  },
  postTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
  },
  postTagText: {
    ...typography.p1Bold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sectionSpacing,
    paddingTop: spacing.gapLarge,
    borderTopWidth: 1,
    borderTopColor: colors.cardStroke,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  actionText: {
    ...typography.p1Bold,
    color: colors.grey1,
  },
  actionTextActive: {
    color: colors.error,
  },
  actionTextRepost: {
    color: colors.greenHighlight,
  },
  commentsSection: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    borderRadius: components.borderRadiusCard,
    padding: spacing.cardPadding,
    marginBottom: 100,
  },
  commentsTitle: {
    ...typography.titleL,
    color: colors.almostWhite,
    marginBottom: spacing.gapLarge,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardStroke,
    padding: spacing.gapMedium,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: spacing.gapSmall,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
    borderColor: colors.imageStroke,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.grey3,
    borderRadius: 20,
    paddingHorizontal: spacing.gapLarge,
    paddingVertical: spacing.gapSmall,
    ...typography.p1,
    color: colors.almostWhite,
    maxHeight: 100,
  },
  imageButton: {
    padding: spacing.gapSmall,
  },
  sendButton: {
    padding: spacing.gapSmall,
  },
});
