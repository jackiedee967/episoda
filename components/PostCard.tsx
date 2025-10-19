
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { Heart, MessageCircle, Repeat, Share2, Lightbulb, AlertTriangle, MoreHorizontal, List } from 'lucide-react-native';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
  isRepost?: boolean;
  repostedBy?: { id: string; displayName: string };
}

export default function PostCard({ post, onLike, onComment, onRepost, onShare, isRepost, repostedBy }: PostCardProps) {
  const router = useRouter();
  const { likePost, unlikePost, repostPost, unrepostPost, getPost, playlists, isShowInPlaylist, hasUserReposted } = useData();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  // Get the latest post data from context to ensure we have current like/comment counts
  const latestPost = getPost(post.id) || post;
  
  // Check if user has reposted this post
  const isReposted = hasUserReposted(latestPost.id);

  // Check if show is in any playlist
  const isShowSaved = playlists.some(pl => isShowInPlaylist(pl.id, latestPost.show.id));

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
    router.push(`/show/${latestPost.show.id}`);
  };

  const handleUserPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${latestPost.user.id}`);
  };

  const handlePostPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/post/${latestPost.id}`);
  };

  const handleEpisodePress = (episodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/episode/${episodeId}`);
  };

  const handleSavePress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPlaylistModal(true);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    console.log(`Added show ${showId} to playlist ${playlistId}`);
  };

  const handleLikePress = async (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      if (latestPost.isLiked) {
        await unlikePost(latestPost.id);
      } else {
        await likePost(latestPost.id);
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
      console.log('Repost button clicked, current state:', isReposted);
      
      if (isReposted) {
        console.log('Unreposting...');
        await unrepostPost(latestPost.id);
      } else {
        console.log('Reposting...');
        await repostPost(latestPost.id);
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

  const showTagColor = getShowTagColor(latestPost.show.title);

  return (
    <>
      <Pressable style={styles.card} onPress={handlePostPress}>
        {/* Repost Header */}
        {isRepost && repostedBy && (
          <View style={styles.repostHeader}>
            <Repeat size={14} color={colors.textSecondary} />
            <Text style={styles.repostText}>{repostedBy.displayName} reposted</Text>
          </View>
        )}

        {/* Top Section */}
        <View style={styles.topSection}>
          {/* Show Poster with Save Icon */}
          <View style={styles.posterContainer}>
            <Pressable onPress={handleShowPress}>
              <Image source={{ uri: latestPost.show.poster }} style={styles.poster} />
            </Pressable>
            <Pressable onPress={handleSavePress} style={styles.saveButton}>
              <IconSymbol 
                name={isShowSaved ? 'bookmark.fill' : 'bookmark'} 
                size={18} 
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* User Info and Watch Details */}
          <View style={styles.watchInfo}>
            <View style={styles.userRow}>
              <Pressable onPress={handleUserPress} style={styles.userInfo}>
                <Image source={{ uri: latestPost.user.avatar }} style={styles.avatar} />
                <Text style={styles.username}>{latestPost.user.displayName}</Text>
              </Pressable>
              <Text style={styles.justWatched}>just watched</Text>
            </View>

            {/* Episode and Show Tags */}
            <View style={styles.tagsRow}>
              {latestPost.episodes && latestPost.episodes.length > 0 && (
                <>
                  {latestPost.episodes.map((episode, index) => (
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
                    {latestPost.show.title}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Rating */}
            {latestPost.rating && (
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <IconSymbol
                    key={i}
                    name={i < latestPost.rating! ? 'star.fill' : 'star'}
                    size={18}
                    color={i < latestPost.rating! ? '#000000' : colors.textSecondary}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Divider - only show if there's post content */}
        {(latestPost.title || latestPost.body) && <View style={styles.divider} />}

        {/* Bottom Section - Optional Post Content */}
        {(latestPost.title || latestPost.body) && (
          <View style={styles.bottomSection}>
            {latestPost.title && <Text style={styles.postTitle}>{latestPost.title}</Text>}
            {latestPost.body && <Text style={styles.postBody}>{latestPost.body}</Text>}

            {/* Post Tags */}
            {latestPost.tags.length > 0 && (
              <View style={styles.postTagsContainer}>
                {latestPost.tags.map((tag, index) => {
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
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable onPress={handleLikePress} style={styles.actionButton}>
            <Heart
              size={20}
              color={latestPost.isLiked ? '#E53E3E' : colors.textSecondary}
              fill={latestPost.isLiked ? '#E53E3E' : 'none'}
            />
            <Text style={[styles.actionText, latestPost.isLiked && styles.actionTextActive]}>
              {latestPost.likes}
            </Text>
          </Pressable>

          <Pressable onPress={handleCommentPress} style={styles.actionButton}>
            <MessageCircle size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>{latestPost.comments}</Text>
          </Pressable>

          <Pressable onPress={handleRepostPress} style={styles.actionButton}>
            <Repeat
              size={20}
              color={isReposted ? '#10B981' : colors.textSecondary}
              fill={isReposted ? '#10B981' : 'none'}
            />
            <Text style={[styles.actionText, isReposted && styles.actionTextRepost]}>
              {latestPost.reposts}
            </Text>
          </Pressable>

          <Pressable onPress={handleSharePress} style={styles.actionButton}>
            <Share2 size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Pressable>

      <PlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        show={latestPost.show}
        onAddToPlaylist={handleAddToPlaylist}
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
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  repostText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  topSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  saveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
  },
  watchInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  justWatched: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  episodeTag: {
    backgroundColor: '#E8E4FF',
    borderWidth: 1,
    borderColor: '#6B5FD8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  episodeTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B5FD8',
  },
  showTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  showTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  bottomSection: {
    marginBottom: 12,
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
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
