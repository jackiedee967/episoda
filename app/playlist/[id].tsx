
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useData } from '@/contexts/DataContext';
import { mockShows, currentUser } from '@/data/mockData';
import { Show, Playlist } from '@/types';
import * as Haptics from 'expo-haptics';
import { Eye, EyeOff, Trash2 } from 'lucide-react-native';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { 
    playlists, 
    removeShowFromPlaylist, 
    deletePlaylist, 
    updatePlaylistPrivacy,
    loadPlaylists 
  } = useData();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistShows, setPlaylistShows] = useState<Show[]>([]);

  useEffect(() => {
    loadPlaylistData();
  }, [id, playlists]);

  const loadPlaylistData = () => {
    const foundPlaylist = playlists.find(p => p.id === id);
    if (foundPlaylist) {
      setPlaylist(foundPlaylist);
      
      // Get shows from mockShows that are in this playlist
      const shows = mockShows.filter(show => 
        foundPlaylist.shows?.includes(show.id)
      );
      setPlaylistShows(shows);
    }
  };

  const isOwnPlaylist = playlist?.userId === currentUser.id;

  const handleRemoveShow = async (showId: string) => {
    if (!playlist) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Remove Show',
      'Are you sure you want to remove this show from the playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeShowFromPlaylist(playlist.id, showId);
              await loadPlaylists();
              loadPlaylistData();
            } catch (error) {
              console.error('Error removing show:', error);
              Alert.alert('Error', 'Failed to remove show from playlist');
            }
          },
        },
      ]
    );
  };

  const handleDeletePlaylist = () => {
    if (!playlist) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
              router.back();
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const handleTogglePrivacy = async () => {
    if (!playlist) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await updatePlaylistPrivacy(playlist.id, !playlist.isPublic);
      await loadPlaylists();
      loadPlaylistData();
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert('Error', 'Failed to update playlist privacy');
    }
  };

  const handleSharePlaylist = async () => {
    if (!playlist) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await Share.share({
        message: `Check out my playlist "${playlist.name}" on Natively!`,
        title: playlist.name,
      });
    } catch (error) {
      console.error('Error sharing playlist:', error);
    }
  };

  const handleShowPress = (showId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/show/${showId}`);
  };

  if (!playlist) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Playlist',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[commonStyles.container, styles.emptyContainer]}>
          <Text style={styles.emptyText}>Playlist not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: playlist.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={commonStyles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Playlist Header */}
          <View style={styles.header}>
            <Text style={styles.playlistName}>{playlist.name}</Text>
            <Text style={styles.showCount}>
              {playlistShows.length} {playlistShows.length === 1 ? 'show' : 'shows'}
            </Text>

            {/* Action Buttons (only for own playlists) */}
            {isOwnPlaylist && (
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.actionButton}
                  onPress={handleTogglePrivacy}
                >
                  {playlist.isPublic ? (
                    <Eye size={20} color={colors.text} />
                  ) : (
                    <EyeOff size={20} color={colors.text} />
                  )}
                  <Text style={styles.actionButtonText}>
                    {playlist.isPublic ? 'Public' : 'Private'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionButton}
                  onPress={handleSharePlaylist}
                >
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.text} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDeletePlaylist}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Shows Grid */}
          {playlistShows.length > 0 ? (
            <View style={styles.showsGrid}>
              {playlistShows.map((show) => (
                <View key={show.id} style={styles.showItem}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.showPosterContainer,
                      pressed && styles.showPosterPressed,
                    ]}
                    onPress={() => handleShowPress(show.id)}
                  >
                    <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.showPoster} />
                    
                    {/* Remove button (only for own playlists) */}
                    {isOwnPlaylist && (
                      <Pressable
                        style={styles.removeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveShow(show.id);
                        }}
                      >
                        <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                      </Pressable>
                    )}
                  </Pressable>
                  <Text style={styles.showTitle} numberOfLines={2}>
                    {show.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="tv" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No shows yet</Text>
              <Text style={styles.emptyStateText}>
                {isOwnPlaylist
                  ? 'Add shows to this playlist to see them here'
                  : 'This playlist is empty'}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playlistName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  showCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  showItem: {
    width: 'calc(33.33% - 11px)',
  },
  showPosterContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  showPosterPressed: {
    opacity: 0.7,
  },
  showPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  showTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
