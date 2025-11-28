import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import * as Haptics from 'expo-haptics';
import { searchShows, TraktShow, getTrendingShows, TraktSearchResult } from '@/services/trakt';
import { mapTraktShowToShow } from '@/services/showMappers';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { searchShowByName, getPosterUrl as getTMDBPosterUrl } from '@/services/tmdb';
import { getAllGenres } from '@/services/userInterests';
import { Show } from '@/types';

async function fetchPosterForTraktShow(traktShow: TraktShow): Promise<string | null> {
  try {
    const tmdbResult = await searchShowByName(traktShow.title, traktShow.year);
    if (tmdbResult?.poster_path) {
      return getTMDBPosterUrl(tmdbResult.poster_path);
    }
  } catch (error) {
    console.log('Failed to fetch TMDB poster:', error);
  }
  return null;
}

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;

const SCREEN_WIDTH = Dimensions.get('window').width;
const POSTER_WIDTH = (SCREEN_WIDTH - 60) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

export const options = {
  headerShown: false,
};

const getGenreEmoji = (genre: string): string => {
  const genreLower = genre.toLowerCase();
  const emojiMap: { [key: string]: string } = {
    'action': '💥',
    'adventure': '🗺️',
    'animation': '🎨',
    'anime': '🎌',
    'comedy': '😂',
    'crime': '🔫',
    'documentary': '🎥',
    'drama': '🎭',
    'family': '👨‍👩‍👧‍👦',
    'fantasy': '🧙',
    'history': '📜',
    'horror': '👻',
    'music': '🎵',
    'mystery': '🔍',
    'romance': '💕',
    'science-fiction': '🚀',
    'thriller': '😱',
    'war': '⚔️',
    'western': '🤠',
  };
  return emojiMap[genreLower] || '📺';
};

interface ShowWithSelection extends Show {
  traktShow?: TraktShow;
  isSelected?: boolean;
}

