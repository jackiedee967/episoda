
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { useRouter } from 'expo-router';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

export default function PostCard({ post, onLike, onComment, onRepost, onShare }: PostCardProps) {
  const router = useRouter();

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleShowPress = () => {
    router.push(`/show/${post.show.id}`);
  };

  const handleUserPress = () => {
    router.push(`/user/${post.user.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleUserPress} style={styles.userInfo}>
          <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.displayName}>{post.user.displayName}</Text>
            <Text style={styles.username}>@{post.user.username}</Text>
          </View>
        </Pressable>
        <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
      </View>

      <View style={styles.content}>
        <Pressable onPress={handleShowPress} style={styles.showPoster}>
          <Image source={{ uri: post.show.poster }} style={styles.posterImage} />
        </Pressable>

        <View style={styles.postContent}>
          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          <Text style={styles.postBody} numberOfLines={3}>{post.body}</Text>

          {post.rating && (
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconSymbol
                  key={star}
                  name={star <= post.rating! ? 'star.fill' : 'star'}
                  size={14}
                  color={star <= post.rating! ? colors.secondary : colors.textSecondary}
                />
              ))}
            </View>
          )}

          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={onLike || (() => console.log('Like pressed'))}
        >
          <IconSymbol
            name={post.isLiked ? 'heart.fill' : 'heart'}
            size={20}
            color={post.isLiked ? '#FF0000' : colors.text}
          />
          <Text style={styles.actionText}>{post.likes}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onComment || (() => console.log('Comment pressed'))}
        >
          <IconSymbol name="bubble.left" size={20} color={colors.text} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onRepost || (() => console.log('Repost pressed'))}
        >
          <IconSymbol name="arrow.2.squarepath" size={20} color={colors.text} />
          <Text style={styles.actionText}>{post.reposts}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={onShare || (() => Alert.alert('Share', 'Deep linking coming soon!'))}
        >
          <IconSymbol name="square.and.arrow.up" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  content: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  showPoster: {
    marginRight: 12,
  },
  posterImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  postContent: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  postBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
  },
});
