import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import * as Haptics from 'expo-haptics';
import tokens from '@/styles/tokens';
import { Star, Check } from 'lucide-react-native';

interface EpisodeListCardProps {
  episodeNumber: string;
  title: string;
  description?: string;
  rating?: number;
  postCount?: number;
  isSelected?: boolean;
  isLogged?: boolean;
  onPress?: () => void;
  onToggleSelect?: () => void;
}

export default function EpisodeListCard({ 
  episodeNumber,
  title, 
  description,
  rating,
  postCount,
  isSelected = false,
  isLogged = false,
  onPress,
  onToggleSelect
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
  const cardBorderColor = showCheckmark ? tokens.colors.greenHighlight : tokens.colors.cardStroke;

  return (
    <Pressable 
      onPress={handleCardPress}
      style={[styles.episodeCard, { borderColor: cardBorderColor }]}
    >
      <View style={styles.thumbnailPlaceholder} />
      
      <View style={styles.episodeInfo}>
        <View style={styles.titleRow}>
          <View style={styles.episodeTag}>
            <Text style={styles.episodeTagText}>{episodeNumber}</Text>
          </View>
          <Text style={styles.episodeTitle} numberOfLines={1}>{title}</Text>
        </View>
        
        {description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
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
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {postCount !== undefined && (
            <Text style={styles.postCountText}>{postCount} posts</Text>
          )}
        </View>
      </View>

      {showCheckmark && (
        <Pressable 
          onPress={handleTogglePress}
          style={styles.checkmarkButton}
        >
          <Check 
            size={12} 
            color={tokens.colors.greenHighlight}
            strokeWidth={3}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  episodeCard: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 362,
    paddingTop: 10,
    paddingLeft: 10,
    paddingBottom: 10,
    paddingRight: 10,
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    backgroundColor: tokens.colors.cardBackground,
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
    borderColor: tokens.colors.tabStroke2,
    backgroundColor: tokens.colors.tabBack2,
  },
  episodeTagText: {
    ...tokens.typography.p3M,
    color: tokens.colors.tabStroke2,
  },
  episodeTitle: {
    ...tokens.typography.p1B,
    color: tokens.colors.pureWhite,
    flex: 1,
  },
  episodeDescription: {
    ...tokens.typography.p3R,
    color: tokens.colors.grey2,
    width: '100%',
  },
  ratingAndPostCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: tokens.colors.greenHighlight,
    backgroundColor: tokens.colors.greenHighlight,
  },
});
