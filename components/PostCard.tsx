
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { useRouter } from 'expo-router';
import WatchlistModal from '@/components/WatchlistModal';
import * as Haptics from 'expo-haptics';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

export default function PostCard({ post, onLike, onComment, onRepost, onShare }: PostCardProps) {
  const router = useRouter();
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [localLiked, setLocalLiked] = useState(post.isLiked);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [localReposts, setLocalReposts] = useState(post.reposts);
  const [isReposted, setIsReposted] = useState(false);
  const [likeScale] = useState(new Animated.Value(1));

  const formatTimestamp = (date: Date) => {
    try {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch (error) {
      console.log('Error formatting timestamp:', error);
      return '0m ago';
    }
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

  const handlePostPress = () => {
    if (post?.id) {
      router.push(`/post/${post.id}`);
    }
  };

  const handleEpisodePress = (episodeId: string) => {
    router.push(`/episode/${episodeId}`);
  };

  const handleSavePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWatchlistModalVisible(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    setIsInWatchlist(true);
    console.log(`Show ${showId} added to watchlist ${watchlistId}`);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate the heart
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Toggle like state
    const newLikedState = !localLiked;
    setLocalLiked(newLikedState);
    setLocalLikes(prev => newLikedState ? prev + 1 : prev - 1);
    
    if (onLike) {
      onLike();
    }
    
    console.log(`Post ${post.id} ${newLikedState ? 'liked' : 'unliked'}`);
  };

  const handleRepostPress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newRepostedState = !isReposted;
    setIsReposted(newRepostedState);
    setLocalReposts(prev => newRepostedState ? prev + 1 : prev - 1);
    
    if (onRepost) {
      onRepost();
    }
    
    console.log(`Post ${post.id} ${newRepostedState ? 'reposted' : 'unreposted'}`);
  };

  const handleCommentPress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onComment) {
      onComment();
    } else {
      handlePostPress();
    }
  };

  const handleSharePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onShare) {
      onShare();
    }
    console.log(`Sharing post ${post.id}`);
  };

  const getShowTagColor = (showTitle: string) => {
    const colors = [
      { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
      { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
      { bg: '#FCE7F3', text: '#9F1239', border: '#EC4899' },
      { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    ];
    const index = (showTitle?.length || 0) % colors.length;
    return colors[index];
  };

  const getTagIcon = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('theory')) return 'lightbulb';
    if (lowerTag.includes('discussion')) return 'bubble.left.and.bubble.right';
    if (lowerTag.includes('spoiler')) return 'eye.slash';
    if (lowerTag.includes('recap')) return 'list.bullet';
    if (lowerTag.includes('misc')) return 'ellipsis.circle';
    return 'tag';
  };

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('theory')) return { bg: '#E8F9E0', text: '#5CB85C', border: '#5CB85C' };
    if (lowerTag.includes('discussion')) return { bg: '#E3F2FD', text: '#5B9FD8', border: '#5B9FD8' };
    if (lowerTag.includes('spoiler')) return { bg: '#FFE8E8', text: '#E53E3E', border: '#E53E3E' };
    if (lowerTag.includes('recap')) return { bg: '#FFF4E6', text: '#DD6B20', border: '#DD6B20' };
    if (lowerTag.includes('misc')) return { bg: '#F3F4F6', text: '#6B7280', border: '#6B7280' };
    return { bg: '#F3F4F6', text: '#6B7280', border: '#6B7280' };
  };

  // Add safety checks for post data
  if (!post) {
    console.log('PostCard: post is undefined');
    return null;
  }

  if (!post.user) {
    console.log('PostCard: post.user is undefined for post:', post.id);
    return null;
  }

  if (!post.show) {
    console.log('PostCard: post.show is undefined for post:', post.id);
    return null;
  }

  const showColor = getShowTagColor(post.show.title || '');

  return (
    <>
      <Pressable 
        onPress={handlePostPress} 
        style={({ pressed }) => [
          styles.container,
          pressed && styles.containerPressed,
        ]}
      >
        <View style={styles.mainContent}>
          {/* Show Poster - First Column */}
          <Pressable onPress={handleShowPress} style={styles.posterContainer}>
            {post.show.poster ? (
              <View style={styles.posterWrapper}>
                <Image source={{ uri: post.show.poster }} style={styles.poster} />
                <Pressable 
                  style={({ pressed }) => [
                    styles.saveIcon,
                    pressed && styles.saveIconPressed,
                  ]} 
                  onPress={handleSavePress}
                >
                  <IconSymbol 
                    name={isInWatchlist ? "bookmark.fill" : "bookmark"} 
                    size={18} 
                    color="#FFFFFF" 
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.posterWrapper}>
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <Text style={styles.posterPlaceholderText}>
                    {post.show.title?.charAt(0) || '?'}
                  </Text>
                </View>
                <Pressable 
                  style={({ pressed }) => [
                    styles.saveIcon,
                    pressed && styles.saveIconPressed,
                  ]} 
                  onPress={handleSavePress}
                >
                  <IconSymbol 
                    name={isInWatchlist ? "bookmark.fill" : "bookmark"} 
                    size={18} 
                    color="#FFFFFF" 
                  />
                </Pressable>
              </View>
            )}
          </Pressable>

          {/* Content Column */}
          <View style={styles.contentColumn}>
            <View style={styles.header}>
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
                <Text style={styles.displayName}>{post.user.displayName || 'Unknown User'}</Text>
              </Pressable>
              <Text style={styles.justWatched}>just watched</Text>
              
              {/* Show all episode tags */}
              {post.episodes && post.episodes.length > 0 && (
                <View style={styles.episodeTags}>
                  {post.episodes.map((episode, index) => (
                    <Pressable 
                      key={episode.id || index}
                      style={({ pressed }) => [
                        styles.episodeTag,
                        pressed && styles.episodeTagPressed,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleEpisodePress(episode.id);
                      }}
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
                style={({ pressed }) => [
                  styles.showTag, 
                  { backgroundColor: showColor.bg, borderColor: showColor.border },
                  pressed && styles.showTagPressed,
                ]}
              >
                <Text style={[styles.showTagText, { color: showColor.text }]}>{post.show.title}</Text>
              </Pressable>
            </View>

            {post.rating && (
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconSymbol
                    key={star}
                    name={star <= post.rating! ? 'star.fill' : 'star'}
                    size={16}
                    color="#FCD34D"
                  />
                ))}
              </View>
            )}

            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            
            {/* Spoiler Alert Handling */}
            {post.isSpoiler && !spoilerRevealed ? (
              <View style={styles.spoilerContainer}>
                <IconSymbol name="eye.slash.fill" size={24} color="#E53E3E" />
                <Text style={styles.spoilerWarning}>This post contains spoilers</Text>
                <Pressable 
                  style={({ pressed }) => [
                    styles.spoilerButton,
                    pressed && styles.spoilerButtonPressed,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSpoilerRevealed(true);
                  }}
                >
                  <IconSymbol name="eye" size={16} color="#FFFFFF" style={styles.spoilerButtonIcon} />
                  <Text style={styles.spoilerButtonText}>Click to reveal</Text>
                </Pressable>
              </View>
            ) : (
              post.body && <Text style={styles.postBody} numberOfLines={3}>{post.body}</Text>
            )}

            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag, index) => {
                  const tagColor = getTagColor(tag);
                  const tagIcon = getTagIcon(tag);
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.tag,
                        { backgroundColor: tagColor.bg, borderColor: tagColor.border },
                      ]}
                    >
                      <IconSymbol name={tagIcon} size={12} color={tagColor.text} style={styles.tagIcon} />
                      <Text style={[styles.tagText, { color: tagColor.text }]}>
                        {tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                style={styles.actionButton}
                onPress={handleLikePress}
              >
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                  <IconSymbol
                    name={localLiked ? 'heart.fill' : 'heart'}
                    size={20}
                    color={localLiked ? '#EF4444' : '#6B7280'}
                  />
                </Animated.View>
                <Text style={[styles.actionText, localLiked && styles.actionTextActive]}>
                  {localLikes}
                </Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={handleCommentPress}
              >
                <IconSymbol name="message" size={20} color="#6B7280" />
                <Text style={styles.actionText}>{post.comments}</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={handleRepostPress}
              >
                <IconSymbol 
                  name="arrow.2.squarepath" 
                  size={20} 
                  color={isReposted ? colors.secondary : '#6B7280'} 
                />
                <Text style={[styles.actionText, isReposted && styles.actionTextActive]}>
                  {localReposts}
                </Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={handleSharePress}
              >
                <IconSymbol name="paperplane" size={20} color="#6B7280" />
              </Pressable>

              <View style={styles.spacer} />

              <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
      
      <WatchlistModal
        visible={watchlistModalVisible}
        onClose={() => setWatchlistModalVisible(false)}
        show={post.show}
        onAddToWatchlist={handleAddToWatchlist}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  containerPressed: {
    opacity: 0.95,
  },
  mainContent: {
    flexDirection: 'row',
    gap: 12,
  },
  posterContainer: {
    flexShrink: 0,
  },
  posterWrapper: {
    position: 'relative',
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  posterPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  saveIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  contentColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  avatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  justWatched: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  episodeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  episodeTag: {
    backgroundColor: '#E8E4FF',
    borderWidth: 1,
    borderColor: '#6B5FD8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  episodeTagPressed: {
    opacity: 0.7,
  },
  episodeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5FD8',
    fontFamily: 'System',
  },
  showTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  showTagPressed: {
    opacity: 0.7,
  },
  showTagText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 2,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'System',
  },
  postBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  spoilerContainer: {
    backgroundColor: '#FFE8E8',
    borderWidth: 1,
    borderColor: '#E53E3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  spoilerWarning: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginTop: 8,
    marginBottom: 12,
    fontFamily: 'System',
  },
  spoilerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  spoilerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  spoilerButtonIcon: {
    marginRight: 2,
  },
  spoilerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  tagIcon: {
    marginRight: 2,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  actionTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
});
