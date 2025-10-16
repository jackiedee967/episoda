
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

  const renderFriendAvatars = () => {
    const validFriends = friends.filter(f => f && f.id);
    const displayFriends = validFriends.slice(0, 3);
    const remainingCount = Math.max(0, (show?.friendsWatching || 0) - displayFriends.length);

    if (displayFriends.length === 0) {
      return (
        <View style={styles.friendsContainer}>
          <Text style={styles.friendsText}>No friends watching</Text>
        </View>
      );
    }

    return (
      <View style={styles.friendsContainer}>
        <View style={styles.avatarRow}>
          {displayFriends.map((friend, index) => (
            <Pressable
              key={friend.id}
              onPress={(e) => handleFriendPress(friend.id, e)}
            >
              {friend.avatar ? (
                <Image
                  source={{ uri: friend.avatar }}
                  style={[styles.avatar, { marginLeft: index > 0 ? -8 : 0, zIndex: displayFriends.length - index }]}
                />
              ) : (
                <View
                  style={[styles.avatar, styles.avatarPlaceholder, { marginLeft: index > 0 ? -8 : 0, zIndex: displayFriends.length - index }]}
                >
                  <Text style={styles.avatarPlaceholderText}>
                    {friend.displayName?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <Text style={styles.friendsText} numberOfLines={2}>
          <Pressable onPress={(e) => handleFriendPress(displayFriends[0].id, e)}>
            <Text style={styles.friendNameLink}>
              {displayFriends[0].displayName || 'Friend'}
            </Text>
          </Pressable>
          {remainingCount > 0 && (
            <Text style={styles.friendsTextNormal}>
              {' '}and {remainingCount} friend{remainingCount > 1 ? 's' : ''} watching
            </Text>
          )}
          {remainingCount === 0 && displayFriends.length === 1 && (
            <Text style={styles.friendsTextNormal}> watching</Text>
          )}
          {remainingCount === 0 && displayFriends.length > 1 && (
            <Text style={styles.friendsTextNormal}>
              {' '}and {displayFriends.length - 1} other{displayFriends.length - 1 > 1 ? 's' : ''} watching
            </Text>
          )}
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
      <Pressable style={styles.container} onPress={handlePress}>
        <View style={styles.posterWrapper}>
          {show.poster ? (
            <Image source={{ uri: show.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Text style={styles.posterPlaceholderText}>{show.title?.charAt(0) || '?'}</Text>
            </View>
          )}
          <Pressable style={styles.saveIcon} onPress={handleSavePress}>
            <IconSymbol 
              name={isInWatchlist ? "bookmark.fill" : "bookmark"} 
              size={18} 
              color="#FFFFFF" 
            />
          </Pressable>
        </View>
        {renderFriendAvatars()}
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
    width: 120,
  },
  posterWrapper: {
    position: 'relative',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
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
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  friendsText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  friendNameLink: {
    fontWeight: '600',
    color: colors.text,
  },
  friendsTextNormal: {
    color: colors.textSecondary,
  },
});
