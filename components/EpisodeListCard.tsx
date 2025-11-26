import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import * as Haptics from 'expo-haptics';
import tokens from '@/styles/tokens';
import { Star, Check } from 'lucide-react-native';
import { convertToFiveStarRating } from '@/utils/ratingConverter';
import FadeInImage from './FadeInImage';
import RewatchIcon from './RewatchIcon';

export type EpisodeSelectionState = 'none' | 'watched' | 'rewatched';

interface EpisodeListCardProps {
  episodeNumber: string;
  title: string;
  description?: string;
  rating?: number;
  postCount?: number;
  thumbnail?: string;
  isSelected?: boolean;
  isLogged?: boolean;
  selectionState?: EpisodeSelectionState;
  onPress?: () => void;
  onToggleSelect?: () => void;
  theme?: 'light' | 'dark';
}

export default function EpisodeListCard({ 
  episodeNumber,
  title, 
  description,
  rating,
  postCount,
  thumbnail,
  isSelected = false,
  isLogged = false,
  selectionState,
  onPress,
  onToggleSelect,
  theme = 'dark'
}: EpisodeListCardProps) {
  
  const handleCardPress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleTogglePress = (e: any) => {
    e.stopPropagation();
    if (onToggleSelect) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleSelect();
    }
  };

  const effectiveState: EpisodeSelectionState = selectionState ?? (isSelected || isLogged ? 'watched' : 'none');
  const isWatched = effectiveState === 'watched';
  const isRewatched = effectiveState === 'rewatched';
  const hasSelection = isWatched || isRewatched;
  
  const getCardBorderColor = () => {
    if (theme === 'light') {
      return hasSelection ? tokens.colors.tabStroke2 : tokens.colors.grey2;
    }
    if (isRewatched) return tokens.colors.tabStroke2;
    if (isWatched) return tokens.colors.greenHighlight;
    return tokens.colors.cardStroke;
  };
    
  const cardBorderColor = getCardBorderColor();
  const cardBackgroundColor = theme === 'light' ? tokens.colors.almostWhite : tokens.colors.cardBackground;
  const titleColor = theme === 'light' ? tokens.colors.black : tokens.colors.pureWhite;
  const descriptionColor = theme === 'light' ? tokens.colors.grey3 : tokens.colors.grey2;
  
  const tagBackgroundColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.tabBack2;
  const tagBorderColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.tabStroke2;
  const tagTextColor = theme === 'light' ? tokens.colors.pureWhite : tokens.colors.tabStroke2;
  
  const getToggleBorderColor = () => {
    if (theme === 'light') return tokens.colors.tabStroke2;
    if (isRewatched) return tokens.colors.tabStroke2;
    return tokens.colors.greenHighlight;
  };
  
  const getToggleBackgroundColor = () => {
    if (!hasSelection) return 'transparent';
    if (theme === 'light') return tokens.colors.tabStroke2;
    if (isRewatched) return tokens.colors.tabStroke2;
    return tokens.colors.greenHighlight;
  };
  
  const getToggleIconColor = () => {
    if (theme === 'light') return tokens.colors.pureWhite;
    return tokens.colors.black;
  };
  
  const toggleBorderColor = getToggleBorderColor();
  const toggleBackgroundColor = getToggleBackgroundColor();
  const toggleIconColor = getToggleIconColor();

  return (
    <Pressable 
      onPress={handleCardPress}
      style={[styles.episodeCard, { borderColor: cardBorderColor, backgroundColor: cardBackgroundColor }]}
    >
      {thumbnail ? (
        <FadeInImage 
          source={{ uri: thumbnail }} 
          style={styles.thumbnail}
          contentFit="cover"
        />
      ) : null}
      
      <View style={styles.episodeInfo}>
        <View style={styles.titleRow}>
          <View style={[styles.episodeTag, { backgroundColor: tagBackgroundColor, borderColor: tagBorderColor }]}>
            <Text style={[styles.episodeTagText, { color: tagTextColor }]}>{episodeNumber}</Text>
          </View>
          <Text style={[styles.episodeTitle, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        </View>
        
        {description ? (
          <Text style={[styles.episodeDescription, { color: descriptionColor }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        
        <View style={styles.ratingAndPostCount}>
          {rating !== undefined ? (
            <View style={styles.starRating}>
              <Star 
                size={10} 
                fill={tokens.colors.greenHighlight} 
                color={tokens.colors.greenHighlight}
              />
              <Text style={styles.ratingText}>{convertToFiveStarRating(rating).toFixed(1)}</Text>
            </View>
          ) : null}
          {postCount !== undefined ? (
            <Text style={styles.postCountText}>{postCount} posts</Text>
          ) : null}
        </View>
      </View>

      {onToggleSelect ? (
        <Pressable 
          onPress={handleTogglePress}
          style={[
            styles.checkmarkButton,
            { borderColor: toggleBorderColor },
            hasSelection ? { backgroundColor: toggleBackgroundColor } : null
          ]}
        >
          {isWatched ? (
            <Check 
              size={10} 
              color={toggleIconColor}
              strokeWidth={3}
            />
          ) : isRewatched ? (
            <RewatchIcon 
              size={10} 
              color={toggleIconColor}
            />
          ) : null}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  episodeCard: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 10,
    paddingLeft: 10,
    paddingBottom: 10,
    paddingRight: 10,
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  thumbnail: {
    width: 96,
    height: 59,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    width: 96,
    height: 59,
    borderRadius: 6,
    backgroundColor: tokens.colors.grey3,
  },
  episodeInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '100%',
  },
  episodeTag: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0.25,
  },
  episodeTagText: {
    ...tokens.typography.p3M,
  },
  episodeTitle: {
    ...tokens.typography.p1B,
    flex: 1,
  },
  episodeDescription: {
    ...tokens.typography.p3R,
    width: '100%',
  },
  ratingAndPostCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  starRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '400',
    color: tokens.colors.grey2,
  },
  postCountText: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '400',
    color: tokens.colors.grey2,
  },
  checkmarkButton: {
    width: 16,
    height: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
});
