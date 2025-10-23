import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { Post } from '@/types';
import { Heart, MessageCircle, RefreshCw, Lightbulb, AlertTriangle, List, HelpCircle } from 'lucide-react-native';
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
  const { likePost, unlikePost, repostPost, unrepostPost, getPost, hasUserReposted } = useData();
  
  const latestPost = getPost(post.id) || post;
  const isReposted = hasUserReposted(latestPost.id);

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

  const getShowTagColor = (showTitle: string) => {
    const tagColors = [
      { bg: '#FFF8F3', border: '#FF5E00', text: '#FF5E00' }, // Orange - Love Island
      { bg: '#FAF5FF', border: '#FF3EFF', text: '#FF3EFF' }, // Purple
      { bg: '#CEEBFF', border: '#1700C6', text: '#1700C6' }, // Blue
      { bg: '#FFE2E2', border: '#FF5E00', text: '#FF5E00' }, // Pink/Red
      { bg: '#DEFFAD', border: '#0F6100', text: '#0F6100' }, // Green
      { bg: '#FFF8F3', border: '#C20081', text: '#C20081' }, // Magenta
    ];
    const index = Math.abs(showTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % tagColors.length;
    return tagColors[index];
  };

  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('theory') || tagLower.includes('fan')) return { bg: '#DEFFAD', border: '#0F6100', text: '#0F6100' };
    if (tagLower.includes('discussion')) return { bg: '#CEEBFF', border: '#1700C6', text: '#1700C6' };
    if (tagLower.includes('spoiler')) return { bg: '#FFE2E2', border: '#FF5E00', text: '#FF5E00' };
    if (tagLower.includes('recap')) return { bg: '#CEEBFF', border: '#1700C6', text: '#1700C6' };
    return { bg: '#FAF5FF', border: '#9334E9', text: '#9334E9' };
  };

  const getTagIcon = (tag: string) => {
    const tagLower = tag.toLowerCase();
    const tagColor = getTagColor(tag);
    if (tagLower.includes('theory') || tagLower.includes('fan')) return <Lightbulb size={12} color={tagColor.text} />;
    if (tagLower.includes('discussion')) return <MessageCircle size={12} color={tagColor.text} />;
    if (tagLower.includes('spoiler')) return <AlertTriangle size={12} color={tagColor.text} />;
    if (tagLower.includes('recap')) return <List size={12} color={tagColor.text} />;
    return <HelpCircle size={12} color={tagColor.text} />;
  };

  const showTagColor = getShowTagColor(latestPost.show.title);

  return (
    <Pressable style={styles.card} onPress={handlePostPress}>
      <View style={styles.userPostInfo}>
        <Pressable onPress={handleShowPress} style={styles.showPosterContainer}>
          <Image source={{ uri: latestPost.show.poster }} style={styles.showPoster} />
        </Pressable>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.justWatchedText}>
                {latestPost.user.displayName} just watched
              </Text>
              <View style={styles.tagsRow}>
                {latestPost.episodes && latestPost.episodes.length > 0 && (
                  <View style={styles.episodeTag}>
                    <Text style={styles.episodeTagText}>
                      S{latestPost.episodes[0].seasonNumber}E{latestPost.episodes[0].episodeNumber}
                    </Text>
                  </View>
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
                <View style={styles.starRatings}>
                  {[...Array(5)].map((_, i) => (
                    <Text key={i} style={styles.star}>
                      {i < latestPost.rating! ? '★' : '☆'}
                    </Text>
                  ))}
                </View>
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
          {latestPost.body && (
            <Text style={styles.postBody}>{latestPost.body}</Text>
          )}
          
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

          <View style={styles.engagementIconsAndCount}>
            <Pressable onPress={handleLikePress} style={styles.likes}>
              <Heart
                size={16}
                color={latestPost.isLiked ? '#8BFC76' : '#A9A9A9'}
                fill={latestPost.isLiked ? '#8BFC76' : 'none'}
                strokeWidth={1.5}
              />
              <Text style={styles.countText}>{latestPost.likes}</Text>
            </Pressable>

            <Pressable onPress={handleCommentPress} style={styles.comments}>
              <MessageCircle size={16} color="#A9A9A9" strokeWidth={1.5} />
              <Text style={styles.countText}>{latestPost.comments}</Text>
            </Pressable>

            <Pressable onPress={handleRepostPress} style={styles.reposts}>
              <RefreshCw
                size={16}
                color={isReposted ? '#8BFC76' : '#A9A9A9'}
                strokeWidth={1.5}
              />
              <Text style={styles.countText}>{latestPost.reposts}</Text>
            </Pressable>
          </View>
        </View>
      )}
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
    borderColor: '#3E3E3E',
    backgroundColor: '#282828',
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
    color: '#F4F4F4',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
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
    borderColor: '#9334E9',
    backgroundColor: '#FAF5FF',
  },
  episodeTagText: {
    color: '#FF3EFF',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
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
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
  },
  starRatings: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    color: '#8BFC76',
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
    color: '#F4F4F4',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
  },
  postBody: {
    color: '#F4F4F4',
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 10,
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '600',
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
    color: '#A9A9A9',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
  },
});
