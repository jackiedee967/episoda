import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { colors, typography, components, spacing } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import Button from './Button';

interface UserCardProps {
  username: string;
  displayName: string;
  bio?: string;
  avatar?: ImageSourcePropType | string;
  isFollowing?: boolean;
  variant?: 'default' | 'compact' | 'large';
  stats?: {
    followers?: number;
    following?: number;
    posts?: number;
  };
  onPress?: () => void;
  onFollowPress?: () => void;
  showFollowButton?: boolean;
}

export default function UserCard({
  username,
  displayName,
  bio,
  avatar,
  isFollowing = false,
  variant = 'default',
  stats,
  onPress,
  onFollowPress,
  showFollowButton = true,
}: UserCardProps) {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleFollowPress = () => {
    if (onFollowPress) {
      onFollowPress();
    }
  };

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.pressed,
        ]}
      >
        {avatar && (
          <Image
            source={typeof avatar === 'string' ? { uri: avatar } : avatar}
            style={styles.compactAvatar}
            resizeMode="cover"
          />
        )}
        <View style={styles.compactInfo}>
          <Text style={styles.compactDisplayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.compactUsername} numberOfLines={1}>
            @{username}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'large') {
    return (
      <View style={styles.largeCard}>
        <Pressable onPress={handlePress} style={styles.largeHeader}>
          {avatar && (
            <Image
              source={typeof avatar === 'string' ? { uri: avatar } : avatar}
              style={styles.largeAvatar}
              resizeMode="cover"
            />
          )}
          <View style={styles.largeInfo}>
            <Text style={styles.largeDisplayName}>{displayName}</Text>
            <Text style={styles.largeUsername}>@{username}</Text>
            {bio && <Text style={styles.largeBio}>{bio}</Text>}
          </View>
        </Pressable>
        
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.posts || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.following || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        )}
        
        {showFollowButton && (
          <Button
            variant={isFollowing ? 'secondary' : 'primary'}
            size="medium"
            onPress={handleFollowPress}
            fullWidth
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      {avatar && (
        <Image
          source={typeof avatar === 'string' ? { uri: avatar } : avatar}
          style={styles.avatar}
          resizeMode="cover"
        />
      )}
      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
        {bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        )}
      </View>
      {showFollowButton && (
        <Button
          variant={isFollowing ? 'secondary' : 'primary'}
          size="small"
          onPress={handleFollowPress}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  largeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.cardPadding,
    gap: spacing.gapLarge,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.grey3,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey3,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.grey3,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  compactInfo: {
    flex: 1,
  },
  largeHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  largeInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    ...typography.p1Bold,
    color: colors.text,
  },
  compactDisplayName: {
    ...typography.p2Bold,
    color: colors.text,
  },
  largeDisplayName: {
    ...typography.titleL,
    color: colors.text,
  },
  username: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  compactUsername: {
    ...typography.p3,
    color: colors.textSecondary,
  },
  largeUsername: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  bio: {
    ...typography.p2,
    color: colors.textSecondary,
    marginTop: 4,
  },
  largeBio: {
    ...typography.p1,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.gapMedium,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...typography.titleL,
    color: colors.text,
  },
  statLabel: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
  },
});
