
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Show } from '@/types';

interface WatchlistModalProps {
  visible: boolean;
  onClose: () => void;
  show: Show;
  onAddToWatchlist?: (watchlistId: string, showId: string) => void;
}

interface Watchlist {
  id: string;
  name: string;
  shows: string[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Initial watchlist with only "Shows to Watch" starting with 0 shows
const initialWatchlists: Watchlist[] = [
  { id: 'wl-default', name: 'Shows to Watch', shows: [] },
];

export default function WatchlistModal({ visible, onClose, show, onAddToWatchlist }: WatchlistModalProps) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(initialWatchlists);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);

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
      ]).start(() => {
        // Auto-focus the input after animation completes
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });
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
  }, [visible]);

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccess(false);
    });
  };

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newWatchlist: Watchlist = {
        id: `wl-${Date.now()}`,
        name: newWatchlistName.trim(),
        shows: [show.id], // Automatically add the show to the new watchlist
      };
      
      setWatchlists([...watchlists, newWatchlist]);
      console.log(`Created new watchlist "${newWatchlist.name}" and added ${show.title}`);
      
      // Call the callback if provided
      if (onAddToWatchlist) {
        onAddToWatchlist(newWatchlist.id, show.id);
      }
      
      // Show success animation
      showSuccessAnimation();
      
      // Reset the input and close the modal after a brief delay
      setNewWatchlistName('');
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleAddToWatchlist = (watchlistId: string) => {
    const watchlist = watchlists.find(wl => wl.id === watchlistId);
    
    // Check if show is already in the watchlist
    if (watchlist && watchlist.shows.includes(show.id)) {
      console.log(`${show.title} is already in ${watchlist.name}`);
      // Haptic feedback for already added
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onClose();
      return;
    }
    
    // Haptic feedback for success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Update the watchlist to include the show
    setWatchlists(prevWatchlists => 
      prevWatchlists.map(wl => 
        wl.id === watchlistId 
          ? { ...wl, shows: [...wl.shows, show.id] }
          : wl
      )
    );
    
    console.log(`Added ${show.title} to ${watchlist?.name}`);
    
    // Call the callback if provided
    if (onAddToWatchlist) {
      onAddToWatchlist(watchlistId, show.id);
    }
    
    // Show success animation
    showSuccessAnimation();
    
    // Close modal after brief delay
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const resetModal = () => {
    setNewWatchlistName('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Pressable style={styles.overlayTouchable} onPress={handleClose} />
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Success Indicator */}
          {showSuccess && (
            <Animated.View 
              style={[
                styles.successBanner,
                {
                  opacity: successAnim,
                  transform: [{
                    translateY: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 0],
                    }),
                  }],
                }
              ]}
            >
              <IconSymbol name="checkmark.circle.fill" size={24} color="#10B981" />
              <Text style={styles.successText}>Added to watchlist!</Text>
            </Animated.View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Add to Watchlist</Text>
            <Text style={styles.subtitle}>{show.title}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Create New Watchlist - Always visible at top */}
            <View style={styles.createContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Create new list"
                placeholderTextColor={colors.textSecondary}
                value={newWatchlistName}
                onChangeText={setNewWatchlistName}
                returnKeyType="done"
                onSubmitEditing={handleCreateWatchlist}
                blurOnSubmit={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  !newWatchlistName.trim() && styles.createButtonDisabled,
                  pressed && newWatchlistName.trim() && styles.createButtonPressed,
                ]}
                onPress={handleCreateWatchlist}
                disabled={!newWatchlistName.trim()}
              >
                <IconSymbol name="plus" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Existing Watchlists */}
            <View style={styles.watchlistsContainer}>
              {watchlists.map((watchlist) => {
                const isShowInList = watchlist.shows.includes(show.id);
                return (
                  <Pressable
                    key={watchlist.id}
                    style={({ pressed }) => [
                      styles.watchlistItem,
                      pressed && styles.watchlistItemPressed,
                      isShowInList && styles.watchlistItemAdded,
                    ]}
                    onPress={() => handleAddToWatchlist(watchlist.id)}
                  >
                    <View style={styles.watchlistInfo}>
                      <Text style={styles.watchlistName}>{watchlist.name}</Text>
                      <Text style={styles.watchlistCount}>
                        {watchlist.shows.length} show{watchlist.shows.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <IconSymbol 
                      name={isShowInList ? "checkmark.circle.fill" : "plus"} 
                      size={20} 
                      color={isShowInList ? colors.secondary : colors.textSecondary} 
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 40,
  },
  successBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  createContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  watchlistsContainer: {
    gap: 12,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  watchlistItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  watchlistItemAdded: {
    backgroundColor: colors.purpleLight,
    borderWidth: 1,
    borderColor: colors.purple,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  watchlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
