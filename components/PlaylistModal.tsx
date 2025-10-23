
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
import tokens from '@/styles/tokens';
import { Show } from '@/types';
import { useData } from '@/contexts/DataContext';

interface PlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  show: Show;
  onAddToPlaylist?: (playlistId: string, showId: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PlaylistModal({ visible, onClose, show, onAddToPlaylist }: PlaylistModalProps) {
  const { playlists, createPlaylist, addShowToPlaylist, removeShowFromPlaylist, isShowInPlaylist } = useData();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
  }, [visible, fadeAnim, slideAnim]);

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
        // Create playlist with the show automatically added
        const newPlaylist = await createPlaylist(newPlaylistName, show.id);
        console.log(`Created new playlist "${newPlaylist.name}" and added ${show.title}`);
        
        // Call the callback if provided
        if (onAddToPlaylist) {
          onAddToPlaylist(newPlaylist.id, show.id);
        }
        
        // Show success animation
        showSuccessAnimation('Added to playlist!');
        
        // Reset the input and close the modal after a brief delay
        setNewPlaylistName('');
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (error) {
        console.error('Error creating playlist:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleTogglePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(pl => pl.id === playlistId);
    
    // Check if show is already in the playlist
    if (isShowInPlaylist(playlistId, show.id)) {
      // Remove from playlist
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      try {
        await removeShowFromPlaylist(playlistId, show.id);
        console.log(`Removed ${show.title} from ${playlist?.name}`);
        
        // Show success animation
        showSuccessAnimation('Removed from playlist!');
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (error) {
        console.error('Error removing from playlist:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      // Add to playlist
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      try {
        await addShowToPlaylist(playlistId, show.id);
        console.log(`Added ${show.title} to ${playlist?.name}`);
        
        // Call the callback if provided
        if (onAddToPlaylist) {
          onAddToPlaylist(playlistId, show.id);
        }
        
        // Show success animation
        showSuccessAnimation('Added to playlist!');
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
      } catch (error) {
        console.error('Error adding to playlist:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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
              <IconSymbol name="checkmark.circle.fill" size={24} color={tokens.colors.tabStroke3} />
              <Text style={styles.successText}>{successMessage}</Text>
            </Animated.View>
          )}

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
                placeholderTextColor={colors.textSecondary}
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
                <IconSymbol name="plus" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Existing Playlists */}
            <View style={styles.playlistsContainer}>
              {playlists.map((playlist) => {
                const isShowInList = isShowInPlaylist(playlist.id, show.id);
                return (
                  <Pressable
                    key={playlist.id}
                    style={({ pressed }) => [
                      styles.playlistItem,
                      pressed && styles.playlistItemPressed,
                      isShowInList && styles.playlistItemAdded,
                    ]}
                    onPress={() => handleTogglePlaylist(playlist.id)}
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
  playlistsContainer: {
    gap: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  playlistItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  playlistItemAdded: {
    backgroundColor: colors.purpleLight,
    borderWidth: 1,
    borderColor: colors.purple,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
