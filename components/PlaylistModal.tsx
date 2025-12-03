
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
  Keyboard,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show } from '@/types';
import { useData } from '@/contexts/DataContext';
import { ensureShowUuid } from '@/services/showDatabase';
import { TraktShow } from '@/services/trakt';

interface PlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  show: Show;
  traktShow?: TraktShow;
  onAddToPlaylist?: (playlistId: string, showId: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PlaylistModal({ visible, onClose, show, traktShow, onAddToPlaylist }: PlaylistModalProps) {
  const { playlists, createPlaylist, addShowToPlaylist, removeShowFromPlaylist, isShowInPlaylist, recordTraktIdMapping } = useData();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ensuredShowUuid, setEnsuredShowUuid] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const requestTokenRef = useRef<number>(0);

  // Ensure we have the database UUID for UI state checks
  useEffect(() => {
    if (visible && show) {
      // Clear previous UUID and increment token to invalidate any in-flight requests
      setEnsuredShowUuid(null);
      requestTokenRef.current += 1;
      const currentToken = requestTokenRef.current;
      
      ensureShowUuid(show, traktShow)
        .then(uuid => {
          // Only update if this request is still current (prevent race conditions)
          if (requestTokenRef.current === currentToken) {
            setEnsuredShowUuid(uuid);
            console.log('✅ Pre-fetched show UUID for UI state:', uuid);
            // Record the Trakt ID -> UUID mapping for bookmark state
            if (show.traktId || traktShow?.ids?.trakt) {
              const traktId = show.traktId || traktShow!.ids.trakt;
              recordTraktIdMapping(traktId, uuid);
            }
          } else {
            console.log('⚠️ Discarding stale UUID fetch (request token mismatch)');
          }
        })
        .catch(error => {
          if (requestTokenRef.current === currentToken) {
            console.error('⚠️ Could not pre-fetch show UUID, interactions disabled:', error);
            // Keep ensuredShowUuid as null to maintain disabled state
            // This ensures we never use incorrect IDs for playlist operations
            setEnsuredShowUuid(null);
          }
        });
      
      // Cleanup: invalidate this request if component unmounts or deps change
      return () => {
        if (requestTokenRef.current === currentToken) {
          requestTokenRef.current += 1;
        }
      };
    } else {
      setEnsuredShowUuid(null);
    }
  }, [visible, show, traktShow]);

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
  }, [visible, fadeAnim, slideAnim]);

  // Keyboard listener for proper keyboard avoidance
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        Animated.timing(keyboardAnim, {
          toValue: height,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardAnim]);

  const showSuccessAnimation = (message: string) => {
    setSuccessMessage(message);
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

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        // Create empty playlist first
        const newPlaylist = await createPlaylist(newPlaylistName);
        console.log(`Created new playlist "${newPlaylist.name}"`);
        
        // Then try to add the show if we have a valid UUID
        if (ensuredShowUuid) {
          const traktId = show.traktId || traktShow?.ids?.trakt;
          await addShowToPlaylist(newPlaylist.id, ensuredShowUuid, traktId);
          console.log(`Added ${show.title} to ${newPlaylist.name}`);
          
          // Call the callback if provided
          if (onAddToPlaylist) {
            onAddToPlaylist(newPlaylist.id, ensuredShowUuid);
          }
        }
        
        // Show success animation
        showSuccessAnimation(ensuredShowUuid ? 'Added to playlist!' : 'Playlist created!');
        
        // Reset the input and close the modal after a brief delay
        setNewPlaylistName('');
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (error) {
        console.error('Error creating playlist:', error);
        showSuccessAnimation('Failed to create playlist');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleTogglePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(pl => pl.id === playlistId);
    
    try {
      // Ensure we have a valid database UUID for the show
      const showIdToUse = await ensureShowUuid(show, traktShow);
      console.log('✅ Ensured show has database UUID:', showIdToUse);
      
      // Check if show is already in the playlist
      if (isShowInPlaylist(playlistId, showIdToUse)) {
        // Remove from playlist
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        await removeShowFromPlaylist(playlistId, showIdToUse);
        console.log(`Removed ${show.title} from ${playlist?.name}`);
        
        // Show success animation
        showSuccessAnimation('Removed from playlist!');
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        // Add to playlist
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const traktId = show.traktId || traktShow?.ids?.trakt;
        await addShowToPlaylist(playlistId, showIdToUse, traktId);
        console.log(`Added ${show.title} to ${playlist?.name}`);
        
        // Call the callback if provided
        if (onAddToPlaylist) {
          onAddToPlaylist(playlistId, showIdToUse);
        }
        
        // Show success animation
        showSuccessAnimation('Added to playlist!');
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error toggling playlist:', error);
      showSuccessAnimation('Failed to update playlist');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const resetModal = () => {
    setNewPlaylistName('');
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
              marginBottom: keyboardAnim.interpolate({
                inputRange: [0, 20, 400],
                outputRange: [0, 0, 380],
                extrapolate: 'clamp',
              }),
              paddingBottom: keyboardAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [40, 60],
                extrapolate: 'clamp',
              }),
            }
          ]}
        >
          {/* Success Indicator */}
          {showSuccess ? (
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
              <IconSymbol name="checkmark.circle.fill" size={24} color={tokens.colors.tabStroke3} />
              <Text style={styles.successText}>{successMessage}</Text>
            </Animated.View>
          ) : null}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Add to Playlist</Text>
            <Text style={styles.subtitle}>{show.title}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Create New Playlist - Always visible at top */}
            <View style={styles.createContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Create new playlist"
                placeholderTextColor={tokens.colors.grey1}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                returnKeyType="done"
                onSubmitEditing={handleCreatePlaylist}
                blurOnSubmit={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  !newPlaylistName.trim() && styles.createButtonDisabled,
                  pressed && newPlaylistName.trim() && styles.createButtonPressed,
                ]}
                onPress={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              >
                <IconSymbol name="plus" size={20} color={tokens.colors.black} />
              </Pressable>
            </View>

            {/* Existing Playlists */}
            <View style={styles.playlistsContainer}>
              {playlists.map((playlist) => {
                // Only check state once UUID is ready to avoid incorrect initial state
                const isShowInList = ensuredShowUuid ? isShowInPlaylist(playlist.id, ensuredShowUuid) : false;
                const isLoading = !ensuredShowUuid;
                return (
                  <Pressable
                    key={playlist.id}
                    style={({ pressed }) => [
                      styles.playlistItem,
                      pressed && !isLoading && styles.playlistItemPressed,
                      isShowInList && styles.playlistItemAdded,
                      isLoading && styles.playlistItemDisabled,
                    ]}
                    onPress={() => !isLoading && handleTogglePlaylist(playlist.id)}
                    disabled={isLoading}
                  >
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      <Text style={styles.playlistCount}>
                        {playlist.showCount} show{playlist.showCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <IconSymbol 
                      name={isShowInList ? "checkmark.circle.fill" : "plus"} 
                      size={20} 
                      color={isShowInList ? tokens.colors.tabStroke3 : tokens.colors.grey1} 
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
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  successBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: tokens.colors.tabBack3,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: tokens.colors.tabStroke3,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.tabStroke3,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.grey2,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: tokens.colors.grey2,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    ...tokens.typography.titleL,
    color: tokens.colors.black,
    marginBottom: 4,
  },
  subtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
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
    backgroundColor: tokens.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: tokens.colors.black,
    borderWidth: 1,
    borderColor: tokens.colors.inputStroke,
  },
  createButton: {
    backgroundColor: tokens.colors.greenHighlight,
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
  playlistsContainer: {
    gap: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.colors.grey2,
  },
  playlistItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  playlistItemAdded: {
    backgroundColor: tokens.colors.tabBack2,
    borderWidth: 1,
    borderColor: tokens.colors.tabStroke2,
  },
  playlistItemDisabled: {
    opacity: 0.5,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    marginBottom: 4,
  },
  playlistCount: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
});
