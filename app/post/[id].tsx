
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
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
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
    const colors = [
      { bg: '#FFF4E6', border: '#DD6B20', text: '#DD6B20' },
      { bg: '#FFE8E8', border: '#E53E3E', text: '#E53E3E' },
      { bg: '#E8F9E0', border: '#5CB85C', text: '#5CB85C' },
      { bg: '#E3F2FD', border: '#5B9FD8', text: '#5B9FD8' },
      { bg: '#F3E8FF', border: '#9333EA', text: '#9333EA' },
    ];
    const index = showTitle.length % colors.length;
    return colors[index];
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
    if (tagLower.includes('theory')) return { bg: '#E8F9E0', border: '#5CB85C', text: '#5CB85C' };
    if (tagLower.includes('discussion')) return { bg: '#E3F2FD', border: '#5B9FD8', text: '#5B9FD8' };
    if (tagLower.includes('spoiler')) return { bg: '#FFE8E8', border: '#E53E3E', text: '#E53E3E' };
    if (tagLower.includes('recap')) return { bg: '#FFF4E6', border: '#DD6B20', text: '#DD6B20' };
    return { bg: '#F3F4F6', border: '#6B7280', text: '#6B7280' };
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

            {/* Episode and Show Tags - ONLY THESE ARE CLICKABLE */}
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
                    color={i < post.rating! ? '#000000' : colors.textSecondary}
                  />
                ))}
              </View>
            )}

            {/* Post Title and Body */}
            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            {post.body && <Text style={styles.postBody}>{post.body}</Text>}

            {/* Post Tags - Category tags are NOT clickable, only visual labels */}
            {post.tags.length > 0 && (
              <View style={styles.postTagsContainer}>
                {post.tags.map((tag, index) => {
                  const tagColor = getTagColor(tag);
                  // Category tags are NOT clickable - just View, no Pressable
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
                  color={post.isLiked ? '#E53E3E' : colors.textSecondary}
                  fill={post.isLiked ? '#E53E3E' : 'none'}
                />
                <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                  {post.likes}
                </Text>
              </Pressable>

              <View style={styles.actionButton}>
                <MessageCircle size={24} color={colors.textSecondary} />
                <Text style={styles.actionText}>{comments.length}</Text>
              </View>

              <Pressable onPress={handleRepost} style={styles.actionButton}>
                <Repeat
                  size={24}
                  color={isReposted ? '#10B981' : colors.textSecondary}
                  fill={isReposted ? '#10B981' : 'none'}
                />
                <Text style={[styles.actionText, isReposted && styles.actionTextRepost]}>
                  {post.reposts}
                </Text>
              </Pressable>

              <Pressable onPress={handleShare} style={styles.actionButton}>
                <Share2 size={24} color={colors.textSecondary} />
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
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <Image source={{ uri: currentUser.avatar }} style={styles.commentAvatar} />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <Pressable onPress={handlePickImage} style={styles.imageButton}>
              <IconSymbol name="photo" size={24} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleSubmitComment}
              style={[
                styles.sendButton,
                (!commentText.trim() && !commentImage) && styles.sendButtonDisabled,
              ]}
              disabled={!commentText.trim() && !commentImage}
            >
              <IconSymbol
                name="paperplane.fill"
                size={20}
                color={(!commentText.trim() && !commentImage) ? colors.textSecondary : colors.secondary}
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
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 8,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  showPoster: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  episodeTag: {
    backgroundColor: '#E8E4FF',
    borderWidth: 1,
    borderColor: '#6B5FD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  episodeTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5FD8',
  },
  showTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  showTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  postBody: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  postTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  postTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#E53E3E',
  },
  actionTextRepost: {
    color: '#10B981',
  },
  commentsSection: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 100,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  imageButton: {
    padding: 8,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
