
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
import { colors } from '@/styles/commonStyles';
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

  // Handle preselected show and episode
  useEffect(() => {
    if (visible && preselectedShow) {
      setSelectedShow(preselectedShow);
      
      // Get episodes for this show and organize by season
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

      // If there's a preselected episode, skip to episode selection with it selected
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
      // Slide up and fade in
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
      // Slide down and fade out
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
    
    // Get episodes for this show and organize by season
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
      // Refocus the input after adding tag
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
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search shows..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView style={styles.showsList} showsVerticalScrollIndicator={false}>
          <View style={styles.showsGrid}>
            {filteredShows.map(show => (
              <Pressable
                key={show.id}
                style={styles.showGridItem}
                onPress={() => handleShowSelect(show)}
              >
                <Image source={{ uri: show.poster }} style={styles.showGridPoster} />
                <Text style={styles.showGridTitle} numberOfLines={2}>
                  {show.title}
                </Text>
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
                        color={isSelected ? colors.secondary : colors.textSecondary}
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
        
        {/* Rating */}
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

        {/* Tags */}
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
          
          {/* Display selected custom tags */}
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
              <IconSymbol name="plus" size={20} color={customTag.trim() ? colors.text : colors.textSecondary} />
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
          <View style={styles.header}>
            <View style={styles.handle} />
            <Pressable style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </Pressable>
          </View>
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  showsList: {
    flex: 1,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  showGridItem: {
    width: '31%',
    marginBottom: 16,
  },
  showGridPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    marginBottom: 8,
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
    marginBottom: 16,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  episodesContainer: {
    marginTop: 8,
    gap: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  episodeItemSelected: {
    backgroundColor: colors.purpleLight,
    borderWidth: 1,
    borderColor: colors.purple,
  },
  episodeInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  detailsForm: {
    flex: 1,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  bodyInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    minHeight: 120,
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tagButtonTextSelected: {
    color: colors.background,
  },
  customTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customTagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  addTagButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.5,
  },
  postButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
