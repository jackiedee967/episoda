
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Comment } from '@/types';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';

interface CommentCardProps {
  comment: Comment;
  onLike?: () => void;
  onReplyStart?: (commentId: string, username: string, textPreview: string) => void;
  onReplyLike?: (replyId: string) => void;
}

export default function CommentCard({ comment, onLike, onReplyStart, onReplyLike }: CommentCardProps) {
  const router = useRouter();

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

  const handleUserPress = () => {
    if (comment?.user?.id) {
      router.push(`/user/${comment.user.id}`);
    }
  };

  const handleReplyUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  const handleReplyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const textPreview = comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text;
    onReplyStart?.(comment.id, comment.user.displayName, textPreview);
  };

  const handleReplyLikePress = (replyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReplyLike?.(replyId);
  };

  if (!comment) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={handleUserPress} style={styles.avatarContainer}>
        {comment.user.avatar ? (
          <Image source={{ uri: comment.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {comment.user.displayName?.charAt(0) || '?'}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={handleUserPress}>
            <Text style={styles.displayName}>{comment.user.displayName}</Text>
          </Pressable>
          <Text style={styles.timestamp}>{formatTimestamp(comment.timestamp)}</Text>
        </View>

        <Text style={styles.text}>{comment.text}</Text>

        {comment.image && (
          <View style={styles.commentImageContainer}>
            <Image source={{ uri: comment.image }} style={styles.commentImage} resizeMode="contain" />
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={handleLikePress}
          >
            <Heart
              size={9}
              color={comment.isLiked ? tokens.colors.greenHighlight : tokens.colors.grey1}
              fill={comment.isLiked ? tokens.colors.greenHighlight : 'none'}
              strokeWidth={1.5}
            />
            <Text style={styles.actionText}>{comment.likes}</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleReplyPress}
          >
            <MessageCircle
              size={9}
              color={tokens.colors.grey1}
              strokeWidth={1.5}
            />
          </Pressable>
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <View key={reply.id} style={styles.replyContainer}>
                <Pressable onPress={() => handleReplyUserPress(reply.user.id)} style={styles.replyAvatarContainer}>
                  {reply.user.avatar ? (
                    <Image source={{ uri: reply.user.avatar }} style={styles.replyAvatar} />
                  ) : (
                    <View style={[styles.replyAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.replyAvatarPlaceholderText}>
                        {reply.user.displayName?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <View style={styles.replyContent}>
                  <View style={styles.replyHeader}>
                    <Pressable onPress={() => handleReplyUserPress(reply.user.id)}>
                      <Text style={styles.replyDisplayName}>{reply.user.displayName}</Text>
                    </Pressable>
                    <Text style={styles.replyTimestamp}>{formatTimestamp(reply.timestamp)}</Text>
                  </View>

                  <Text style={styles.replyText}>{reply.text}</Text>

                  {reply.image && (
                    <View style={styles.replyImageContainer}>
                      <Image source={{ uri: reply.image }} style={styles.replyImage} resizeMode="contain" />
                    </View>
                  )}

                  <View style={styles.replyActions}>
                    <Pressable
                      style={styles.replyLikeButton}
                      onPress={() => handleReplyLikePress(reply.id)}
                    >
                      <Heart
                        size={9}
                        color={reply.isLiked ? tokens.colors.greenHighlight : tokens.colors.grey1}
                        fill={reply.isLiked ? tokens.colors.greenHighlight : 'none'}
                        strokeWidth={1.5}
                      />
                      <Text style={styles.replyLikeText}>{reply.likes}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.replyCommentButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const textPreview = reply.text.length > 50 ? reply.text.substring(0, 50) + '...' : reply.text;
                        onReplyStart?.(comment.id, reply.user.displayName, textPreview);
                      }}
                    >
                      <MessageCircle
                        size={9}
                        color={tokens.colors.grey1}
                        strokeWidth={1.5}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: tokens.colors.pureWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  displayName: {
    ...tokens.typography.p3B,
    color: tokens.colors.pureWhite,
  },
  timestamp: {
    ...tokens.typography.p4,
    color: tokens.colors.grey1,
  },
  text: {
    ...tokens.typography.p3R,
    color: tokens.colors.pureWhite,
    marginBottom: 8,
  },
  commentImageContainer: {
    alignSelf: 'flex-start',
    width: 200,
    maxWidth: 200,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  commentImage: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 8,
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontWeight: '300',
  },
  replyInputContainer: {
    marginTop: 12,
    gap: 8,
  },
  replyImagePreview: {
    position: 'relative',
    width: 100,
    height: 75,
  },
  replyImagePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: tokens.colors.pureWhite,
    borderRadius: 10,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 80,
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
  repliesContainer: {
    marginTop: 12,
    gap: 12,
  },
  replyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  replyAvatarContainer: {
    flexShrink: 0,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  replyAvatarPlaceholderText: {
    color: tokens.colors.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  replyDisplayName: {
    ...tokens.typography.p3B,
    color: tokens.colors.pureWhite,
  },
  replyTimestamp: {
    ...tokens.typography.p4,
    color: tokens.colors.grey1,
  },
  replyText: {
    ...tokens.typography.p3R,
    color: tokens.colors.pureWhite,
    marginBottom: 6,
  },
  replyImageContainer: {
    alignSelf: 'flex-start',
    width: 200,
    maxWidth: 200,
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
    flexShrink: 0,
  },
  replyImage: {
    width: '100%',
    height: '100%',
  },
  replyActions: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 4,
  },
  replyLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyLikeText: {
    fontSize: 8,
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontWeight: '300',
  },
});
