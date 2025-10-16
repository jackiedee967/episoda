
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { useRouter } from 'expo-router';
import WatchlistModal from '@/components/WatchlistModal';

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

  const formatTimestamp = (date: Date) => {
    try {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      return `${days}d`;
    } catch (error) {
      console.log('Error formatting timestamp:', error);
      return '0m';
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
    setWatchlistModalVisible(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    setIsInWatchlist(true);
    console.log(`Show ${showId} added to watchlist ${watchlistId}`);
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
      <Pressable onPress={handlePostPress} style={styles.container}>
        <View style={styles.mainContent}>
          {/* Show Poster - First Column */}
          <Pressable onPress={handleShowPress} style={styles.posterContainer}>
            {post.show.poster ? (
              <View style={styles.posterWrapper}>
                <Image source={{ uri: post.show.poster }} style={styles.poster} />
                <Pressable style={styles.saveIcon} onPress={handleSavePress}>
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
                <Pressable style={styles.saveIcon} onPress={handleSavePress}>
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
                      style={styles.episodeTag}
                      onPress={(e) => {
                        e.stopPropagation();
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
              
              <Pressable onPress={handleShowPress} style={[styles.showTag, { backgroundColor: showColor.bg, borderColor: showColor.border }]}>
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
                    color="#000000"
                  />
                ))}
              </View>
            )}

            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            
            {/* Spoiler Alert Handling */}
            {post.isSpoiler && !spoilerRevealed ? (
              <View style={styles.spoilerContainer}>
                <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#DC2626" />
                <Text style={styles.spoilerWarning}>This post contains spoilers</Text>
                <Pressable 
                  style={styles.spoilerButton}
                  onPress={(e) => {
                    e.stopPropagation();
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
                      {isTheory && <IconSymbol name="lightbulb" size={12} color="#059669" style={styles.tagIcon} />}
                      {isDiscussion && <IconSymbol name="bubble.left.and.bubble.right" size={12} color="#2563EB" style={styles.tagIcon} />}
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
            )}

            <View style={styles.actions}>
              <Pressable
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onLike ? onLike() : console.log('Like pressed');
                }}
              >
                <IconSymbol
                  name={post.isLiked ? 'heart.fill' : 'heart'}
                  size={20}
                  color={post.isLiked ? '#EF4444' : '#6B7280'}
                />
                <Text style={styles.actionText}>{post.likes || 0}</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onComment ? onComment() : handlePostPress();
                }}
              >
                <IconSymbol name="message" size={20} color="#6B7280" />
                <Text style={styles.actionText}>{post.comments || 0}</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onRepost ? onRepost() : console.log('Repost pressed');
                }}
              >
                <IconSymbol name="arrow.2.squarepath" size={20} color="#6B7280" />
                <Text style={styles.actionText}>{post.reposts || 0}</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onShare ? onShare() : console.log('Share pressed');
                }}
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
    backgroundColor: colors.purpleLight,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  episodeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.purple,
    fontFamily: 'System',
  },
  showTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
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
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
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
    fontSize: 12,
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
  spacer: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
});
