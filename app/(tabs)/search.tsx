
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image } from 'react-native';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { mockShows } from '@/data/mockData';
import { useRouter } from 'expo-router';
import WatchlistModal from '@/components/WatchlistModal';
import { Show } from '@/types';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showsInWatchlist, setShowsInWatchlist] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filteredShows = searchQuery
    ? mockShows.filter((show) => show.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : mockShows;

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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={commonStyles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search shows..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
            {filteredShows.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="magnifyingglass" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No shows found</Text>
                <Text style={styles.emptyStateSubtext}>Try searching for something else</Text>
              </View>
            ) : (
              filteredShows.map((show) => (
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
                        name={showsInWatchlist.has(show.id) ? "bookmark.fill" : "bookmark"} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                    </Pressable>
                  </View>
                  <View style={styles.showInfo}>
                    <Text style={styles.showTitle}>{show.title}</Text>
                    <Text style={styles.showDescription} numberOfLines={2}>
                      {show.description}
                    </Text>
                    <View style={styles.showStats}>
                      <View style={styles.stat}>
                        <IconSymbol name="star.fill" size={14} color="#FCD34D" />
                        <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
                      </View>
                      <View style={styles.stat}>
                        <IconSymbol name="person.2.fill" size={14} color={colors.text} />
                        <Text style={styles.statText}>{show.friendsWatching} friends</Text>
                      </View>
                      <View style={styles.stat}>
                        <IconSymbol name="tv" size={14} color={colors.text} />
                        <Text style={styles.statText}>
                          {show.totalSeasons} season{show.totalSeasons > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  resultsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  showCardPressed: {
    opacity: 0.95,
  },
  posterWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  showPoster: {
    width: 80,
    height: 120,
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
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  showDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
