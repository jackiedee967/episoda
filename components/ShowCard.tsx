
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import { Show, User } from '@/types';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import PlaylistModal from '@/components/PlaylistModal';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';
import { Friends as BaseFriends } from './ui-pages/base/friends';

interface ShowCardProps {
  show: Show;
  friends?: User[];
  mutualFriendsWatching?: Array<{
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  }>;
}

export default function ShowCard({ show, friends = [], mutualFriendsWatching = [] }: ShowCardProps) {
  const router = useRouter();
  const [playlistModalVisible, setPlaylistModalVisible] = React.useState(false);
  const [isInPlaylist, setIsInPlaylist] = React.useState(false);

  const handlePress = async () => {
    if (!show) return;
    
    // If show already has database ID, navigate directly
    if (show.id) {
      router.push(`/show/${show.id}`);
      return;
    }
    
    // If show has traktId but no database ID (e.g., from search), upsert first
    if (show.traktId) {
      try {
        const { upsertShowFromAppModel } = await import('@/services/showDatabase');
        const dbShow = await upsertShowFromAppModel({
          traktId: show.traktId,
          title: show.title,
          description: show.description,
          posterUrl: show.poster,
          rating: show.rating,
          totalSeasons: show.totalSeasons,
          totalEpisodes: show.totalEpisodes,
        });
        
        if (dbShow?.id) {
          router.push(`/show/${dbShow.id}`);
        }
      } catch (error) {
        console.error('Failed to save show before navigation:', error);
      }
    }
  };

  const handleFriendPress = (friendId: string, e: any) => {
    e.stopPropagation();
    if (friendId) {
      router.push(`/user/${friendId}`);
    }
  };

  const handleSavePress = (e: any) => {
    e.stopPropagation();
    setPlaylistModalVisible(true);
  };

  const handleAddToPlaylist = (playlistId: string, showId: string) => {
    setIsInPlaylist(true);
    console.log(`Show ${showId} added to playlist ${playlistId}`);
  };

  if (!show) {
    console.log('ShowCard: show is undefined');
    return null;
  }

  return (
    <>
      <Pressable 
        style={({ pressed }) => [
          styles.container,
          pressed && styles.containerPressed,
        ]} 
        onPress={handlePress}
      >
        <View style={styles.posterWrapper}>
          <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.poster} />
          
          {/* Mutual Friends Watching - Top Left */}
          {mutualFriendsWatching && mutualFriendsWatching.length > 0 && (
            <View style={styles.mutualFriendsOverlay}>
              <BaseFriends
                prop="Small"
                state="Mutual_Friends"
                friends={mutualFriendsWatching}
              />
            </View>
          )}
          
          {/* Save Icon */}
          <Pressable 
            style={({ pressed }) => [
              styles.saveIcon,
              pressed && styles.saveIconPressed,
            ]} 
            onPress={handleSavePress}
          >
            <IconSymbol 
              name={isInPlaylist ? "bookmark.fill" : "bookmark"} 
              size={18} 
              color={tokens.colors.pureWhite} 
            />
          </Pressable>
        </View>
      </Pressable>

      <PlaylistModal
        visible={playlistModalVisible}
        onClose={() => setPlaylistModalVisible(false)}
        show={show}
        onAddToPlaylist={handleAddToPlaylist}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    marginRight: 16,
  },
  containerPressed: {
    opacity: 0.8,
  },
  posterWrapper: {
    position: 'relative',
    width: 250,
    height: 160,
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  posterPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    color: tokens.colors.pureWhite,
    fontSize: 48,
    fontWeight: '600',
  },
  saveIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  saveIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  mutualFriendsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
});
