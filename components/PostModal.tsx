
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors, spacing, components } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show, Episode, PostTag } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import PlaylistModal from '@/components/PlaylistModal';
import { useData } from '@/contexts/DataContext';
import { searchShows, getShowSeasons, getSeasonEpisodes, TraktShow, TraktSeason, TraktEpisode } from '@/services/trakt';
import { saveShow, saveEpisode, getShowByTraktId } from '@/services/showDatabase';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedShow?: Show;
  preselectedEpisode?: Episode;
  preselectedEpisodes?: Episode[];
  onPostSuccess?: (postId: string, postedEpisodes: Episode[]) => void;
}

type Step = 'selectShow' | 'selectEpisodes' | 'postDetails';

interface Season {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PostModal({ visible, onClose, preselectedShow, preselectedEpisode, preselectedEpisodes, onPostSuccess }: PostModalProps) {
  const { createPost, currentUser, isShowInPlaylist, playlists } = useData();
  const [step, setStep] = useState<Step>('selectShow');
  const [selectedShow, setSelectedShow] = useState<Show | null>(preselectedShow || null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Episode[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedShowForPlaylist, setSelectedShowForPlaylist] = useState<Show | null>(null);
  
  const [showSearchResults, setShowSearchResults] = useState<Array<{ show: Show; traktShow: TraktShow }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFetchingEpisodes, setIsFetchingEpisodes] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedTraktShow, setSelectedTraktShow] = useState<TraktShow | null>(null);
  const [traktEpisodesMap, setTraktEpisodesMap] = useState<Map<string, TraktEpisode>>(new Map());

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const customTagInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<any>(null);

  const isShowSaved = (showId: string) => {
    return playlists.some(pl => isShowInPlaylist(pl.id, showId));
  };
  
  // Helper to create deterministic episode key for traktEpisodesMap lookups
  const getEpisodeKey = (episode: Episode): string => {
    return `${episode.showId}-${episode.seasonNumber}-${episode.episodeNumber}`;
  };

  useEffect(() => {
    if (!visible) return;
    
    // Initialize state from props when modal opens
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes(preselectedEpisodes || (preselectedEpisode ? [preselectedEpisode] : []));
    
    // Smart step selection based on what's preselected
    if (preselectedShow && (preselectedEpisodes || preselectedEpisode)) {
      // Flow 2: Show and episodes already selected → load Trakt data and skip to review
      console.log('🎬 Loading Trakt data for preselected show and episodes');
      loadTraktDataForPreselectedShow(preselectedShow, true);
    } else if (preselectedShow) {
      // Flow 1: Show selected but no episodes → fetch episodes and Trakt data, then skip to picker
      console.log('🎬 Loading episodes for preselected show');
      loadTraktDataForPreselectedShow(preselectedShow, false);
    } else {
      // No preselection → start from show selection
      setStep('selectShow');
    }
  }, [visible, preselectedShow, preselectedEpisode, preselectedEpisodes]);
  
  const loadTraktDataForPreselectedShow = async (show: Show, skipToReview: boolean) => {
    setIsFetchingEpisodes(true);
    try {
      const { getEpisodesByShowId, getShowById } = await import('@/services/showDatabase');
      const { getShowDetails, getShowSeasons, getSeasonEpisodes } = await import('@/services/trakt');
      const { mapTraktEpisodeToEpisode } = await import('@/services/showMappers');
      
      // First, get the database show record to retrieve trakt_id
      const dbShow = await getShowById(show.id);
      if (!dbShow || !dbShow.trakt_id) {
        console.error('No Trakt ID found for show:', show.id);
        setIsFetchingEpisodes(false);
        setStep('selectShow');
        return;
      }
      
      // Fetch Trakt show data using trakt_id
      const traktShow = await getShowDetails(dbShow.trakt_id);
      setSelectedTraktShow(traktShow);
      console.log('✅ Loaded Trakt show data for preselected show');
      
      // Fetch ALL Trakt episodes to build traktEpisodesMap (required by handlePost)
      // Key by deterministic format: showId-SeasonNumber-EpisodeNumber to match database episode IDs
      const seasonsData = await getShowSeasons(traktShow.ids.trakt);
      const traktEpsMap = new Map<string, TraktEpisode>();
      
      for (const season of seasonsData) {
        if (season.number === 0) continue;
        
        const episodesData = await getSeasonEpisodes(traktShow.ids.trakt, season.number);
        
        for (const episode of episodesData) {
          // Create deterministic key that matches database episode IDs
          const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
          traktEpsMap.set(episodeKey, episode);
        }
      }
      
      setTraktEpisodesMap(traktEpsMap);
      console.log(`✅ Loaded ${traktEpsMap.size} Trakt episodes into map`);
      
      if (skipToReview) {
        // Flow 2: Episodes already provided, skip directly to review
        setIsFetchingEpisodes(false);
        setStep('postDetails');
        return;
      }
      
      // Flow 1: Fetch episodes from database for episode picker
      const dbEpisodes = await getEpisodesByShowId(show.id);
      
      if (dbEpisodes && dbEpisodes.length > 0) {
        // Group database episodes into seasons
        const seasonMap = new Map<number, Episode[]>();
        
        dbEpisodes.forEach(dbEp => {
          const episode: Episode = {
            id: dbEp.id,
            showId: dbEp.show_id,
            seasonNumber: dbEp.season_number,
            episodeNumber: dbEp.episode_number,
            title: dbEp.title,
            description: dbEp.description || '',
            rating: dbEp.rating || 0,
            postCount: 0,
            thumbnail: dbEp.thumbnail_url || undefined,
          };
          
          if (!seasonMap.has(episode.seasonNumber)) {
            seasonMap.set(episode.seasonNumber, []);
          }
          seasonMap.get(episode.seasonNumber)!.push(episode);
        });
        
        const seasonsArray: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
          seasonNumber,
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
          expanded: false,
        }));
        
