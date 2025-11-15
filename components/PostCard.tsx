import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Post } from '@/types';
import { Heart, MessageCircle, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import StarRatings from '@/components/StarRatings';
import PostTags from '@/components/PostTags';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';

// Utility function to format relative time
function getRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 30) {
    return `${diffDays}d ago`;
  } else {
    return `${diffMonths}mo ago`;
  }
}

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
  const { likePost, unlikePost, repostPost, unrepostPost, getPost, hasUserReposted, posts, currentUser } = useData();
  
  const latestPost = getPost(post.id) || post;
  const isReposted = hasUserReposted(latestPost.id);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

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
      if (isReposted) {
        await unrepostPost(latestPost.id);
      } else {
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

  const hasUserLoggedEpisodes = () => {
    if (!latestPost.episodes || latestPost.episodes.length === 0) return true;
    
    // Check if current user has logged ALL episodes in this post
    const episodeIds = latestPost.episodes.map(ep => ep.id);
    const userPosts = posts.filter(p => p.user.id === currentUser.id);
    
    // Get all episode IDs the user has logged
    const loggedEpisodeIds = new Set<string>();
    userPosts.forEach(userPost => {
      userPost.episodes?.forEach(ep => loggedEpisodeIds.add(ep.id));
    });
    
    // User must have logged ALL episodes in the post
    return episodeIds.every(episodeId => loggedEpisodeIds.has(episodeId));
  };

  const shouldShowSpoilerAlert = latestPost.isSpoiler && !hasUserLoggedEpisodes() && !spoilerRevealed;

  const handleSpoilerReveal = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSpoilerRevealed(true);
  };

  const getTagState = (tag: string): 'Fan_Theory' | 'Discussion' | 'Episode_Recap' | 'Spoiler' | 'Misc' => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('theory') || tagLower.includes('fan')) return 'Fan_Theory';
    if (tagLower.includes('discussion')) return 'Discussion';
    if (tagLower.includes('recap')) return 'Episode_Recap';
    if (tagLower.includes('spoiler')) return 'Spoiler';
    return 'Misc';
  };

  return (
    <Pressable style={styles.card} onPress={handlePostPress}>
      <View style={styles.userPostInfo}>
        <Pressable onPress={handleShowPress} style={styles.showPosterContainer}>
          <Image source={{ uri: getPosterUrl(latestPost.show.poster, latestPost.show.title) }} style={styles.showPoster} />
        </Pressable>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.justWatchedText}>
                <Text style={styles.usernameText} onPress={handleUserPress}>{latestPost.user.displayName}</Text> just watched
              </Text>
              <View style={styles.tagsRow}>
                <PostTags
                  prop="Large"
                  state="Show_Name"
                  text={latestPost.show.title}
                  onPress={handleShowPress}
                />
                {latestPost.episodes && latestPost.episodes.length > 0 && latestPost.episodes.map((episode, index) => (
                  <PostTags
                    key={episode.id || index}
                    prop="Large"
                    state="S_E_"
                    text={`S${episode.seasonNumber} E${episode.episodeNumber}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/episode/${episode.id}`);
                    }}
                  />
                ))}
              </View>
              {latestPost.rating && (
                <StarRatings rating={latestPost.rating} size={14} />
              )}
            </View>
            <Pressable onPress={handleUserPress}>
              <Image source={{ uri: latestPost.user.avatar }} style={styles.userProfilePic} />
            </Pressable>
          </View>
        </View>
      </View>

      {(latestPost.title || latestPost.body) && <View style={styles.divider} />}

      {(latestPost.title || latestPost.body) && (
        <View style={styles.postInfo}>
          {latestPost.title && (
            <Text style={styles.postTitle}>{latestPost.title}</Text>
          )}
          {shouldShowSpoilerAlert ? (
            <Pressable style={styles.spoilerAlertButton} onPress={handleSpoilerReveal}>
              <AlertTriangle size={14} color={tokens.colors.tabStroke} />
              <Text style={styles.spoilerAlertTitle}>Spoiler Alert</Text>
              <Text style={styles.spoilerAlertSubtext}>Click to view</Text>
            </Pressable>
          ) : (
            latestPost.body && (
              <Text style={styles.postBody}>{latestPost.body}</Text>
            )
          )}
        </View>
      )}

      {latestPost.tags.length > 0 && (
        <View style={styles.postTagsContainer}>
          {latestPost.tags.map((tag, index) => (
            <PostTags
              key={index}
              prop="Small"
              state={getTagState(tag)}
              text={tag}
            />
          ))}
        </View>
      )}

      <View style={[styles.engagementRow, latestPost.tags.length === 0 && styles.engagementRowNoTags]}>
        <View style={styles.engagementIconsAndCount}>
          <Pressable onPress={handleLikePress} style={styles.likes}>
            <Heart
              size={16}
              color={latestPost.isLiked ? tokens.colors.greenHighlight : tokens.colors.grey1}
              fill={latestPost.isLiked ? tokens.colors.greenHighlight : 'none'}
              strokeWidth={1.5}
            />
            <Text style={styles.countText}>{latestPost.likes}</Text>
          </Pressable>

          <Pressable onPress={handleCommentPress} style={styles.comments}>
            <MessageCircle size={16} color={tokens.colors.grey1} strokeWidth={1.5} />
            <Text style={styles.countText}>{latestPost.comments}</Text>
          </Pressable>

          <Pressable onPress={handleRepostPress} style={styles.reposts}>
            <RefreshCw
              size={16}
              color={isReposted ? tokens.colors.greenHighlight : tokens.colors.grey1}
              strokeWidth={1.5}
            />
            <Text style={styles.countText}>{latestPost.reposts}</Text>
          </Pressable>
        </View>
        <Text style={styles.timestampText}>{getRelativeTime(latestPost.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingTop: 16,
    paddingLeft: 16,
    paddingBottom: 16,
    paddingRight: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    shadowColor: 'rgba(0, 0, 0, 0.07)',
    shadowRadius: 10.9,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 5,
  },
  userPostInfo: {
    flexDirection: 'row',
    gap: 13,
  },
  showPosterContainer: {
    width: 56,
    height: 75,
  },
  showPoster: {
    width: 56,
    height: 75,
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 7,
  },
  justWatchedText: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
  },
  usernameText: {
    color: tokens.colors.greenHighlight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  episodeTag: {
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderColor: tokens.colors.tabStroke2,
    backgroundColor: tokens.colors.tabBack2,
  },
  episodeTagText: {
    color: tokens.colors.tabStroke2,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    lineHeight: 15.6,
  },
  showTag: {
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
  },
  showTagText: {
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    lineHeight: 15.6,
  },
  starRatings: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    color: tokens.colors.greenHighlight,
    fontSize: 14,
  },
  userProfilePic: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    marginTop: 15,
    marginBottom: 15,
  },
  postInfo: {
    gap: 10,
  },
  postTitle: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_600SemiBold',
    fontSize: 13,
  },
  postBody: {
    color: tokens.colors.almostWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  postTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 5,
    paddingLeft: 9,
    paddingBottom: 5,
    paddingRight: 9,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
  },
  postTagText: {
    fontFamily: 'FunnelDisplay_600SemiBold',
    fontSize: 10,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engagementRowNoTags: {
    paddingTop: 16,
  },
  engagementIconsAndCount: {
    flexDirection: 'row',
    gap: 10,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reposts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
  },
  timestampText: {
    color: tokens.colors.grey1,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
  },
  spoilerAlertButton: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 10,
    backgroundColor: tokens.colors.tabBack5,
    borderWidth: 0.25,
    borderColor: tokens.colors.tabStroke,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  spoilerAlertTitle: {
    color: tokens.colors.tabStroke,
    fontFamily: 'FunnelDisplay_600SemiBold',
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 13,
  },
  spoilerAlertSubtext: {
    color: tokens.colors.tabStroke,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 12,
  },
});