export default function SelectShowsScreen() {
  const router = useRouter();
  const { completeOnboarding, user } = useAuth();
  const { createPost, ensureShowUuid, currentUser } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [shows, setShows] = useState<ShowWithSelection[]>([]);
  const [selectedShows, setSelectedShows] = useState<ShowWithSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allGenres = getAllGenres();

  useEffect(() => {
    loadTrendingShows();
  }, []);

  const loadTrendingShows = async () => {
    setIsLoading(true);
    try {
      const response = await getTrendingShows(30, 1);
      const mappedShows: ShowWithSelection[] = await Promise.all(
        response.data.map(async (traktShow: TraktShow) => {
          const show = mapTraktShowToShow(traktShow);
          const tmdbPoster = await fetchPosterForTraktShow(traktShow);
          const poster = getPosterUrl(tmdbPoster, show.title);
          return {
            ...show,
            poster,
            traktShow,
          };
        })
      );
      setShows(mappedShows);
    } catch (error) {
      console.error('Error loading trending shows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      loadTrendingShows();
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchShows(query);
      const mappedShows: ShowWithSelection[] = await Promise.all(
        response.results.slice(0, 30).map(async (result: TraktSearchResult) => {
          const traktShow = result.show;
          const show = mapTraktShowToShow(traktShow);
          const tmdbPoster = await fetchPosterForTraktShow(traktShow);
          const poster = getPosterUrl(tmdbPoster, show.title);
          return {
            ...show,
            poster,
            traktShow,
          };
        })
      );
      setShows(mappedShows);
    } catch (error) {
      console.error('Error searching shows:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSelectedGenre(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 500);
  };

  const handleGenrePress = async (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      loadTrendingShows();
      return;
    }
    
    setSelectedGenre(genre);
    setSearchQuery('');
    setIsSearching(true);
    
    try {
      const response = await searchShows(genre);
      const mappedShows: ShowWithSelection[] = await Promise.all(
        response.results.slice(0, 30).map(async (result: TraktSearchResult) => {
          const traktShow = result.show;
          const show = mapTraktShowToShow(traktShow);
          const tmdbPoster = await fetchPosterForTraktShow(traktShow);
          const poster = getPosterUrl(tmdbPoster, show.title);
          return {
            ...show,
            poster,
            traktShow,
          };
        })
      );
      setShows(mappedShows);
    } catch (error) {
      console.error('Error loading genre shows:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShowPress = (show: ShowWithSelection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isCurrentlySelected = selectedShows.some(s => s.id === show.id);
    
    if (isCurrentlySelected) {
      setSelectedShows(prev => prev.filter(s => s.id !== show.id));
    } else if (selectedShows.length < 3) {
      setSelectedShows(prev => [...prev, show]);
    }
  };

  const handleContinue = async () => {
    if (selectedShows.length !== 3 || !user) return;
    
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      for (const show of selectedShows) {
        let showUuid = show.id;
        
        if (show.traktShow) {
          showUuid = await ensureShowUuid(show, show.traktShow);
        }
        
        const showWithUuid = { ...show, id: showUuid };
        
        await createPost({
          show: showWithUuid,
          episodes: [],
          title: '',
          body: '',
          tags: [],
          user: {
            id: user.id,
            username: currentUser?.username || '',
            displayName: currentUser?.displayName || '',
            avatar: currentUser?.avatar || '',
          },
          skipRating: true,
        });
      }
      
      if (completeOnboarding) {
        await completeOnboarding();
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/' as any);
    } catch (error) {
      console.error('Error saving initial shows:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isShowSelected = (showId: string) => {
    return selectedShows.some(s => s.id === showId);
  };

  const renderShowItem = ({ item, index }: { item: ShowWithSelection; index: number }) => {
    const selected = isShowSelected(item.id);
    
    return (
      <Pressable
        onPress={() => handleShowPress(item)}
        style={[
          styles.posterContainer,
          selected && styles.posterContainerSelected,
        ]}
      >
        <Image
          source={{ uri: item.poster || undefined }}
          style={styles.poster}
          contentFit="cover"
        />
        {selected ? (
          <View style={styles.selectedOverlay}>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>
                {selectedShows.findIndex(s => s.id === item.id) + 1}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const canContinue = selectedShows.length === 3;

  return (
    <ImageBackground
      source={{ uri: phoneBackground }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={tokens.colors.pureWhite} />
        </Pressable>
        
        {canContinue ? (
          <Pressable onPress={handleContinue} style={styles.continueButton} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={tokens.colors.pureWhite} />
            ) : (
              <>
                <Text style={styles.continueText}>Continue</Text>
                <ChevronRight size={20} color={tokens.colors.pureWhite} />
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Select the last 3 shows you've seen</Text>
        <Text style={styles.subtitle}>Build your archive of shows to personalize your feed!</Text>

        <View style={styles.searchContainer}>
          <Search size={18} color={tokens.colors.grey1} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={tokens.colors.grey1}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreScrollContent}
          style={styles.genreScroll}
        >
          {allGenres.map((genre) => (
            <Pressable
              key={genre}
              style={[
                styles.genreButton,
                selectedGenre === genre && styles.genreButtonSelected,
              ]}
              onPress={() => handleGenrePress(genre)}
            >
              <Text
                style={[
                  styles.genreButtonText,
                  selectedGenre === genre && styles.genreButtonTextSelected,
                ]}
              >
                {getGenreEmoji(genre)} {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading || isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
          </View>
        ) : (
          <FlatList
            data={shows}
            renderItem={renderShowItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  continueText: {
    ...tokens.typography.subtitle,
    color: tokens.colors.pureWhite,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.p1,
    color: tokens.colors.black,
    padding: 0,
  },
  genreScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  genreScrollContent: {
    gap: 10,
    paddingRight: 20,
  },
  genreButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  genreButtonSelected: {
    backgroundColor: tokens.colors.greenHighlight,
    borderColor: tokens.colors.greenHighlight,
  },
  genreButtonText: {
    ...tokens.typography.p1M,
    color: tokens.colors.almostWhite,
  },
  genreButtonTextSelected: {
    color: tokens.colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  posterContainer: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  posterContainerSelected: {
    borderColor: tokens.colors.greenHighlight,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    fontWeight: '700',
  },
});
