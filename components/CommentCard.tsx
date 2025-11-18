
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Comment } from '@/types';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Trash2 } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

interface CommentCardProps {
  comment: Comment;
  depth?: number;
  onLike?: (commentId: string) => void;
  onReplyStart?: (commentId: string, username: string, textPreview: string, depth: number, parentId: string | null) => void;
  onRefresh?: () => void;
}

const MAX_DEPTH = 3;

const getAvatarSize = (depth: number) => {
  switch (depth) {
    case 0: return 30;
    case 1: return 24;
    case 2: return 20;
    case 3: return 16;
    default: return 16;
  }
};

const getAvatarRadius = (depth: number) => {
  switch (depth) {
    case 0: return 10;
    case 1: return 8;
    case 2: return 6;
    case 3: return 4;
    default: return 4;
  }
};

export default function CommentCard({ comment, depth = 0, onLike, onReplyStart, onRefresh }: CommentCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { deleteComment } = useData();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const avatarSize = getAvatarSize(depth);
  const avatarRadius = getAvatarRadius(depth);
  const leftIndent = depth > 0 ? depth * 8 : 0;
  const isOwner = user?.id === comment.user.id;

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

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.(comment.id);
  };

  const handleReplyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const textPreview = comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text;
    onReplyStart?.(comment.id, comment.user.displayName, textPreview, depth, comment.parentId || null);
  };

  const handleDeletePress = () => {
    if (isDeleting) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? It will be replaced with a placeholder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteComment(comment.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onRefresh?.();
            } catch (error) {
              console.error('Failed to delete comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!comment) {
    return null;
  }

  const dynamicAvatarStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarRadius,
  };

  return (
    <View style={[styles.container, leftIndent > 0 && { marginLeft: leftIndent }]}>
      <Pressable onPress={handleUserPress} style={styles.avatarContainer}>
        {comment.user.avatar ? (
          <Image source={{ uri: comment.user.avatar }} style={[styles.avatar, dynamicAvatarStyle]} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, dynamicAvatarStyle]}>
            <Text style={[styles.avatarPlaceholderText, { fontSize: avatarSize / 2 }]}>
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

        {comment.isDeleted ? (
          <Text style={styles.deletedText}>[Comment deleted]</Text>
        ) : (
          <Text style={styles.text}>{comment.text}</Text>
        )}

        {comment.image && (
          <View style={styles.commentImageContainer}>
            {Platform.OS === 'web' ? (
              <img 
                src={comment.image} 
                style={{
                  maxHeight: 100,
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: 8
                } as any}
                alt="Comment attachment"
              />
            ) : (
              <Image source={{ uri: comment.image }} style={styles.commentImage} resizeMode="contain" />
            )}
          </View>
        )}

        {!comment.isDeleted && (
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

            {isOwner && (
              <Pressable
                style={styles.actionButton}
                onPress={handleDeletePress}
                disabled={isDeleting}
              >
                <Trash2
                  size={9}
                  color={tokens.colors.grey1}
                  strokeWidth={1.5}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* Nested Replies - Recursive rendering up to MAX_DEPTH */}
        {comment.replies && comment.replies.length > 0 && depth < MAX_DEPTH && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onLike={onLike}
                onReplyStart={onReplyStart}
                onRefresh={onRefresh}
              />
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
    width: 30,
    height: 30,
    borderRadius: 10,
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
  deletedText: {
    ...tokens.typography.p3R,
    color: tokens.colors.grey1,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentImageContainer: {
    alignSelf: 'flex-start',
    maxHeight: 100,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
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
  repliesContainer: {
    marginTop: 12,
    gap: 0,
  },
});
