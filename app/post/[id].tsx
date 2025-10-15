
import React, { useState } from 'react';
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
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockPosts, mockComments, currentUser } from '@/data/mockData';
import { Comment, Reply } from '@/types';
import CommentCard from '@/components/CommentCard';
import * as ImagePicker from 'expo-image-picker';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const post = mockPosts.find((p) => p.id === id);

  const [comments, setComments] = useState<Comment[]>(
    mockComments.filter((c) => c.postId === id)
  );
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | undefined>();
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likes, setLikes] = useState(post?.likes || 0);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleShowPress = () => {
    if (post?.show?.id) {
      router.push(`/show/${post.show.id}`);
    }
  };

  const handleUserPress = () => {
    if (post?.user?.id) {
      router.push(`/user/${post.user.id}`);
    }
  };

  const handleEpisodePress = (episodeId: string) => {
    router.push(`/episode/${episodeId}`);
  };

  const getShowTagColor = (showTitle: string) => {
    const colors = [
      { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
      { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
      { bg: '#FCE7F3', text: '#9F1239', border: '#EC4899' },
      { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    ];
    const index = showTitle.length % colors.length;
    return colors[index];
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handleRepost = () => {
    console.log('Repost pressed');
  };

  const handleShare = () => {
    console.log('Share pressed');
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCommentImage(result.assets[0].uri);
    }
  };

  const handleSubmitComment = () => {
    if (commentText.trim() || commentImage) {
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId: post.id,
        user: currentUser,
        text: commentText,
        image: commentImage,
        likes: 0,
        isLiked: false,
        timestamp: new Date(),
        replies: [],
      };
      setComments([...comments, newComment]);
      setCommentText('');
      setCommentImage(undefined);
    }
  };

  const handleCommentLike = (commentId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            }
          : comment
      )
    );
  };

  const handleReply = (commentId: string, text: string, image?: string) => {
    const newReply: Reply = {
      id: `reply-${Date.now()}`,
      commentId,
      user: currentUser,
      text,
      image,
      likes: 0,
      isLiked: false,
      timestamp: new Date(),
    };

    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      )
    );
  };

  const handleReplyLike = (commentId: string, replyId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === replyId
                  ? {
                      ...reply,
                      isLiked: !reply.isLiked,
                      likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1,
                    }
                  : reply
              ),
            }
          : comment
      )
    );
  };

  const showColor = getShowTagColor(post.show.title);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen
        options={{
          title: 'Post',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <Pressable onPress={handleUserPress} style={styles.userInfo}>
              {post.user.avatar ? (
                <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {post.user.displayName?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.displayName}>{post.user.displayName}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.showInfo}>
            <View style={styles.showDetails}>
              <View style={styles.showTags}>
                {/* Show all episode tags */}
                {post.episodes && post.episodes.length > 0 && (
                  <View style={styles.episodeTagsContainer}>
                    {post.episodes.map((episode, index) => (
                      <Pressable 
                        key={episode.id || index}
                        style={styles.episodeTag}
                        onPress={() => handleEpisodePress(episode.id)}
                      >
                        <Text style={styles.episodeTagText}>
                          S{episode.seasonNumber}E{episode.episodeNumber}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={handleShowPress}
                  style={[
                    styles.showTag,
                    { backgroundColor: showColor.bg, borderColor: showColor.border },
                  ]}
                >
                  <Text style={[styles.showTagText, { color: showColor.text }]}>
                    {post.show.title}
                  </Text>
                </Pressable>
              </View>

              {post.rating && (
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <IconSymbol
                      key={star}
                      name={star <= post.rating! ? 'star.fill' : 'star'}
                      size={18}
                      color="#000000"
                    />
                  ))}
                </View>
              )}
            </View>
          </View>

          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          
          {/* Spoiler Alert Handling */}
          {post.isSpoiler && !spoilerRevealed ? (
            <View style={styles.spoilerContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#DC2626" />
              <Text style={styles.spoilerWarning}>This post contains spoilers</Text>
              <Pressable 
                style={styles.spoilerButton}
                onPress={() => setSpoilerRevealed(true)}
              >
                <IconSymbol name="eye" size={18} color="#FFFFFF" style={styles.spoilerButtonIcon} />
                <Text style={styles.spoilerButtonText}>Click to reveal</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.postBody}>{post.body}</Text>
          )}

          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => {
              const isTheory = tag.toLowerCase().includes('theory');
              const isDiscussion = tag.toLowerCase().includes('discussion');
              return (
                <View
                  key={index}
                  style={[
                    styles.tag,
                    isTheory && styles.tagTheory,
                    isDiscussion && styles.tagDiscussion,
                  ]}
                >
                  {isTheory && (
                    <IconSymbol name="lightbulb" size={12} color="#059669" style={styles.tagIcon} />
                  )}
                  {isDiscussion && (
                    <IconSymbol
                      name="bubble.left.and.bubble.right"
                      size={12}
                      color="#2563EB"
                      style={styles.tagIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.tagText,
                      isTheory && styles.tagTheoryText,
                      isDiscussion && styles.tagDiscussionText,
                    ]}
                  >
                    {tag}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Post Actions */}
          <View style={styles.postActions}>
            <Pressable style={styles.actionButton} onPress={handleLike}>
              <IconSymbol
                name={isLiked ? 'heart.fill' : 'heart'}
                size={24}
                color={isLiked ? '#EF4444' : '#6B7280'}
              />
              <Text style={styles.actionText}>{likes}</Text>
            </Pressable>

            <Pressable style={styles.actionButton}>
              <IconSymbol name="message" size={24} color="#6B7280" />
              <Text style={styles.actionText}>{comments.length}</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleRepost}>
              <IconSymbol name="arrow.2.squarepath" size={24} color="#6B7280" />
              <Text style={styles.actionText}>{post.reposts}</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleShare}>
              <IconSymbol name="paperplane" size={24} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>

          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onLike={() => handleCommentLike(comment.id)}
              onReply={(text, image) => handleReply(comment.id, text, image)}
              onReplyLike={(replyId) => handleReplyLike(comment.id, replyId)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        {commentImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: commentImage }} style={styles.imagePreviewImage} />
            <Pressable
              style={styles.removeImageButton}
              onPress={() => setCommentImage(undefined)}
            >
              <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
          <Image source={{ uri: currentUser.avatar }} style={styles.inputAvatar} />
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
              color={(!commentText.trim() && !commentImage) ? colors.textSecondary : colors.primary}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
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
    paddingBottom: 100,
  },
  postContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  postHeader: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'System',
  },
  showInfo: {
    marginBottom: 16,
  },
  showDetails: {
    flex: 1,
  },
  showTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  episodeTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  episodeTag: {
    backgroundColor: colors.purpleLight,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  episodeTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purple,
    fontFamily: 'System',
  },
  showTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  showTagText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
  },
  postBody: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: 'System',
  },
  spoilerContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  spoilerWarning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginTop: 12,
    marginBottom: 16,
    fontFamily: 'System',
  },
  spoilerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  spoilerButtonIcon: {
    marginRight: 2,
  },
  spoilerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tagTheory: {
    backgroundColor: '#D1FAE5',
  },
  tagDiscussion: {
    backgroundColor: '#DBEAFE',
  },
  tagIcon: {
    marginRight: 2,
  },
  tagText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    fontFamily: 'System',
  },
  tagTheoryText: {
    color: '#059669',
  },
  tagDiscussionText: {
    color: '#2563EB',
  },
  postActions: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  commentsSection: {
    backgroundColor: colors.card,
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    fontFamily: 'System',
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
    width: 100,
    height: 75,
    marginBottom: 8,
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    fontFamily: 'System',
  },
  imageButton: {
    padding: 4,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
