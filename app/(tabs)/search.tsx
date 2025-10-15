
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
  const router = useRouter();

  const filteredShows = searchQuery
    ? mockShows.filter((show) => show.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : mockShows;

  const handleSavePress = (show: Show, e: any) => {
    e.stopPropagation();
    setSelectedShow(show);
    setWatchlistModalVisible(true);
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
            />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
            {filteredShows.map((show) => (
              <Pressable
                key={show.id}
                style={styles.showCard}
                onPress={() => router.push(`/show/${show.id}`)}
              >
                <View style={styles.posterWrapper}>
                  <Image source={{ uri: show.poster }} style={styles.showPoster} />
                  <Pressable 
                    style={styles.saveIcon} 
                    onPress={(e) => handleSavePress(show, e)}
                  >
                    <IconSymbol name="bookmark" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.showInfo}>
                  <Text style={styles.showTitle}>{show.title}</Text>
                  <Text style={styles.showDescription} numberOfLines={2}>
                    {show.description}
                  </Text>
                  <View style={styles.showStats}>
                    <View style={styles.stat}>
                      <IconSymbol name="star.fill" size={14} color={colors.secondary} />
                      <Text style={styles.statText}>{show.rating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.stat}>
                      <IconSymbol name="person.2.fill" size={14} color={colors.text} />
                      <Text style={styles.statText}>{show.friendsWatching} friends</Text>
                    </View>
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
  showCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
