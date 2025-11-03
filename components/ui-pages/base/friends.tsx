import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/styles/tokens';

export interface BaseFriendsProps {
  prop: 'Small' | 'Large';
  state: 'Mutual_Friends' | 'Friends_Watching';
  testID?: string;
  friends?: Array<{
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  }>;
}

export function Friends(props: BaseFriendsProps) {
  const { prop, friends = [], testID } = props;
  const isSmall = prop === 'Small';
  const displayCount = isSmall ? 3 : 5;
  const displayedFriends = friends.slice(0, displayCount);

  return (
    <View testID={testID} style={[styles.container, isSmall && styles.containerSmall]}>
      {displayedFriends.map((friend, index) => (
        friend.avatar ? (
          <Image
            key={friend.id}
            source={{ uri: friend.avatar }}
            style={[
              styles.avatar,
              isSmall && styles.avatarSmall,
              index > 0 && { marginLeft: isSmall ? -6 : -8 }
            ]}
          />
        ) : (
          <View
            key={friend.id}
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              isSmall && styles.avatarSmall,
              index > 0 && { marginLeft: isSmall ? -6 : -8 }
            ]}
          >
            <Text style={[styles.avatarText, isSmall && styles.avatarTextSmall]}>
              {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSmall: {
    height: 16,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBackground,
  },
  avatarSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    backgroundColor: colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.p1B,
    fontSize: 10,
    color: colors.pageBackground,
  },
  avatarTextSmall: {
    fontSize: 8,
  },
});
