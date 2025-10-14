
import React, { useState } from 'react';
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
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Show, Episode, PostTag } from '@/types';
import { mockShows, mockEpisodes } from '@/data/mockData';

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedShow?: Show;
}

type Step = 'selectShow' | 'selectEpisodes' | 'postDetails';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PostModal({ visible, onClose, preselectedShow }: PostModalProps) {
  const [step, setStep] = useState<Step>('selectShow');
  const [selectedShow, setSelectedShow] = useState<Show | null>(preselectedShow || null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Episode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const predefinedTags: PostTag[] = ['spoiler alert', 'fan theory', 'discussion', 'episode recap', 'misc'];

  const filteredShows = mockShows.filter((show) =>
    show.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShowSelect = (show: Show) => {
    setSelectedShow(show);
    setStep('selectEpisodes');
  };

  const handleEpisodeToggle = (episode: Episode) => {
    setSelectedEpisodes((prev) => {
      const exists = prev.find((e) => e.id === episode.id);
      if (exists) {
        return prev.filter((e) => e.id !== episode.id);
      }
      return [...prev, episode];
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handlePost = () => {
    console.log('Posting:', {
      show: selectedShow,
      episodes: selectedEpisodes,
      title,
      body,
      rating,
      tags: selectedTags,
    });
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setStep('selectShow');
    setSelectedShow(preselectedShow || null);
    setSelectedEpisodes([]);
    setSearchQuery('');
    setTitle('');
    setBody('');
    setRating(0);
    setSelectedTags([]);
    setCustomTag('');
  };

  const renderSelectShow = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select a Show</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search shows..."
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView style={styles.showList}>
        {filteredShows.map((show) => (
          <Pressable
            key={show.id}
            style={styles.showItem}
            onPress={() => handleShowSelect(show)}
          >
            <Image source={{ uri: show.poster }} style={styles.showPoster} />
            <View style={styles.showInfo}>
              <Text style={styles.showTitle}>{show.title}</Text>
              <Text style={styles.showMeta}>
                {show.totalSeasons} seasons • {show.totalEpisodes} episodes
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderSelectEpisodes = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Episodes (Optional)</Text>
      <Text style={styles.stepSubtitle}>{selectedShow?.title}</Text>
      <ScrollView style={styles.episodeList}>
        {mockEpisodes
          .filter((ep) => ep.showId === selectedShow?.id)
          .map((episode) => {
            const isSelected = selectedEpisodes.find((e) => e.id === episode.id);
            return (
              <Pressable
                key={episode.id}
                style={[styles.episodeItem, isSelected && styles.episodeItemSelected]}
                onPress={() => handleEpisodeToggle(episode)}
              >
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle}>
                    S{episode.seasonNumber}E{episode.episodeNumber}: {episode.title}
                  </Text>
                  <Text style={styles.episodeDescription} numberOfLines={2}>
                    {episode.description}
                  </Text>
                </View>
                {isSelected && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.secondary} />
                )}
              </Pressable>
            );
          })}
      </ScrollView>
      <Pressable style={styles.nextButton} onPress={() => setStep('postDetails')}>
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );

  const renderPostDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Post Details</Text>
      <ScrollView style={styles.detailsForm}>
        <TextInput
          style={styles.titleInput}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="What do you think?"
          placeholderTextColor={colors.textSecondary}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Rating</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <IconSymbol
                name={star <= rating ? 'star.fill' : 'star'}
                size={32}
                color={star <= rating ? colors.secondary : colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsContainer}>
          {predefinedTags.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.tagButton, selectedTags.includes(tag) && styles.tagButtonSelected]}
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

        <View style={styles.customTagContainer}>
          <TextInput
            style={styles.customTagInput}
            placeholder="Add custom tag"
            placeholderTextColor={colors.textSecondary}
            value={customTag}
            onChangeText={setCustomTag}
          />
          <Pressable style={styles.addTagButton} onPress={handleAddCustomTag}>
            <IconSymbol name="plus" size={20} color={colors.background} />
          </Pressable>
        </View>

        {selectedTags.filter((tag) => !predefinedTags.includes(tag as PostTag)).length > 0 && (
          <View style={styles.customTagsList}>
            {selectedTags
              .filter((tag) => !predefinedTags.includes(tag as PostTag))
              .map((tag, index) => (
                <View key={index} style={styles.customTagChip}>
                  <Text style={styles.customTagChipText}>{tag}</Text>
                  <Pressable onPress={() => handleTagToggle(tag)}>
                    <IconSymbol name="xmark" size={14} color={colors.text} />
                  </Pressable>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.postButton} onPress={handlePost}>
        <Text style={styles.postButtonText}>Post</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={{ width: 24 }} />
        </View>

        {step === 'selectShow' && !preselectedShow && renderSelectShow()}
        {step === 'selectEpisodes' && renderSelectEpisodes()}
        {step === 'postDetails' && renderPostDetails()}
        {preselectedShow && step === 'selectShow' && renderSelectEpisodes()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
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
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  showList: {
    flex: 1,
  },
  showItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  showPoster: {
    width: 60,
    height: 90,
    borderRadius: 4,
    marginRight: 12,
  },
  showInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  showMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  episodeList: {
    flex: 1,
  },
  episodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  episodeItemSelected: {
    backgroundColor: colors.highlight,
  },
  episodeInfo: {
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
  nextButton: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detailsForm: {
    flex: 1,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  bodyInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagButtonSelected: {
    backgroundColor: colors.highlight,
    borderColor: colors.secondary,
  },
  tagButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  tagButtonTextSelected: {
    fontWeight: '600',
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  addTagButton: {
    backgroundColor: colors.text,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.highlight,
  },
  customTagChipText: {
    fontSize: 14,
    color: colors.text,
  },
  postButton: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
