import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/IconSymbol';
import { useData } from '@/contexts/DataContext';
import { Show, Playlist } from '@/types';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import tokens from '@/styles/tokens';
import { useRouter } from 'expo-router';

interface PlaylistViewModalProps {
  visible: boolean;
  onClose: () => void;
  playlistId: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PlaylistViewModal({ visible, onClose, playlistId }: PlaylistViewModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    playlists, 
    removeShowFromPlaylist, 
    deletePlaylist,
    loadPlaylists 
  } = useData();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistShows, setPlaylistShows] = useState<Show[]>([]);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      loadPlaylistData();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (visible && playlistId) {
      loadPlaylistData();
    }
  }, [playlistId, playlists, visible]);

  const loadPlaylistData = async () => {
    const foundPlaylist = playlists.find(p => p.id === playlistId);
    if (foundPlaylist) {
      setPlaylist(foundPlaylist);
      
      setPlaylistShows([]);
      
      if (foundPlaylist.shows && foundPlaylist.shows.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validShowIds = foundPlaylist.shows.filter(showId => uuidRegex.test(showId));
        
        if (validShowIds.length > 0) {
          const { data: playlistShowsData, error: playlistShowsError } = await supabase
            .from('playlist_shows')
            .select('show_id, added_at')
            .eq('playlist_id', playlistId)
            .in('show_id', validShowIds)
            .order('added_at', { ascending: false });
          
          if (playlistShowsError) {
            console.error('❌ Error loading playlist_shows:', playlistShowsError);
            setPlaylistShows([]);
            return;
          }
          
          const { data: shows, error } = await supabase
            .from('shows')
            .select('*')
            .in('id', validShowIds);
          
          if (error) {
            console.error('❌ Error loading playlist shows:', error);
            setPlaylistShows([]);
          } else if (shows && playlistShowsData) {
            const addedAtMap = new Map(
              playlistShowsData.map(ps => [ps.show_id, ps.added_at])
            );
            
            const normalizedShows: Show[] = shows.map((show: any) => ({
              id: show.id,
              title: show.title,
              traktId: show.trakt_id,
              poster: show.poster_url,
              description: show.overview || '',
              rating: show.rating || 0,
              totalSeasons: show.total_seasons || 0,
              totalEpisodes: show.total_episodes || 0,
              friendsWatching: 0,
            }));
            
            const sortedShows = normalizedShows.sort((a, b) => {
              const aAddedAt = addedAtMap.get(a.id) || '';
              const bAddedAt = addedAtMap.get(b.id) || '';
              return bAddedAt.localeCompare(aAddedAt);
            });
            
            setPlaylistShows(sortedShows);
          }
        } else {
          setPlaylistShows([]);
        }
      }
    } else {
      setPlaylist(null);
      setPlaylistShows([]);
    }
  };

  const isOwnPlaylist = playlist?.userId === user?.id;

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
              onClose();
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const handleSharePlaylist = async () => {
    if (!playlist) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await Share.share({
        message: `Check out my playlist "${playlist.name}" on EPISODA!`,
        title: playlist.name,
      });
    } catch (error) {
      console.error('Error sharing playlist:', error);
    }
  };

  const handleShowPress = (showId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push(`/show/${showId}`);
  };

  if (!playlist) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{playlist.name}</Text>
              <Text style={styles.showCount}>
                {playlistShows.length} {playlistShows.length === 1 ? 'show' : 'shows'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={tokens.colors.black} />
            </Pressable>
          </View>

          {isOwnPlaylist && (
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.actionButton}
                onPress={handleSharePlaylist}
              >
                <IconSymbol name="square.and.arrow.up" size={18} color={tokens.colors.black} />
                <Text style={styles.actionButtonText}>Share</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeletePlaylist}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                <IconSymbol name="tv" size={48} color={tokens.colors.gray} />
                <Text style={styles.emptyStateText}>
                  {isOwnPlaylist
                    ? 'Add shows to this playlist to see them here'
                    : 'This playlist is empty'}
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.lightGray,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    marginBottom: 4,
  },
  showCount: {
    ...tokens.typography.smallSubtitle,
    color: tokens.colors.gray,
  },
  closeButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: tokens.colors.almostWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.colors.lightGray,
  },
  actionButtonText: {
    ...tokens.typography.smallSubtitle,
    color: tokens.colors.black,
  },
  deleteButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
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
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  showTitle: {
    ...tokens.typography.smallSubtitle,
    color: tokens.colors.black,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    ...tokens.typography.body,
    color: tokens.colors.gray,
    textAlign: 'center',
    marginTop: 16,
  },
});
