
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { Show, User } from '@/types';
import { useRouter } from 'expo-router';

interface ShowCardProps {
  show: Show;
  friends?: User[];
}

export default function ShowCard({ show, friends = [] }: ShowCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (show?.id) {
      router.push(`/show/${show.id}`);
    }
  };

  const handleFriendPress = (friendId: string) => {
    router.push(`/user/${friendId}`);
  };

  const renderFriendAvatars = () => {
    const displayFriends = friends.slice(0, 3);
    const remainingCount = show.friendsWatching - displayFriends.length;

    return (
      <View style={styles.friendsContainer}>
        <View style={styles.avatarRow}>
          {displayFriends.map((friend, index) => (
            <Pressable
              key={friend?.id || `placeholder-${index}`}
              onPress={() => friend?.id && handleFriendPress(friend.id)}
            >
              {friend?.avatar ? (
                <Image
                  source={{ uri: friend.avatar }}
                  style={[styles.avatar, { marginLeft: index > 0 ? -6 : 0, zIndex: displayFriends.length - index }]}
                />
              ) : (
                <View
                  style={[styles.avatar, styles.avatarPlaceholder, { marginLeft: index > 0 ? -6 : 0, zIndex: displayFriends.length - index }]}
                >
                  <Text style={styles.avatarPlaceholderText}>
                    {friend?.displayName?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <Text style={styles.friendsText} numberOfLines={2}>
          <Text 
            style={styles.friendNameLink}
            onPress={() => displayFriends[0]?.id && handleFriendPress(displayFriends[0].id)}
          >
            {displayFriends[0]?.displayName || 'Friends'}
          </Text>
          {remainingCount > 0 && ` and ${remainingCount} friend${remainingCount > 1 ? 's' : ''}`} watching
        </Text>
      </View>
    );
  };

  if (!show) {
    console.log('ShowCard: show is undefined');
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {show.poster ? (
        <Image source={{ uri: show.poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterPlaceholderText}>{show.title?.charAt(0) || '?'}</Text>
        </View>
      )}
      {renderFriendAvatars()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
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
  friendsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  avatarPlaceholder: {
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  friendsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
  },
  friendNameLink: {
    fontWeight: '600',
    color: colors.text,
  },
});
