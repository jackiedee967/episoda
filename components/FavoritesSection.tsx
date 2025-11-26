import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors, spacing } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { useData } from '@/contexts/DataContext';
import { searchShows, TraktShow } from '@/services/trakt';
import { saveShow, getShowByTraktId } from '@/services/showDatabase';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { supabase } from '@/integrations/supabase/client';
import PlaylistModal from '@/components/PlaylistModal';
import { X } from 'lucide-react-native';

interface FavoriteShow {
  id: string;
  show_id: string;
  display_order: number;
  show: Show;
}

interface FavoritesSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_FAVORITES = 3;

type SearchResult = {
  show: Show;
  traktShow?: TraktShow;
  isDatabaseBacked: boolean;
  traktId: number;
};

export default function FavoritesSection({ userId, isOwnProfile }: FavoritesSectionProps) {
  const { 
    currentUser, 
    cachedRecommendations, 
    isLoadingRecommendations,
    isShowInPlaylist,
    playlists,
  } = useData();
  
  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist ? isShowInPlaylist(pl.id, showId) : false);
  };
  
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShowForPlaylist, setSelectedShowForPlaylist] = useState<Show | null>(null);
  
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('user_favorites')
        .select(`
          id,
          show_id,
          display_order,
          shows (
            id,
            trakt_id,
            title,
            year,
            poster_url,
            backdrop_url,
            description,
            rating,
            total_seasons,
            total_episodes
          )
        `)
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading favorites:', error);
        return;
      }

      const mappedFavorites: FavoriteShow[] = (data || []).map((fav: any) => ({
        id: fav.id,
        show_id: fav.show_id,
        display_order: fav.display_order,
        show: {
          id: fav.shows.id,
          traktId: fav.shows.trakt_id,
          title: fav.shows.title,
          year: fav.shows.year,
          poster: fav.shows.poster_url,
          backdrop: fav.shows.backdrop_url,
          description: fav.shows.description || '',
          rating: fav.shows.rating || 0,
          totalSeasons: fav.shows.total_seasons || 0,
          totalEpisodes: fav.shows.total_episodes || 0,
          friendsWatching: 0,
        },
      }));

      setFavorites(mappedFavorites);
    } catch (err) {
      console.error('Error in loadFavorites:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      
      try {
        const searchResponse = await searchShows(searchQuery);
        const mappedResults: SearchResult[] = await Promise.all(
          searchResponse.results.slice(0, 12).map(async (result) => {
            const traktShow = result.show;
            const dbShow = await getShowByTraktId(traktShow.ids.trakt);
            
            const show: Show = dbShow ? {
              id: dbShow.id,
              traktId: dbShow.trakt_id,
              title: dbShow.title,
              year: dbShow.year || undefined,
              poster: dbShow.poster_url,
              backdrop: dbShow.backdrop_url,
              description: dbShow.description || '',
              rating: dbShow.rating || 0,
              totalSeasons: dbShow.total_seasons || 0,
              totalEpisodes: dbShow.total_episodes || 0,
              friendsWatching: 0,
            } : {
              id: `trakt-${traktShow.ids.trakt}`,
              traktId: traktShow.ids.trakt,
              title: traktShow.title,
              year: traktShow.year,
              poster: traktShow.ids.tmdb ? `https://image.tmdb.org/t/p/w500/${traktShow.ids.tmdb}` : null,
              description: traktShow.overview || '',
              rating: traktShow.rating || 0,
              totalSeasons: 0,
              totalEpisodes: 0,
              friendsWatching: 0,
            };
            
            return {
              show,
              traktShow,
              isDatabaseBacked: !!dbShow,
              traktId: traktShow.ids.trakt,
            };
          })
        );
        
        setSearchResults(mappedResults);
      } catch (err) {
        console.error('Search error:', err);
        setSearchError('Failed to search shows. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const openModal = (slot: number) => {
    if (!isOwnProfile) return;
    setSelectedSlot(slot);
    setSearchQuery('');
    setSearchResults([]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedSlot(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleShowSelect = async (result: SearchResult) => {
    if (selectedSlot === null) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      let showId = result.show.id;
      
      if (!result.isDatabaseBacked && result.traktShow) {
        const savedShow = await saveShow(result.traktShow);
        
        if (savedShow) {
          showId = savedShow.id;
        }
      }
      
      const { error } = await (supabase as any)
        .from('user_favorites')
        .insert({
          user_id: userId,
          show_id: showId,
          display_order: selectedSlot,
        });
      
      if (error) {
        if (error.code === '23505') {
          console.log('Show already in favorites');
        } else {
          console.error('Error adding favorite:', error);
        }
        return;
      }
      
      await loadFavorites();
      closeModal();
    } catch (err) {
      console.error('Error in handleShowSelect:', err);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!isOwnProfile) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const { error } = await (supabase as any)
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);
      
      if (error) {
        console.error('Error removing favorite:', error);
        return;
      }
      
      await loadFavorites();
    } catch (err) {
      console.error('Error in handleRemoveFavorite:', err);
    }
  };

  const handleRecommendationSelect = async (result: { show: Show; traktShow?: TraktShow; isDatabaseBacked: boolean; traktId: number }) => {
    if (selectedSlot === null) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      let showId = result.show.id;
      
      if (!result.isDatabaseBacked && result.traktShow) {
        const savedShow = await saveShow(result.traktShow);
        
        if (savedShow) {
          showId = savedShow.id;
        }
      }
      
      const { error } = await (supabase as any)
        .from('user_favorites')
        .insert({
          user_id: userId,
          show_id: showId,
          display_order: selectedSlot,
        });
      
      if (error) {
        if (error.code === '23505') {
          console.log('Show already in favorites');
        } else {
          console.error('Error adding favorite:', error);
        }
        return;
      }
      
      await loadFavorites();
      closeModal();
    } catch (err) {
      console.error('Error in handleRecommendationSelect:', err);
    }
  };

  if (loading) {
    return null;
  }

  if (!isOwnProfile && favorites.length === 0) {
    return null;
  }

  const filledSlots = new Map(favorites.map(f => [f.display_order, f]));

  const renderSlot = (slotIndex: number) => {
    const favorite = filledSlots.get(slotIndex);
    
    if (favorite) {
      return (
        <Pressable
          key={slotIndex}
          style={styles.posterContainer}
          onPress={() => router.push(`/show/${favorite.show.id}`)}
        >
          <Image 
            source={{ uri: getPosterUrl(favorite.show.poster, favorite.show.title) }} 
            style={styles.posterImage}
            contentFit="cover"
          />
          <Pressable 
            style={({ pressed }) => [
              styles.saveIcon,
              pressed && styles.iconPressed,
            ]} 
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedShowForPlaylist(favorite.show);
              setPlaylistModalVisible(true);
            }}
          >
            <IconSymbol 
              name={isShowSaved(favorite.show.id) ? "heart.fill" : "heart"} 
              size={18} 
              color={colors.pureWhite} 
            />
          </Pressable>
          {isOwnProfile ? (
            <Pressable 
              style={({ pressed }) => [
                styles.deleteIcon,
                pressed && styles.iconPressed,
              ]} 
              onPress={(e) => {
                e.stopPropagation();
                handleRemoveFavorite(favorite.id);
              }}
            >
              <View style={styles.deleteIconBackground}>
                <X size={12} color={colors.pureWhite} strokeWidth={2.5} />
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      );
    }
    
    if (isOwnProfile) {
      return (
        <Pressable
          key={slotIndex}
          style={styles.placeholderContainer}
          onPress={() => openModal(slotIndex)}
        >
          <IconSymbol name="plus" size={24} color={tokens.colors.grey1} />
        </Pressable>
      );
    }
    
    return (
      <View key={slotIndex} style={styles.emptySlot} />
    );
  };

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
    >
      <Animated.View 
        style={[
          styles.modalBackdrop,
          { opacity: backdropAnim }
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={closeModal} />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select a Show</Text>
          <Pressable style={styles.closeButton} onPress={closeModal}>
            <IconSymbol name="xmark" size={20} color={tokens.colors.black} />
          </Pressable>
        </View>
        
        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={tokens.colors.grey1} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search shows..."
            placeholderTextColor={tokens.colors.grey1}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView style={styles.showsList} showsVerticalScrollIndicator={false}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : null}
          
          {searchError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}
          
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim() === '' && isLoadingRecommendations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
          ) : null}
          
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length > 0 ? (
            <View style={styles.showsGrid}>
              {cachedRecommendations.slice(0, 12).map(result => (
                <Pressable
                  key={result.show.id}
                  style={styles.showGridItem}
                  onPress={() => handleRecommendationSelect(result)}
                >
                  <Image 
                    source={{ uri: getPosterUrl(result.show.poster, result.show.title) }} 
                    style={styles.showGridPoster}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
          
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim() === '' && !isLoadingRecommendations && cachedRecommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start typing to search for shows</Text>
            </View>
          ) : null}
          
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim() !== '' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No shows found</Text>
            </View>
          ) : null}
          
          {!isSearching && !searchError && searchResults.length > 0 ? (
            <View style={styles.showsGrid}>
              {searchResults.map(result => (
                <Pressable
                  key={result.show.id}
                  style={styles.showGridItem}
                  onPress={() => handleShowSelect(result)}
                >
                  <Image 
                    source={{ uri: getPosterUrl(result.show.poster, result.show.title) }} 
                    style={styles.showGridPoster}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
      
      {selectedShowForPlaylist ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShowForPlaylist(null);
          }}
          show={selectedShowForPlaylist}
        />
      ) : null}
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Favorites</Text>
      <View style={styles.favoritesRow}>
        {[0, 1, 2].map(slotIndex => renderSlot(slotIndex))}
      </View>
      {renderModal()}
      
      {selectedShowForPlaylist ? (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShowForPlaylist(null);
          }}
          show={selectedShowForPlaylist}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...tokens.typography.smallSubtitle,
    color: colors.pureWhite,
    marginBottom: 16,
  },
  favoritesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  posterContainer: {
    position: 'relative',
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  saveIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  deleteIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
  },
  deleteIconBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  placeholderContainer: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    backgroundColor: tokens.colors.cardBackground,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tokens.colors.imageStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 14,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.almostWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.black,
  },
  closeButton: {
    padding: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.p1,
    color: tokens.colors.black,
  },
  showsList: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 7,
    rowGap: 7,
  },
  showGridItem: {
    position: 'relative',
    width: '31.5%',
    aspectRatio: 109 / 164,
  },
  showGridPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
