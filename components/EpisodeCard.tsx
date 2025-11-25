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
import { IconSymbol } from '@/components/IconSymbol';

interface EpisodeCardProps {
  title: string;
  episodeNumber: string;
  showTitle: string;
  image?: ImageSourcePropType | string;
  friends?: string[];
  variant?: 'default' | 'compact' | 'list';
  onPress?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

export default function EpisodeCard({
  title,
  episodeNumber,
  showTitle,
  image,
  friends,
  variant = 'default',
  onPress,
  onBookmark,
  isBookmarked = false,
}: EpisodeCardProps) {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleBookmark = (e: any) => {
    e.stopPropagation();
    if (onBookmark) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onBookmark();
    }
  };

  if (variant === 'list') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.listCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.listContent}>
          <View style={styles.listInfo}>
            <Text style={styles.episodeNumberList}>{episodeNumber}</Text>
            <Text style={styles.titleList} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {onBookmark ? (
            <Pressable onPress={handleBookmark} style={styles.heartButton}>
              <IconSymbol
                name={isBookmarked ? "heart.fill" : "heart"}
                size={18}
                color={isBookmarked ? colors.greenHighlight : colors.grey1}
              />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.pressed,
        ]}
      >
        {image ? (
          <Image
            source={typeof image === 'string' ? { uri: image } : image}
            style={styles.compactImage}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.compactOverlay}>
          {onBookmark ? (
            <Pressable onPress={handleBookmark} style={styles.heartButtonCard}>
              <IconSymbol
                name={isBookmarked ? "heart.fill" : "heart"}
                size={16}
                color={isBookmarked ? colors.greenHighlight : colors.pureWhite}
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.episodeNumber}>{episodeNumber}</Text>
          <Text style={styles.showTitleCompact} numberOfLines={1}>
            {showTitle}
          </Text>
        </View>
      </Pressable>
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
      {image ? (
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.overlay}>
        {onBookmark ? (
          <Pressable onPress={handleBookmark} style={styles.heartButtonCard}>
            <IconSymbol
              name={isBookmarked ? "heart.fill" : "heart"}
              size={20}
              color={isBookmarked ? colors.greenHighlight : colors.pureWhite}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {episodeNumber}: {title}
        </Text>
        <Text style={styles.showTitle} numberOfLines={1}>
          {showTitle}
        </Text>
        {friends && friends.length > 0 ? (
          <View style={styles.friendsRow}>
            <View style={styles.friendAvatars}>
              {friends.slice(0, 3).map((friend, index) => (
                <View key={index} style={[styles.friendAvatar, { marginLeft: index > 0 ? -8 : 0 }]}>
                  <Text style={styles.friendInitial}>{friend[0]}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.friendsText} numberOfLines={1}>
              {friends.join(' and ')} wat...
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: components.borderRadiusCard,
    overflow: 'hidden',
    width: 250,
    height: 150,
    position: 'relative',
  },
  compactCard: {
    borderRadius: components.borderRadiusButton,
    overflow: 'hidden',
    width: 120,
    height: 120,
    position: 'relative',
  },
  listCard: {
    borderRadius: components.borderRadiusButton,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  compactOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  compactInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendAvatars: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.black,
  },
  friendInitial: {
    ...typography.p3,
    color: colors.black,
  },
  title: {
    ...typography.p1Bold,
    color: colors.pureWhite,
    marginBottom: 2,
  },
  showTitle: {
    ...typography.p2,
    color: colors.almostWhite,
    marginBottom: 4,
  },
  friendsText: {
    ...typography.p2,
    color: colors.pureWhite,
    flex: 1,
  },
  episodeNumber: {
    ...typography.p2Bold,
    color: colors.pureWhite,
    marginBottom: 2,
  },
  episodeNumberList: {
    ...typography.p2Bold,
    color: colors.greenHighlight,
    marginRight: 8,
  },
  showTitleCompact: {
    ...typography.p3,
    color: colors.pureWhite,
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleList: {
    ...typography.p1,
    color: colors.text,
    flex: 1,
  },
  heartButton: {
    padding: 4,
  },
  heartButtonCard: {
    padding: 4,
  },
  pressed: {
    opacity: 0.8,
  },
});
