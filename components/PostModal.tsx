
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { mockShows, mockEpisodes } from '@/data/mockData';
import { colors, spacing, components } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show, Episode, PostTag } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { useData } from '@/contexts/DataContext';

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedShow?: Show;
  preselectedEpisode?: Episode;
}

type Step = 'selectShow' | 'selectEpisodes' | 'postDetails';

interface Season {
  seasonNumber: number;
  episodes: Episode[];
  expanded: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PostModal({ visible, onClose, preselectedShow, preselectedEpisode }: PostModalProps) {
  const { createPost, currentUser } = useData();
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

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const customTagInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && preselectedShow) {
      setSelectedShow(preselectedShow);
      
      const showEpisodes = mockEpisodes.filter(ep => ep.showId === preselectedShow.id);
      const seasonMap = new Map<number, Episode[]>();
      
      showEpisodes.forEach(episode => {
        if (!seasonMap.has(episode.seasonNumber)) {
          seasonMap.set(episode.seasonNumber, []);
        }
        seasonMap.get(episode.seasonNumber)!.push(episode);
      });

      const seasonsData: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
        seasonNumber,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
        expanded: preselectedEpisode ? preselectedEpisode.seasonNumber === seasonNumber : false,
      }));

      setSeasons(seasonsData);

      if (preselectedEpisode) {
        setSelectedEpisodes([preselectedEpisode]);
        setStep('selectEpisodes');
      } else {
        setStep('selectEpisodes');
      }
    } else if (visible && !preselectedShow) {
      setStep('selectShow');
    }
  }, [visible, preselectedShow, preselectedEpisode]);

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

  const handleShowSelect = (show: Show) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShow(show);
    
    const showEpisodes = mockEpisodes.filter(ep => ep.showId === show.id);
    const seasonMap = new Map<number, Episode[]>();
    
    showEpisodes.forEach(episode => {
      if (!seasonMap.has(episode.seasonNumber)) {
        seasonMap.set(episode.seasonNumber, []);
      }
      seasonMap.get(episode.seasonNumber)!.push(episode);
    });

    const seasonsData: Season[] = Array.from(seasonMap.entries()).map(([seasonNumber, episodes]) => ({
      seasonNumber,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
      expanded: false,
    }));

    setSeasons(seasonsData);
    setStep('selectEpisodes');
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      await createPost({
        user: currentUser,
        show: selectedShow,
        episodes: selectedEpisodes.length > 0 ? selectedEpisodes : undefined,
        title: postTitle.trim() || undefined,
        body: postBody.trim(),
        rating: rating > 0 ? rating : undefined,
        tags: selectedTags,
        isSpoiler: selectedTags.some(tag => tag.toLowerCase().includes('spoiler')),
      });

      console.log('Post created successfully');
      resetModal();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
  };

  const renderSelectShow = () => {
    const filteredShows = mockShows.filter(show =>
      show.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
          <View style={styles.showsGrid}>
            {filteredShows.map(show => (
              <Pressable
                key={show.id}
                style={styles.showGridItem}
                onPress={() => handleShowSelect(show)}
              >
                <Image source={{ uri: show.poster }} style={styles.showGridPoster} />
              </Pressable>
            ))}
          </View>
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
                  color={star <= rating ? '#FFD700' : colors.textSecondary}
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
        style={[styles.postButton, !postBody.trim() && styles.postButtonDisabled]}
        onPress={handlePost}
        disabled={!postBody.trim()}
      >
        <Text style={styles.postButtonText}>Post</Text>
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
});
