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
import { ensureShowId } from '@/services/showRegistry';
import { saveShow } from '@/services/showDatabase';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { supabase } from '@/integrations/supabase/client';
import PlaylistModal from '@/components/PlaylistModal';
import { X } from 'lucide-react-native';
import SkeletonBlock from '@/components/skeleton/SkeletonBlock';

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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Fade animation for smooth content transition
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
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
    console.log('📚 FavoritesSection loadFavorites called with userId:', userId);
    
    // Guard against empty userId to prevent "invalid input syntax for type uuid" error
    if (!userId || userId.trim() === '') {
      console.log('⚠️ FavoritesSection: Empty userId, skipping load');
      setFavorites([]);
      setLoading(false);
      setShowSkeleton(false);
      // Trigger fade-in animation
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setInitialLoadComplete(true);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📚 FavoritesSection: Fetching favorites for user:', userId);
      
      // Try RPC function first (bypasses PostgREST cache issues)
      let favoritesArray: any[] = [];
      let fetchSuccessful = false;
      
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_favorites', {
          p_user_id: userId
        });
        
        if (!rpcError && rpcData) {
          console.log('📚 FavoritesSection: RPC call successful:', rpcData);
          favoritesArray = Array.isArray(rpcData) ? rpcData : [];
          fetchSuccessful = true;
        } else if (rpcError) {
          console.log('📚 FavoritesSection: RPC not available, falling back to direct query:', rpcError.message);
        }
      } catch (rpcErr) {
        console.log('📚 FavoritesSection: RPC exception, falling back to direct query');
      }
      
      // Fallback to direct table query
      if (!fetchSuccessful) {
        try {
          const result = await (supabase as any)
            .from('profiles')
            .select('favorite_shows')
            .eq('user_id', userId)
            .single();
          
          if (!result.error && result.data) {
            console.log('📚 FavoritesSection: Direct query successful:', result.data);
            favoritesArray = result.data?.favorite_shows || [];
            fetchSuccessful = true;
          } else if (result.error) {
            console.error('❌ FavoritesSection: Direct query error:', result.error);
          }
        } catch (queryErr) {
          console.error('❌ FavoritesSection: Query exception:', queryErr);
        }
      }
      
      if (!fetchSuccessful) {
        console.log('📚 FavoritesSection: No fetch method worked, showing empty state');
        setFavorites([]);
        setShowSkeleton(false);
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setInitialLoadComplete(true);
        return;
      }

      console.log('📚 FavoritesSection: Favorites array:', favoritesArray);
      
      if (favoritesArray.length === 0) {
        console.log('📚 FavoritesSection: No favorites found, showing empty state');
        setFavorites([]);
        setShowSkeleton(false);
        // Trigger fade-in animation
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setInitialLoadComplete(true);
        return;
      }
      
      // Get show details for each favorite
      const showIds = favoritesArray.map((f: any) => f.show_id);
      const { data: showsData, error: showsError } = await supabase
        .from('shows')
        .select('id, trakt_id, title, poster_url, backdrop_url')
        .in('id', showIds);
      
      if (showsError) {
        console.error('Error loading show details:', showsError);
        return;
      }
      
      const showsMap = new Map((showsData || []).map((s: any) => [s.id, s]));

      const mappedFavorites: FavoriteShow[] = favoritesArray
        .map((fav: any, index: number) => {
          const showData = showsMap.get(fav.show_id);
          if (!showData) return null;
          
          return {
            id: `fav-${index}`,
            show_id: fav.show_id,
            display_order: fav.display_order,
            show: {
              id: showData.id,
              traktId: showData.trakt_id,
              title: showData.title,
              year: undefined,
              poster: showData.poster_url,
              backdrop: showData.backdrop_url,
              description: '',
              rating: 0,
              totalSeasons: 0,
              totalEpisodes: 0,
              friendsWatching: 0,
            },
          };
        })
        .filter(Boolean) as FavoriteShow[];

      // Sort by display_order
      mappedFavorites.sort((a, b) => a.display_order - b.display_order);
      setFavorites(mappedFavorites);
      
      // Trigger smooth fade-in transition
      if (!initialLoadComplete) {
        setShowSkeleton(false);
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (err) {
      console.error('Error in loadFavorites:', err);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [userId, initialLoadComplete, contentFadeAnim]);

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
        const traktShows = searchResponse.results.map(r => r.show);
        
        if (traktShows.length === 0) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }
        
        const { mapTraktShowToShow } = await import('@/services/showMappers');
        const { showEnrichmentManager } = await import('@/services/showEnrichment');
        
        const traktIds = traktShows.map(s => s.ids.trakt);
        const { data: dbShows } = await supabase
          .from('shows')
          .select('id, trakt_id, poster_url, backdrop_url, tvmaze_id, imdb_id, total_seasons')
          .in('trakt_id', traktIds);
        
        const dbShowsMap = new Map(
          (dbShows || []).map(show => [show.trakt_id, show])
        );
        
        const visibleShows = traktShows.slice(0, 12);
        
        const enrichmentPromises = visibleShows.map(async (traktShow) => {
          const dbShow = dbShowsMap.get(traktShow.ids.trakt);
          if (dbShow?.poster_url) {
            return {
              traktShow,
              posterUrl: dbShow.poster_url,
              totalSeasons: dbShow.total_seasons || 0,
              dbId: dbShow.id,
            };
          }
          
          const enriched = await showEnrichmentManager.enrichShow(traktShow);
          
          try {
            await saveShow(traktShow, {
              enrichedPosterUrl: enriched.posterUrl || undefined,
              enrichedBackdropUrl: enriched.backdropUrl || undefined,
              enrichedTVMazeId: enriched.tvmazeId || undefined,
              enrichedImdbId: enriched.imdbId || undefined,
              enrichedSeasonCount: enriched.totalSeasons || undefined,
            });
          } catch (saveError) {
            console.warn(`Failed to cache ${traktShow.title}:`, saveError);
          }
          
          return {
            traktShow,
            posterUrl: enriched.posterUrl,
            totalSeasons: enriched.totalSeasons || 0,
            dbId: null,
          };
        });
        
        const enrichedResults = await Promise.allSettled(enrichmentPromises);
        
        const mappedResults: SearchResult[] = enrichedResults.map((result, index) => {
          const traktShow = visibleShows[index];
          const dbShow = dbShowsMap.get(traktShow.ids.trakt);
          
          if (result.status === 'fulfilled') {
            return {
              show: mapTraktShowToShow(traktShow, {
                posterUrl: result.value.posterUrl,
                totalSeasons: result.value.totalSeasons,
              }),
              traktShow,
              isDatabaseBacked: !!dbShow || !!result.value.dbId,
              traktId: traktShow.ids.trakt,
            };
          } else {
            return {
              show: mapTraktShowToShow(traktShow, undefined),
              traktShow,
              isDatabaseBacked: !!dbShow,
              traktId: traktShow.ids.trakt,
            };
          }
        });
        
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
    console.log('🎯 handleShowSelect called for slot:', selectedSlot, 'show:', result.show.title);
    
    try {
      // BULLETPROOF: Use ensureShowId to guarantee valid database UUID
      const showId = await ensureShowId({
        traktId: result.traktId,
        traktShow: result.traktShow,
      });
      
      console.log('✅ Guaranteed show ID:', showId);
      console.log('📝 Fetching current profile favorites for user:', userId);
      // Get current favorites via direct table query
      const { data: profileData, error: fetchError } = await (supabase as any)
        .from('profiles')
        .select('favorite_shows')
        .eq('user_id', userId)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError);
        return;
      }
      
      console.log('📋 Current favorites:', profileData?.favorite_shows);
      
      const favoritesArray = profileData?.favorite_shows || [];
      const displayOrder = selectedSlot + 1;
      
      // Remove any existing favorite at this slot, then add new one
      const updatedFavorites = favoritesArray.filter((f: any) => f.display_order !== displayOrder);
      updatedFavorites.push({
        show_id: showId,
        display_order: displayOrder,
        trakt_id: result.traktShow?.ids?.trakt || result.show.traktId,
      });
      
      console.log('📤 Updating favorites to:', updatedFavorites);
      
      // Update via RPC function (bypasses PostgREST cache issues)
      const { data: updateData, error: updateError } = await supabase.rpc('set_user_favorites', {
        p_user_id: userId,
        p_favorites: updatedFavorites
      });
      
      if (updateError) {
        console.error('❌ Error updating favorites via RPC:', updateError);
        // Fallback to direct table query
        const { error: fallbackError } = await (supabase as any)
          .from('profiles')
          .update({ favorite_shows: updatedFavorites })
          .eq('user_id', userId);
        
        if (fallbackError) {
          console.error('❌ Fallback update also failed:', fallbackError);
          return;
        }
      }
      
      console.log('✅ Update response:', updateData);
      
      await loadFavorites();
      closeModal();
    } catch (err) {
      console.error('❌ Error in handleShowSelect:', err);
    }
  };

  const handleRemoveFavorite = async (displayOrder: number) => {
    if (!isOwnProfile) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Get current favorites via direct table query
      const { data: profileData, error: fetchError } = await (supabase as any)
        .from('profiles')
        .select('favorite_shows')
        .eq('user_id', userId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        return;
      }
      
      const favoritesArray = profileData?.favorite_shows || [];
      
      // Remove the favorite at this display order
      const updatedFavorites = favoritesArray.filter((f: any) => f.display_order !== displayOrder);
      
      // Update via RPC function (bypasses PostgREST cache issues)
      const { error: updateError } = await supabase.rpc('set_user_favorites', {
        p_user_id: userId,
        p_favorites: updatedFavorites
      });
      
      if (updateError) {
        console.error('Error removing favorite via RPC:', updateError);
        // Fallback to direct table query
        const { error: fallbackError } = await (supabase as any)
          .from('profiles')
          .update({ favorite_shows: updatedFavorites })
          .eq('user_id', userId);
        
        if (fallbackError) {
          console.error('Fallback update also failed:', fallbackError);
          return;
        }
      }
      
      await loadFavorites();
    } catch (err) {
      console.error('Error in handleRemoveFavorite:', err);
    }
  };

  const handleRecommendationSelect = async (result: { show: Show; traktShow?: TraktShow; isDatabaseBacked: boolean; traktId: number }) => {
    if (selectedSlot === null) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('🎯 handleRecommendationSelect called for slot:', selectedSlot, 'show:', result.show.title);
    
    try {
      // BULLETPROOF: Use ensureShowId to guarantee valid database UUID
      const showId = await ensureShowId({
        traktId: result.traktId,
        traktShow: result.traktShow,
      });
      
      console.log('✅ Guaranteed show ID:', showId);
      console.log('📝 Fetching current profile favorites for user:', userId);
      // Get current favorites via direct table query
      const { data: profileData, error: fetchError } = await (supabase as any)
        .from('profiles')
        .select('favorite_shows')
        .eq('user_id', userId)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError);
        return;
      }
      
      console.log('📋 Current favorites:', profileData?.favorite_shows);
      
      const favoritesArray = profileData?.favorite_shows || [];
      const displayOrder = selectedSlot + 1;
      
      // Remove any existing favorite at this slot, then add new one
      const updatedFavorites = favoritesArray.filter((f: any) => f.display_order !== displayOrder);
      updatedFavorites.push({
        show_id: showId,
        display_order: displayOrder,
        trakt_id: result.traktShow?.ids?.trakt || result.show.traktId,
      });
      
      console.log('📤 Updating favorites to:', updatedFavorites);
      
      // Update via RPC function (bypasses PostgREST cache issues)
      const { data: updateData, error: updateError } = await supabase.rpc('set_user_favorites', {
        p_user_id: userId,
        p_favorites: updatedFavorites
      });
      
      if (updateError) {
        console.error('❌ Error updating favorites via RPC:', updateError);
        // Fallback to direct table query
        const { error: fallbackError } = await (supabase as any)
          .from('profiles')
          .update({ favorite_shows: updatedFavorites })
          .eq('user_id', userId);
        
        if (fallbackError) {
          console.error('❌ Fallback update also failed:', fallbackError);
          return;
        }
      }
      
      console.log('✅ Update response:', updateData);
      
      await loadFavorites();
      closeModal();
    } catch (err) {
      console.error('❌ Error in handleRecommendationSelect:', err);
    }
  };

  // Hide section for other users if they have no favorites (after loading)
  if (!isOwnProfile && !loading && favorites.length === 0) {
    return null;
  }

  const filledSlots = new Map(favorites.map(f => [f.display_order, f]));

  // Skeleton loading state with gradient shimmer
  const renderSkeleton = () => (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Favorites</Text>
      <View style={styles.favoritesRow}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.skeletonPoster}>
            <View style={styles.skeletonInner}>
              <SkeletonBlock 
                width={200}
                height={300}
                borderRadius={14}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSlot = (slotIndex: number) => {
    // display_order is 1-based (1, 2, 3), slotIndex is 0-based (0, 1, 2)
    const favorite = filledSlots.get(slotIndex + 1);
    
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
                handleRemoveFavorite(favorite.display_order);
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
        pointerEvents="box-none"
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

  // Show skeleton during initial load
  if (showSkeleton) {
    return renderSkeleton();
  }

  return (
    <Animated.View style={[styles.container, { opacity: contentFadeAnim }]}>
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
    </Animated.View>
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
  postersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonPoster: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  skeletonInner: {
    width: '100%',
    height: '100%',
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
    zIndex: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
  },
  closeButton: {
    padding: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingHorizontal: 16,
    height: 46,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.p1,
    color: tokens.colors.black,
  },
  showsList: {
    flex: 1,
    minHeight: 300,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
    minHeight: 300,
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
