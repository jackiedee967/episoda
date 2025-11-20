import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import tokens from '@/styles/tokens';
import { Bookmark } from 'lucide-react-native';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';

interface Show {
  id: string;
  title: string;
  poster?: string | null;
  traktId?: number;
}

interface ExploreShowSectionProps {
  title: string;
  shows: Show[];
  isGenreSection?: boolean;
  onTitlePress?: () => void;
  onShowPress: (show: Show) => void;
  onBookmarkPress?: (show: Show) => void;
  isShowSaved?: (showId: string) => boolean;
}

export default function ExploreShowSection({
  title,
  shows,
  isGenreSection = false,
  onTitlePress,
  onShowPress,
  onBookmarkPress,
  isShowSaved
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
      {/* Section Title */}
      {isGenreSection && onTitlePress ? (
        <Pressable 
          style={styles.genreTitleButton}
          onPress={onTitlePress}
        >
          <Text style={styles.genreTitle}>{title}</Text>
        </Pressable>
      ) : (
        <Text style={styles.sectionTitle}>{title}</Text>
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
                    name={isShowSaved(show.id) ? 'bookmark.fill' : 'bookmark'}
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              ) : null}
            </View>
            
            <Text style={styles.showTitle} numberOfLines={2}>
              {show.title}
            </Text>
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
  sectionTitle: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    paddingHorizontal: 20,
  },
  genreTitleButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  genreTitle: {
    ...tokens.typography.p2M,
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
    gap: 8,
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
    backgroundColor: tokens.colors.card,
  },
  saveIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showTitle: {
    ...tokens.typography.p3,
    color: tokens.colors.almostWhite,
    fontSize: 13,
    lineHeight: 16,
  },
});
