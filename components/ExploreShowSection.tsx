import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import tokens from '@/styles/tokens';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';
import { Friends as BaseFriends } from './ui-pages/base/friends';

interface Show {
  id: string;
  title: string;
  poster?: string | null;
  traktId?: number;
  year?: number;
  endYear?: number | null;
  rating?: number;
  genres?: string[];
  mutualFriendsWatching?: Array<{
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  }>;
}

interface SeedShow {
  id: string;
  title: string;
  traktId: number;
  year?: number;
  rating?: number;
  genres?: string[];
}

interface ExploreShowSectionProps {
  title: string;
  shows: Show[];
  isGenreSection?: boolean;
  onTitlePress?: () => void;
  onShowPress: (show: Show) => void;
  onBookmarkPress?: (show: Show) => void;
  isShowSaved?: (showId: string) => boolean;
  onViewMore?: () => void;
  seedShow?: SeedShow; // For "Because You Watched" sections
}

export default function ExploreShowSection({
  title,
  shows,
  isGenreSection = false,
  onTitlePress,
  onShowPress,
  onBookmarkPress,
  isShowSaved,
  onViewMore,
  seedShow
}: ExploreShowSectionProps) {
  const router = useRouter();

  const handleShowPress = (show: Show) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowPress(show);
  };

  const handleBookmarkPress = (show: Show, e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBookmarkPress) {
      onBookmarkPress(show);
    }
  };

  if (shows.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Title with View More */}
      {isGenreSection && onTitlePress ? (
        <Pressable 
          style={styles.genreTitleButton}
          onPress={onTitlePress}
        >
          <Text style={styles.genreTitle}>{title}</Text>
        </Pressable>
      ) : (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {onViewMore && (
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onViewMore();
            }}>
              <Text style={styles.viewMoreText}>View more ›</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Horizontal Scrolling Shows */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showsScroll}
        decelerationRate="fast"
        snapToInterval={143} // Width of show card (130) + gap (13)
        snapToAlignment="start"
      >
        {shows.map((show, index) => (
          <Pressable
            key={show.id || `show-${index}`}
            style={({ pressed }) => [
              styles.showCard,
              pressed && styles.showCardPressed
            ]}
            onPress={() => handleShowPress(show)}
          >
            <View style={styles.posterWrapper}>
              <Image
                source={{ uri: show.poster || undefined }}
                style={styles.showImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              
              {/* Mutual Friends Watching - Top Right */}
              {show.mutualFriendsWatching && show.mutualFriendsWatching.length > 0 && (
                <View style={styles.mutualFriendsOverlay}>
                  <BaseFriends
                    prop="Small"
                    state="Mutual_Friends"
                    friends={show.mutualFriendsWatching}
                  />
                </View>
              )}
              
              {/* Bookmark Button */}
              {onBookmarkPress && isShowSaved ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.saveIcon,
                    pressed ? styles.saveIconPressed : null
                  ]}
                  onPress={(e) => handleBookmarkPress(show, e)}
                >
                  <IconSymbol
                    name={isShowSaved(show.id) ? 'heart.fill' : 'heart'}
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              ) : null}
            </View>
            
            <Text style={styles.showTitle} numberOfLines={2}>
              {show.title}
            </Text>
            
            {/* Year or Year Range */}
            {show.year && (
              <Text style={styles.showYear}>
                {show.endYear && show.endYear !== show.year 
                  ? `${show.year} - ${show.endYear}` 
                  : show.year}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 13,
    marginBottom: 29,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
  },
  viewMoreText: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
  },
  genreTitleButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  genreTitle: {
    ...tokens.typography.p1M,
    color: tokens.colors.greenHighlight,
    fontSize: 15,
    fontWeight: '600',
  },
  showsScroll: {
    gap: 13,
    paddingLeft: 20,
    paddingRight: 20,
  },
  showCard: {
    width: 130, // Narrower than homepage (215) to fit 2.5 shows
    gap: 6,
  },
  showCardPressed: {
    opacity: 0.7,
  },
  posterWrapper: {
    position: 'relative',
    width: 130,
    height: 195, // Maintain 2:3 aspect ratio
  },
  showImage: {
    width: 130,
    height: 195,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.imageStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  saveIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showTitle: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
    fontSize: 13,
    lineHeight: 16,
  },
  showYear: {
    ...tokens.typography.p3R,
    color: tokens.colors.almostWhite,
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.6,
  },
  mutualFriendsOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
});
