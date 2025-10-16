
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { Show, User } from '@/types';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import WatchlistModal from '@/components/WatchlistModal';

interface ShowCardProps {
  show: Show;
  friends?: User[];
}

export default function ShowCard({ show, friends = [] }: ShowCardProps) {
  const router = useRouter();
  const [watchlistModalVisible, setWatchlistModalVisible] = React.useState(false);
  const [isInWatchlist, setIsInWatchlist] = React.useState(false);

  const handlePress = () => {
    if (show?.id) {
      router.push(`/show/${show.id}`);
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
    setWatchlistModalVisible(true);
  };

  const handleAddToWatchlist = (watchlistId: string, showId: string) => {
    setIsInWatchlist(true);
    console.log(`Show ${showId} added to watchlist ${watchlistId}`);
  };

  const renderFriendsWatchingPill = () => {
    const validFriends = friends.filter(f => f && f.id);
    const displayFriends = validFriends.slice(0, 3);
    const remainingCount = Math.max(0, (show?.friendsWatching || 0) - displayFriends.length);

    if (displayFriends.length === 0) {
      return null;
    }

    // Build the text
    let friendsText = '';
    if (displayFriends.length > 0) {
      friendsText = displayFriends[0].displayName || 'Friend';
      if (remainingCount > 0) {
        friendsText += ` and ${remainingCount} friend${remainingCount > 1 ? 's' : ''} watching`;
      } else if (displayFriends.length === 1) {
        friendsText += ' watching';
      } else {
        friendsText += ` and ${displayFriends.length - 1} other${displayFriends.length - 1 > 1 ? 's' : ''} watching`;
      }
    }

    return (
      <View style={styles.friendsPill}>
        <View style={styles.pillAvatarRow}>
          {displayFriends.map((friend, index) => (
            <Pressable
              key={friend.id}
              onPress={(e) => handleFriendPress(friend.id, e)}
            >
              {friend.avatar ? (
                <Image
                  source={{ uri: friend.avatar }}
                  style={[styles.pillAvatar, { marginLeft: index > 0 ? -6 : 0, zIndex: displayFriends.length - index }]}
                />
              ) : (
                <View
                  style={[styles.pillAvatar, styles.pillAvatarPlaceholder, { marginLeft: index > 0 ? -6 : 0, zIndex: displayFriends.length - index }]}
                >
                  <Text style={styles.pillAvatarPlaceholderText}>
                    {friend.displayName?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <Text style={styles.pillText} numberOfLines={1}>
          {friendsText}
        </Text>
      </View>
    );
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
          {show.poster ? (
            <Image source={{ uri: show.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Text style={styles.posterPlaceholderText}>{show.title?.charAt(0) || '?'}</Text>
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
              name={isInWatchlist ? "bookmark.fill" : "bookmark"} 
              size={18} 
              color="#FFFFFF" 
            />
          </Pressable>

          {/* Friends Watching Pill - Overlaid on poster */}
          {renderFriendsWatchingPill()}
        </View>
      </Pressable>

      <WatchlistModal
        visible={watchlistModalVisible}
        onClose={() => setWatchlistModalVisible(false)}
        show={show}
        onAddToWatchlist={handleAddToWatchlist}
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
    color: '#FFFFFF',
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
  // Friends Watching Pill - Overlaid on poster
  friendsPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  pillAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pillAvatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillAvatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
});