        setSeasons(seasonsArray);
        setIsFetchingEpisodes(false);
        setStep('selectEpisodes');
      } else {
        // No database episodes yet - fetch from Trakt and map them
        console.log('No database episodes found, fetching from Trakt');
        
        const seasonMap = new Map<number, Episode[]>();
        
        for (const season of seasonsData) {
          if (season.number === 0) continue;
          
          const episodesData = await getSeasonEpisodes(traktShow.ids.trakt, season.number);
          
          for (const episode of episodesData) {
            const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
            
            if (!seasonMap.has(episode.season)) {
              seasonMap.set(episode.season, []);
            }
            seasonMap.get(episode.season)!.push(mappedEpisode);
          }
        }
        
        const seasonsArray: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
          seasonNumber,
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
          expanded: false,
        }));
        
        setSeasons(seasonsArray);
        setIsFetchingEpisodes(false);
        setStep('selectEpisodes');
      }
    } catch (error) {
      console.error('Error loading data for preselected show:', error);
      setIsFetchingEpisodes(false);
      setStep('selectShow'); // Fall back to show selection
    }
  };

  useEffect(() => {
    if (step === 'selectShow' && visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [step, visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setShowSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchShows(searchQuery);
        const { mapTraktShowToShow } = await import('@/services/showMappers');
        const mappedShows = results.map(result => ({
          show: mapTraktShowToShow(result.show, null),
          traktShow: result.show
        }));
        setShowSearchResults(mappedShows);
        setIsSearching(false);
      } catch (error) {
        console.error('Error searching shows:', error);
        setSearchError('Failed to search shows. Please try again.');
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleShowSelect = async (show: Show, traktShow: TraktShow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShow(show);
    setSelectedTraktShow(traktShow);
    setIsFetchingEpisodes(true);
    
    try {
      const traktId = traktShow.ids.trakt;

      const seasonsData = await getShowSeasons(traktId);
      const { mapTraktEpisodeToEpisode } = await import('@/services/showMappers');
      
      const seasonMap = new Map<number, Episode[]>();
      const traktEpsMap = new Map<string, TraktEpisode>();
      
      for (const season of seasonsData) {
        if (season.number === 0) continue;
        
        const episodesData = await getSeasonEpisodes(traktId, season.number);
        
        for (const episode of episodesData) {
          if (!seasonMap.has(episode.season)) {
            seasonMap.set(episode.season, []);
          }
          const mappedEpisode = mapTraktEpisodeToEpisode(episode, show.id, null);
          // Use deterministic key format for consistent lookups
          const episodeKey = `${show.id}-${episode.season}-${episode.number}`;
          traktEpsMap.set(episodeKey, episode);
          seasonMap.get(episode.season)!.push(mappedEpisode);
        }
      }

      const seasonsArray: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
        expanded: false,
      }));

      setSeasons(seasonsArray);
      setTraktEpisodesMap(traktEpsMap);
      setIsFetchingEpisodes(false);
      setStep('selectEpisodes');
    } catch (error) {
      console.error('Error fetching episodes:', error);
      setIsFetchingEpisodes(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeasons(seasons.map(season => 
      season.seasonNumber === seasonNumber 
        ? { ...season, expanded: !season.expanded }
        : season
    ));
  };

  const handleEpisodeToggle = (episode: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEpisodes(prev => {
      const isSelected = prev.some(ep => ep.id === episode.id);
      if (isSelected) {
        return prev.filter(ep => ep.id !== episode.id);
      } else {
        return [...prev, episode];
      }
    });
  };

  const handleTagToggle = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleAddCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedTags([...selectedTags, trimmedTag]);
      setCustomTag('');
      setTimeout(() => {
        customTagInputRef.current?.focus();
      }, 100);
    }
  };

  const handlePost = async () => {
    if (!selectedShow || !postBody.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsPosting(true);
    
    try {
      let dbShow: Awaited<ReturnType<typeof saveShow>> | undefined;
      let dbEpisodes: Episode[] = [];

      if (selectedTraktShow) {
        dbShow = await saveShow(selectedTraktShow);
        const { mapDatabaseShowToShow, mapDatabaseEpisodeToEpisode } = await import('@/services/showMappers');
        const showForPost = mapDatabaseShowToShow(dbShow);

        if (selectedEpisodes.length > 0 && dbShow) {
          const validationErrors: string[] = [];
          
          for (const episode of selectedEpisodes) {
            const episodeKey = getEpisodeKey(episode);
            const traktEpisode = traktEpisodesMap.get(episodeKey);
            
            if (!traktEpisode) {
              validationErrors.push(`Missing data for ${episode.title}`);
              continue;
            }

            if (!traktEpisode.season || !traktEpisode.number || !traktEpisode.title || !traktEpisode.ids?.trakt) {
              validationErrors.push(`Incomplete metadata for ${episode.title} (S${episode.seasonNumber}E${episode.episodeNumber})`);
            }
          }

          if (validationErrors.length > 0) {
            console.error('Episode validation failed:', validationErrors);
            Alert.alert(
              'Episode Data Incomplete',
              `Cannot post due to missing episode information:\n${validationErrors.join('\n')}\n\nThis may happen with specials or unaired episodes. Please try selecting different episodes.`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }

          const savedEpisodes = await Promise.allSettled(
            selectedEpisodes.map(async (episode) => {
              const episodeKey = getEpisodeKey(episode);
              const traktEpisode = traktEpisodesMap.get(episodeKey)!;

              const dbEpisode = await saveEpisode(
                dbShow.id,
                dbShow.tvmaze_id,
                {
                  ids: traktEpisode.ids,
                  season: traktEpisode.season,
                  number: traktEpisode.number,
                  title: traktEpisode.title,
                  overview: traktEpisode.overview || '',
                  rating: traktEpisode.rating || 0,
                }
              );
              return dbEpisode;
            })
          );

          const failedSaves = savedEpisodes.filter(result => result.status === 'rejected' || result.value === null);
          if (failedSaves.length > 0) {
            console.error('Failed to save episodes:', failedSaves);
            Alert.alert(
              'Save Failed',
              `Failed to save ${failedSaves.length} of ${selectedEpisodes.length} episodes. Please try again.`,
              [{ text: 'OK' }]
            );
            setIsPosting(false);
            return;
          }

          dbEpisodes = savedEpisodes
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => mapDatabaseEpisodeToEpisode((result as PromiseFulfilledResult<any>).value));
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newPost = await createPost({
          user: currentUser,
          show: showForPost,
          episodes: dbEpisodes.length > 0 ? dbEpisodes : undefined,
          title: postTitle.trim() || undefined,
          body: postBody.trim(),
          rating: rating > 0 ? rating : undefined,
          tags: selectedTags,
          isSpoiler: selectedTags.some(tag => tag.toLowerCase().includes('spoiler')),
        });

        console.log('Post created successfully');
        
        if (onPostSuccess) {
          onPostSuccess(newPost.id, dbEpisodes);
        }
        
        resetModal();
        onClose();
      } else {
        console.error('No Trakt show data available');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPosting(false);
    }
  };

  const resetModal = () => {
    setStep('selectShow');
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes([]);
    setPostTitle('');
    setPostBody('');
    setRating(0);
    setSelectedTags([]);
    setCustomTag('');
    setSearchQuery('');
    setSeasons([]);
    setShowSearchResults([]);
    setIsSearching(false);
    setSearchError(null);
    setIsFetchingEpisodes(false);
    setIsPosting(false);
    setSelectedTraktShow(null);
    setTraktEpisodesMap(new Map());
  };

  const renderSelectShow = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select a Show</Text>
        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#999999" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search shows..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView style={styles.showsList} showsVerticalScrollIndicator={false}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}
          {searchError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
              <Pressable style={styles.retryButton} onPress={() => setSearchQuery(searchQuery + ' ')}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() === '' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start typing to search for shows</Text>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length === 0 && searchQuery.trim() !== '' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No shows found</Text>
            </View>
          )}
          {!isSearching && !searchError && showSearchResults.length > 0 && (
            <View style={styles.showsGrid}>
              {showSearchResults.map(result => (
                <Pressable
                  key={result.show.id}
                  style={styles.showGridItem}
                  onPress={() => handleShowSelect(result.show, result.traktShow)}
                >
                  <Image 
                    source={{ uri: getPosterUrl(result.show.poster, result.show.title) }} 
                    style={styles.showGridPoster}
                    contentFit="cover"
                  />
                  <Pressable 
                    style={({ pressed }) => [
                      styles.saveIconGrid,
                      pressed && styles.saveIconPressed,
                    ]} 
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedShowForPlaylist(result.show);
                      setPlaylistModalVisible(true);
                    }}
                  >
                    <IconSymbol 
                      name={isShowSaved(result.show.id) ? "bookmark.fill" : "bookmark"} 
                      size={14} 
                      color={colors.pureWhite} 
                    />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderSelectEpisodes = () => (
    <View style={styles.stepContainer}>
      {!preselectedShow && (
        <Pressable style={styles.backButton} onPress={() => setStep('selectShow')}>
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      )}
      <Text style={styles.stepTitle}>Select Episodes (Optional)</Text>
      <Text style={styles.stepSubtitle}>{selectedShow?.title}</Text>
      <ScrollView style={styles.episodesList} showsVerticalScrollIndicator={false}>
        {seasons.map(season => (
          <View key={season.seasonNumber} style={styles.seasonContainer}>
            <Pressable
              style={styles.seasonHeader}
              onPress={() => toggleSeason(season.seasonNumber)}
            >
              <Text style={styles.seasonTitle}>Season {season.seasonNumber}</Text>
              <IconSymbol
                name={season.expanded ? 'chevron.up' : 'chevron.down'}
                size={20}
                color={colors.text}
              />
            </Pressable>
            {season.expanded && (
              <View style={styles.episodesContainer}>
                {season.episodes.map(episode => {
                  const isSelected = selectedEpisodes.some(ep => ep.id === episode.id);
                  return (
                    <Pressable
                      key={episode.id}
                      style={[styles.episodeItem, isSelected && styles.episodeItemSelected]}
                      onPress={() => handleEpisodeToggle(episode)}
                    >
                      <View style={styles.episodeInfo}>
                        <Text style={styles.episodeNumber}>
                          E{episode.episodeNumber}
                        </Text>
                        <View style={styles.episodeDetails}>
                          <Text style={styles.episodeTitle}>{episode.title}</Text>
                          <Text style={styles.episodeDescription} numberOfLines={2}>
                            {episode.description}
                          </Text>
                        </View>
                      </View>
                      <IconSymbol
                        name={isSelected ? 'checkmark.circle.fill' : 'circle'}
                        size={24}
                        color={isSelected ? colors.accent : colors.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <Pressable
        style={styles.continueButton}
        onPress={() => setStep('postDetails')}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </Pressable>
    </View>
  );

  const renderPostDetails = () => (
    <View style={styles.stepContainer}>
      <Pressable style={styles.backButton} onPress={() => setStep('selectEpisodes')}>
        <IconSymbol name="chevron.left" size={20} color={colors.text} />
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
      <Text style={styles.stepTitle}>Post Details</Text>
      <ScrollView style={styles.detailsForm} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.titleInput}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textSecondary}
          value={postTitle}
          onChangeText={setPostTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="What did you think?"
          placeholderTextColor={colors.textSecondary}
          value={postBody}
          onChangeText={setPostBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        
        <View style={styles.ratingSection}>
          <Text style={styles.sectionLabel}>Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRating(star);
                }}
              >
                <IconSymbol
                  name={star <= rating ? 'star.fill' : 'star'}
                  size={32}
                  color={star <= rating ? '#8bfc76' : colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.tagsSection}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tagsContainer}>
            {['Fan Theory', 'Discussion', 'Spoiler Alert', 'Episode Recap', 'Misc'].map(tag => (
              <Pressable
                key={tag}
                style={[
                  styles.tagButton,
                  selectedTags.includes(tag) && styles.tagButtonSelected,
                ]}
                onPress={() => handleTagToggle(tag)}
              >
                <Text
                  style={[
                    styles.tagButtonText,
                    selectedTags.includes(tag) && styles.tagButtonTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
          
          {selectedTags.filter(tag => !['Fan Theory', 'Discussion', 'Spoiler Alert', 'Episode Recap', 'Misc'].includes(tag)).length > 0 && (
            <View style={styles.customTagsList}>
              {selectedTags.filter(tag => !['Fan Theory', 'Discussion', 'Spoiler Alert', 'Episode Recap', 'Misc'].includes(tag)).map((tag, index) => (
                <View key={index} style={styles.customTagChip}>
                  <Text style={styles.customTagChipText}>{tag}</Text>
                  <Pressable onPress={() => handleTagToggle(tag)}>
                    <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.customTagContainer}>
            <TextInput
              ref={customTagInputRef}
              style={styles.customTagInput}
              placeholder="Add custom tag"
              placeholderTextColor={colors.textSecondary}
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={handleAddCustomTag}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.addTagButton, !customTag.trim() && styles.addTagButtonDisabled]}
              onPress={handleAddCustomTag}
              disabled={!customTag.trim()}
            >
              <IconSymbol name="plus" size={20} color={customTag.trim() ? '#000000' : colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <Pressable
        style={[styles.postButton, (!postBody.trim() || isPosting) && styles.postButtonDisabled]}
        onPress={handlePost}
        disabled={!postBody.trim() || isPosting}
      >
        {isPosting ? (
          <ActivityIndicator color={tokens.colors.black} />
        ) : (
          <Text style={styles.postButtonText}>Post</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {step === 'selectShow' && renderSelectShow()}
          {step === 'selectEpisodes' && renderSelectEpisodes()}
          {step === 'postDetails' && renderPostDetails()}
        </Animated.View>
      </Animated.View>
      
      {selectedShowForPlaylist && (
        <PlaylistModal
          visible={playlistModalVisible}
          onClose={() => {
            setPlaylistModalVisible(false);
            setSelectedShowForPlaylist(null);
          }}
          show={selectedShowForPlaylist}
          onAddToPlaylist={() => {}}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    width: 440,
    height: 780,
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 24,
    paddingLeft: 24,
    paddingBottom: 24,
    paddingRight: 24,
    alignSelf: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    marginBottom: 16,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.gapLarge,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapLarge,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  searchInputContainer: {
    flexDirection: 'row',
    width: 392,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.subtitle,
    fontSize: 16,
    color: tokens.colors.black,
  },
  showsList: {
    flex: 1,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -3.5,
    marginRight: -3.5,
  },
  showGridItem: {
    position: 'relative',
    width: 126,
    height: 172,
    marginLeft: 3.5,
    marginRight: 3.5,
    marginBottom: 7,
  },
  showGridPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  saveIconGrid: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  showGridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  episodesList: {
    flex: 1,
  },
  seasonContainer: {
    marginBottom: spacing.gapLarge,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapLarge,
    borderRadius: components.borderRadiusButton,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  episodesContainer: {
    marginTop: spacing.gapSmall,
    gap: spacing.gapSmall,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapMedium,
    borderRadius: components.borderRadiusButton,
  },
  episodeItemSelected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  episodeInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.gapMedium,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  continueButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    padding: spacing.gapLarge,
    alignItems: 'center',
    marginTop: spacing.gapLarge,
  },
  continueButtonText: {
    ...tokens.typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  detailsForm: {
    flex: 1,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapLarge,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.gapMedium,
  },
  bodyInput: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapLarge,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.gapLarge,
    minHeight: 120,
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.gapMedium,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.gapSmall,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapMedium,
  },
  tagButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.gapLarge,
    paddingVertical: spacing.gapSmall,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  tagButtonSelected: {
    backgroundColor: tokens.colors.greenHighlight,
    borderColor: tokens.colors.greenHighlight,
  },
  tagButtonText: {
    ...tokens.typography.p1B,
    fontSize: 14,
    color: colors.text,
  },
  tagButtonTextSelected: {
    color: tokens.colors.black,
  },
  customTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gapSmall,
    marginBottom: spacing.gapMedium,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.gapMedium,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  customTagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: spacing.gapMedium,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusButton,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    padding: spacing.gapMedium,
    fontSize: 14,
    color: colors.text,
  },
  addTagButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.5,
  },
  postButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    padding: spacing.gapLarge,
    alignItems: 'center',
    marginTop: spacing.gapLarge,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    ...tokens.typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: tokens.colors.greenHighlight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.black,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  showGridPosterPlaceholder: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showGridPosterText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
});
