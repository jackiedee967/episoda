
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { colors, spacing, components } from '@/styles/commonStyles';
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
  
  const latestPost = getPost(post.id) || post;
  const isReposted = hasUserReposted(latestPost.id);
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
    const tagColors = [
      { bg: '#2A2A2A', border: '#DD6B20', text: '#DD6B20' },
      { bg: '#2A2A2A', border: '#E53E3E', text: '#E53E3E' },
      { bg: '#2A2A2A', border: '#5CB85C', text: '#5CB85C' },
      { bg: '#2A2A2A', border: '#5B9FD8', text: '#5B9FD8' },
      { bg: '#2A2A2A', border: '#9333EA', text: '#9333EA' },
    ];
    const index = showTitle.length % tagColors.length;
    return tagColors[index];
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
    if (tagLower.includes('theory')) return { bg: '#2A2A2A', border: '#5CB85C', text: '#5CB85C' };
    if (tagLower.includes('discussion')) return { bg: '#2A2A2A', border: '#5B9FD8', text: '#5B9FD8' };
    if (tagLower.includes('spoiler')) return { bg: '#2A2A2A', border: '#E53E3E', text: '#E53E3E' };
    if (tagLower.includes('recap')) return { bg: '#2A2A2A', border: '#DD6B20', text: '#DD6B20' };
    return { bg: '#2A2A2A', border: '#999999', text: '#999999' };
  };

  const showTagColor = getShowTagColor(latestPost.show.title);

  return (
    <>
      <Pressable style={styles.card} onPress={handlePostPress}>
        {isRepost && repostedBy && (
          <View style={styles.repostHeader}>
            <Repeat size={14} color={colors.textSecondary} />
            <Text style={styles.repostText}>{repostedBy.displayName} reposted</Text>
          </View>
        )}

        <View style={styles.topSection}>
          <View style={styles.posterContainer}>
            <Pressable onPress={handleShowPress}>
              <Image source={{ uri: latestPost.show.poster }} style={styles.poster} />
            </Pressable>
            <Pressable onPress={handleSavePress} style={styles.saveButton}>
              <IconSymbol 
                name={isShowSaved ? 'bookmark.fill' : 'bookmark'} 
                size={18} 
                color={colors.accent}
              />
            </Pressable>
          </View>

          <View style={styles.watchInfo}>
            <View style={styles.userRow}>
              <Pressable onPress={handleUserPress} style={styles.userInfo}>
                <Image source={{ uri: latestPost.user.avatar }} style={styles.avatar} />
                <Text style={styles.username}>{latestPost.user.displayName}</Text>
              </Pressable>
              <Text style={styles.justWatched}>just watched</Text>
            </View>

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

            {latestPost.rating && (
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <IconSymbol
                    key={i}
                    name={i < latestPost.rating! ? 'star.fill' : 'star'}
                    size={18}
                    color={i < latestPost.rating! ? '#FFD700' : colors.textSecondary}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {(latestPost.title || latestPost.body) && <View style={styles.divider} />}

        {(latestPost.title || latestPost.body) && (
          <View style={styles.bottomSection}>
            {latestPost.title && <Text style={styles.postTitle}>{latestPost.title}</Text>}
            {latestPost.body && <Text style={styles.postBody}>{latestPost.body}</Text>}

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

        <View style={styles.actions}>
          <Pressable onPress={handleLikePress} style={styles.actionButton}>
            <Heart
              size={20}
              color={latestPost.isLiked ? colors.error : colors.textSecondary}
              fill={latestPost.isLiked ? colors.error : 'none'}
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
              color={isReposted ? colors.accent : colors.textSecondary}
              fill={isReposted ? colors.accent : 'none'}
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
    borderRadius: components.borderRadiusCard,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.cardPadding,
    marginBottom: spacing.gapLarge,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.gapMedium,
  },
  repostText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  topSection: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
    marginBottom: spacing.gapMedium,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: spacing.gapSmall,
  },
  saveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  watchInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.gapSmall,
    flexWrap: 'wrap',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    marginBottom: spacing.gapSmall,
  },
  episodeTag: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#6B5FD8',
    borderRadius: components.borderRadiusTag,
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
    borderRadius: components.borderRadiusTag,
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
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.gapMedium,
  },
  bottomSection: {
    marginBottom: spacing.gapMedium,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.gapSmall,
  },
  postBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.gapMedium,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
  },
  postTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
    borderRadius: components.borderRadiusTag,
    borderWidth: 1,
  },
  postTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: spacing.gapMedium,
    borderTopWidth: 0.5,
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
    color: colors.error,
  },
  actionTextRepost: {
    color: colors.accent,
  },
});
