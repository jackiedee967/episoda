import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography } from '@/styles/tokens';

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface FriendsInCommonBarProps {
  friends: Friend[];
  variant?: 'small' | 'large';
}

export default function FriendsInCommonBar({ friends, variant = 'small' }: FriendsInCommonBarProps) {
  if (!friends || friends.length === 0) {
    return null;
  }

  const displayCount = variant === 'small' ? 3 : 5;
  const displayedFriends = friends.slice(0, displayCount);

  const firstName = displayedFriends[0]?.displayName || displayedFriends[0]?.username || 'Someone';
  
  let followText = '';
  if (friends.length === 1) {
    followText = `${firstName} follows`;
  } else if (friends.length === 2) {
    const secondName = displayedFriends[1]?.displayName || displayedFriends[1]?.username;
    followText = `${firstName} and ${secondName} follow`;
  } else {
    // For 3+ friends, show "FirstName and X others follow" where X = total - 1
    const othersCount = friends.length - 1;
    followText = `${firstName} and ${othersCount} other${othersCount !== 1 ? 's' : ''} follow`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarsContainer}>
        {displayedFriends.map((friend, index) => (
          friend.avatar ? (
            <Image
              key={friend.id}
              source={{ uri: friend.avatar }}
              style={[
                styles.avatar,
                index > 0 && { marginLeft: -12 }
              ]}
            />
          ) : (
            <View
              key={friend.id}
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                index > 0 && { marginLeft: -12 }
              ]}
            >
              <Text style={styles.avatarPlaceholderText}>
                {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )
        ))}
      </View>
      <Text style={styles.followText}>{followText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.pageBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    ...typography.p1B,
    fontSize: 14,
    color: colors.pageBackground,
  },
  followText: {
    ...typography.p1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.greenHighlight,
  },
});
