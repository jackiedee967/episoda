
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
              style={[styles.avatar, { marginLeft: index > 0 ? -6 : 0, zIndex: displayFriends.length - index }]}
            />
          ))}
        </View>
        <Text style={styles.friendsText} numberOfLines={2}>
          {displayFriends[0]?.displayName || 'Friends'} 
          {remainingCount > 0 && ` and ${remainingCount} friend${remainingCount > 1 ? 's' : ''}`} watching
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
    width: 120,
    marginRight: 12,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  friendsContainer: {
    marginTop: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  friendsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
