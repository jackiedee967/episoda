
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockShows, mockUsers } from '@/data/mockData';
import { Show } from '@/types';
import WatchlistModal from '@/components/WatchlistModal';

type Genre = 'All' | 'Reality' | 'Drama' | 'Comedy' | 'Thriller' | 'Sci-Fi';

export default function RecommendedTitlesScreen() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<Genre>('All');
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showsInWatchlist, setShowsInWatchlist] = useState<Set<string>>(new Set());

  const genres: Genre[] = ['All', 'Reality', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi'];

  // Sort shows by "Most Popular Amongst Friends" (friendsWatching count)
  const sortedShows = [...mockShows].sort((a, b) => b.friendsWatching - a.friendsWatching);

  // Filter by genre (in a real app, shows would have genre property)
  const filteredShows = selectedGenre === 'All' ? sortedShows : sortedShows;

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setWatchlistModalVisible(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    setShowsInWatchlist(prev => new Set(prev).add(showId));
    console.log(`Show ${showId} added to watchlist ${watchlistId}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recommended Titles',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={commonStyles.container}>
        {/* Genre Filter Chips */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {genres.map((genre) => (
              <Pressable
                key={genre}
                style={[
                  styles.filterChip,
                  selectedGenre === genre && styles.filterChipActive,
                ]}
                onPress={() => setSelectedGenre(genre)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedGenre === genre && styles.filterChipTextActive,
                  ]}
                >
                  {genre}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Shows Grid */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {filteredShows.map((show) => (
              <Pressable
                key={show.id}
                style={({ pressed }) => [
                  styles.showCard,
                  pressed && styles.showCardPressed,
                ]}
                onPress={() => router.push(`/show/${show.id}`)}
              >
                <View style={styles.posterWrapper}>
                  <Image source={{ uri: show.poster }} style={styles.showPoster} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveIcon,
                      pressed && styles.saveIconPressed,
                    ]}
                    onPress={(e) => handleSavePress(show, e)}
                  >
                    <IconSymbol
                      name={showsInWatchlist.has(show.id) ? 'bookmark.fill' : 'bookmark'}
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
                <Text style={styles.showTitle} numberOfLines={2}>
                  {show.title}
                </Text>
                <View style={styles.showStats}>
                  <View style={styles.stat}>
                    <IconSymbol name="star.fill" size={12} color="#FCD34D" />
                    <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <IconSymbol name="person.2.fill" size={12} color={colors.text} />
                    <Text style={styles.statText}>{show.friendsWatching}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {selectedShow && (
        <WatchlistModal
          visible={watchlistModalVisible}
          onClose={() => {
            setWatchlistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToWatchlist={handleAddToWatchlist}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  showCard: {
    width: '31%',
    marginBottom: 8,
  },
  showCardPressed: {
    opacity: 0.7,
  },
  posterWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  showPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
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
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  showStats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
});
