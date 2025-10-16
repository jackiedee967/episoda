
import { View, Text, StyleSheet, Image, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { Heart, MessageCircle, Repeat, Share2, Lightbulb, AlertTriangle, MoreHorizontal, List } from 'lucide-react-native';
import WatchlistModal from '@/components/WatchlistModal';
import { useData } from '@/contexts/DataContext';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

export default function PostCard({ post, onLike, onComment, onRepost, onShare }: PostCardProps) {
  const router = useRouter();
  const { likePost, unlikePost, repostPost, unrepostPost } = useData();
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [isReposted, setIsReposted] = useState(false);

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

  const handlePostPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/post/${post.id}`);
  };

  const handleEpisodePress = (episodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/episode/${episodeId}`);
  };

  const handleSavePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWatchlistModal(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    console.log(`Added show ${showId} to watchlist ${watchlistId}`);
  };

  const handleLikePress = async (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      if (post.isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
      
      if (onLike) {
        onLike();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepostPress = async (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (isReposted) {
        await unrepostPost(post.id);
        setIsReposted(false);
      } else {
        await repostPost(post.id);
        setIsReposted(true);
      }
      
      if (onRepost) {
        onRepost();
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleCommentPress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handlePostPress();
    if (onComment) {
      onComment();
    }
  };

  const handleSharePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShare) {
      onShare();
    }
  };

  const getShowTagColor = (showTitle: string) => {
    const colors = [
      { bg: '#E8E4FF', border: '#6B5FD8', text: '#6B5FD8' },
      { bg: '#FFE8E8', border: '#E53E3E', text: '#E53E3E' },
      { bg: '#E8F9E0', border: '#5CB85C', text: '#5CB85C' },
      { bg: '#E3F2FD', border: '#5B9FD8', text: '#5B9FD8' },
      { bg: '#FFF4E6', border: '#DD6B20', text: '#DD6B20' },
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

  return (
    <>
      <Pressable style={styles.card} onPress={handlePostPress}>
        {/* Header */}
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

        {/* Show Info */}
        <Pressable onPress={handleShowPress} style={styles.showInfo}>
          <Image source={{ uri: post.show.poster }} style={styles.poster} />
          <View style={styles.showDetails}>
            <Text style={styles.showTitle}>{post.show.title}</Text>
            {post.episodes && post.episodes.length > 0 && (
              <View style={styles.episodesContainer}>
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
              </View>
            )}
          </View>
          <Pressable onPress={handleSavePress} style={styles.saveButton}>
            <IconSymbol name="bookmark" size={20} color={colors.textSecondary} />
          </Pressable>
        </Pressable>

        {/* Post Content */}
        {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
        <Text style={styles.postBody}>{post.body}</Text>

        {/* Rating */}
        {post.rating && (
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, i) => (
              <IconSymbol
                key={i}
                name={i < post.rating! ? 'star.fill' : 'star'}
                size={16}
                color={i < post.rating! ? '#FFD700' : colors.textSecondary}
              />
            ))}
          </View>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => {
              const tagColor = getTagColor(tag);
              return (
                <View
                  key={index}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: tagColor.bg,
                      borderColor: tagColor.border,
                    },
                  ]}
                >
                  {getTagIcon(tag)}
                  <Text style={[styles.tagText, { color: tagColor.text }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable onPress={handleLikePress} style={styles.actionButton}>
            <Heart
              size={20}
              color={post.isLiked ? '#E53E3E' : colors.textSecondary}
              fill={post.isLiked ? '#E53E3E' : 'none'}
            />
            <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
              {post.likes}
            </Text>
          </Pressable>

          <Pressable onPress={handleCommentPress} style={styles.actionButton}>
            <MessageCircle size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>{post.comments}</Text>
          </Pressable>

          <Pressable onPress={handleRepostPress} style={styles.actionButton}>
            <Repeat
              size={20}
              color={isReposted ? '#10B981' : colors.textSecondary}
            />
            <Text style={[styles.actionText, isReposted && styles.actionTextRepost]}>
              {post.reposts}
            </Text>
          </Pressable>

          <Pressable onPress={handleSharePress} style={styles.actionButton}>
            <Share2 size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Pressable>

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        show={post.show}
        onAddToWatchlist={handleAddToWatchlist}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  showInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  showDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  episodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  episodeTag: {
    backgroundColor: '#E8E4FF',
    borderWidth: 1,
    borderColor: '#6B5FD8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  episodeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5FD8',
  },
  saveButton: {
    padding: 4,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  postBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#E53E3E',
  },
  actionTextRepost: {
    color: '#10B981',
  },
});
