import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import tokens from '@/styles/tokens';
import { Star, Check } from 'lucide-react-native';
import { convertToFiveStarRating } from '@/utils/ratingConverter';

interface EpisodeListCardProps {
  episodeNumber: string;
  title: string;
  description?: string;
  rating?: number;
  postCount?: number;
  thumbnail?: string;
  isSelected?: boolean;
  isLogged?: boolean;
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

  const showCheckmark = isSelected || isLogged;
  
  // Light theme: purple highlighting. Dark theme: original green/stroke colors
  const cardBorderColor = theme === 'light'
    ? (showCheckmark ? tokens.colors.tabStroke2 : tokens.colors.grey2)
    : (showCheckmark ? tokens.colors.greenHighlight : tokens.colors.cardStroke);
    
  const cardBackgroundColor = theme === 'light' ? tokens.colors.almostWhite : tokens.colors.cardBackground;
  const titleColor = theme === 'light' ? tokens.colors.black : tokens.colors.pureWhite;
  const descriptionColor = theme === 'light' ? tokens.colors.grey3 : tokens.colors.grey2;
  
  const tagBackgroundColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.tabBack2;
  const tagBorderColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.tabStroke2;
  const tagTextColor = theme === 'light' ? tokens.colors.pureWhite : tokens.colors.tabStroke2;
  
  const checkmarkBorderColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.greenHighlight;
  const checkmarkBackgroundColor = theme === 'light' ? tokens.colors.tabStroke2 : tokens.colors.greenHighlight;
  const checkmarkColor = theme === 'light' ? tokens.colors.pureWhite : tokens.colors.black;

  return (
    <Pressable 
      onPress={handleCardPress}
      style={[styles.episodeCard, { borderColor: cardBorderColor, backgroundColor: cardBackgroundColor }]}
    >
      {thumbnail && (
        <Image 
          source={{ uri: thumbnail }} 
          style={styles.thumbnail}
          contentFit="cover"
        />
      )}
      
      <View style={styles.episodeInfo}>
        <View style={styles.titleRow}>
          <View style={[styles.episodeTag, { backgroundColor: tagBackgroundColor, borderColor: tagBorderColor }]}>
            <Text style={[styles.episodeTagText, { color: tagTextColor }]}>{episodeNumber}</Text>
          </View>
          <Text style={[styles.episodeTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        </View>
        
        {description && (
          <Text style={[styles.episodeDescription, { color: descriptionColor }]} numberOfLines={2}>
            {description}
          </Text>
        )}
        
        <View style={styles.ratingAndPostCount}>
          {rating !== undefined && (
            <View style={styles.starRating}>
              <Star 
                size={10} 
                fill={tokens.colors.greenHighlight} 
                color={tokens.colors.greenHighlight}
              />
              <Text style={styles.ratingText}>{convertToFiveStarRating(rating).toFixed(1)}</Text>
            </View>
          )}
          {postCount !== undefined && (
            <Text style={styles.postCountText}>{postCount} posts</Text>
          )}
        </View>
      </View>

      {onToggleSelect && (
        <Pressable 
          onPress={handleTogglePress}
          style={[
            styles.checkmarkButton,
            { borderColor: checkmarkBorderColor },
            showCheckmark && { backgroundColor: checkmarkBackgroundColor }
          ]}
        >
          {showCheckmark && (
            <Check 
              size={10} 
              color={checkmarkColor}
              strokeWidth={3}
            />
          )}
        </Pressable>
      )}
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
