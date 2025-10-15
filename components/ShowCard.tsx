
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
    router.push(`/show/${show.id}`);
  };

  const renderFriendAvatars = () => {
    const displayFriends = friends.slice(0, 3);
    const remainingCount = show.friendsWatching - displayFriends.length;

    return (
      <View style={styles.friendsContainer}>
        <View style={styles.avatarRow}>
          {displayFriends.map((friend, index) => (
            <Image
              key={friend.id}
              source={{ uri: friend.avatar }}
              style={[styles.avatar, { marginLeft: index > 0 ? -8 : 0 }]}
            />
          ))}
        </View>
        <Text style={styles.friendsText}>
          {displayFriends[0]?.displayName || 'Friends'} 
          {remainingCount > 0 && ` & ${remainingCount} other${remainingCount > 1 ? 's' : ''}`} watching
        </Text>
      </View>
    );
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Image source={{ uri: show.poster }} style={styles.poster} />
      {renderFriendAvatars()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 20,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
  },
  friendsContainer: {
    marginTop: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendsText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
});
