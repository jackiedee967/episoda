
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Comment, Reply } from '@/types';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Heart, MessageCircle } from 'lucide-react-native';

interface CommentCardProps {
  comment: Comment;
  onLike?: () => void;
  onReply?: (text: string, image?: string) => void;
  onReplyLike?: (replyId: string) => void;
}

export default function CommentCard({ comment, onLike, onReply, onReplyLike }: CommentCardProps) {
  const router = useRouter();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | undefined>();
  const replyInputRef = useRef<TextInput>(null);

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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReplyImage(result.assets[0].uri);
    }
  };

  const handleSubmitReply = () => {
    if (replyText.trim() || replyImage) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onReply?.(replyText, replyImage);
      setReplyText('');
      setReplyImage(undefined);
      setShowReplyInput(false);
    }
  };

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  const handleReplyPress = () => {
    setShowReplyInput(!showReplyInput);
    if (!showReplyInput) {
      setTimeout(() => replyInputRef.current?.focus(), 100);
    }
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
          <Image source={{ uri: comment.image }} style={styles.commentImage} />
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
            <Text style={styles.actionText}>Reply</Text>
          </Pressable>
        </View>

        {/* Reply Input */}
        {showReplyInput && (
          <View style={styles.replyInputContainer}>
            {replyImage && (
              <View style={styles.replyImagePreview}>
                <Image source={{ uri: replyImage }} style={styles.replyImagePreviewImage} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setReplyImage(undefined)}
                >
                  <IconSymbol name="xmark.circle.fill" size={20} color={tokens.colors.tabStroke5} />
                </Pressable>
              </View>
            )}
            <View style={styles.replyInputRow}>
              <TextInput
                ref={replyInputRef}
                style={styles.replyInput}
                placeholder="Write a reply..."
                placeholderTextColor={colors.textSecondary}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSubmitReply}
                blurOnSubmit={false}
              />
              <Pressable onPress={handlePickImage} style={styles.imageButton}>
                <IconSymbol name="photo" size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={handleSubmitReply}
                style={[
                  styles.sendButton,
                  (!replyText.trim() && !replyImage) && styles.sendButtonDisabled
                ]}
                disabled={!replyText.trim() && !replyImage}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={18}
                  color={(!replyText.trim() && !replyImage) ? colors.textSecondary : colors.primary}
                />
              </Pressable>
            </View>
          </View>
        )}

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
                    <Image source={{ uri: reply.image }} style={styles.replyImage} />
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
                    <View style={styles.replyCommentButton}>
                      <MessageCircle
                        size={9}
                        color={tokens.colors.grey1}
                        strokeWidth={1.5}
                      />
                    </View>
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
    ...tokens.typography.p1B,
    color: tokens.colors.greenHighlight,
  },
  timestamp: {
    ...tokens.typography.p4,
    color: tokens.colors.grey1,
  },
  text: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    marginBottom: 8,
  },
  commentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
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
    ...tokens.typography.p1B,
    color: tokens.colors.greenHighlight,
  },
  replyTimestamp: {
    ...tokens.typography.p4,
    color: tokens.colors.grey1,
  },
  replyText: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    marginBottom: 6,
  },
  replyImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 6,
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
