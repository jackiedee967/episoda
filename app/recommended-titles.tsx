
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockShows, mockUsers } from '@/data/mockData';
import { Show } from '@/types';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';

type Genre = 'All' | 'Reality' | 'Drama' | 'Comedy' | 'Thriller' | 'Sci-Fi';

export default function RecommendedTitlesScreen() {
  const router = useRouter();
  const { playlists, isShowInPlaylist } = useData();
  const [selectedGenre, setSelectedGenre] = useState<Genre>('All');
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  const genres: Genre[] = ['All', 'Reality', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi'];

  // Sort shows by "Most Popular Amongst Friends" (friendsWatching count)
  const sortedShows = [...mockShows].sort((a, b) => b.friendsWatching - a.friendsWatching);

  // Filter by genre (in a real app, shows would have genre property)
  const filteredShows = selectedGenre === 'All' ? sortedShows : sortedShows;

  // Check if show is in any playlist
  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setPlaylistModalVisible(true);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    console.log(`Show ${showId} added to playlist ${playlistId}`);
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

        {/* Shows Grid - 2 columns */}
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
                      name={isShowSaved(show.id) ? 'bookmark.fill' : 'bookmark'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
                <Text style={styles.showTitle} numberOfLines={2}>
                  {show.title}
                </Text>
                <View style={styles.showStats}>
                  <View style={styles.stat}>
                    <IconSymbol name="star.fill" size={14} color="#FCD34D" />
                    <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <IconSymbol name="person.2.fill" size={14} color={colors.text} />
                    <Text style={styles.statText}>{show.friendsWatching}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {selectedShow && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShow(null);
          }}
          show={selectedShow}
          onAddToPlaylist={handleAddToPlaylist}
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
    width: 'calc(50% - 8px)',
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
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  showStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
