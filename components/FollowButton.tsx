
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onPress: (userId: string) => Promise<void>;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export default function FollowButton({
  userId,
  isFollowing,
  onPress,
  size = 'medium',
  disabled = false,
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePress = async () => {
    if (isLoading || disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await onPress(userId);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    isFollowing ? styles.buttonFollowing : styles.buttonFollow,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonText,
    styles[`buttonText_${size}`],
    isFollowing ? styles.buttonTextFollowing : styles.buttonTextFollow,
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? colors.text : colors.background}
        />
      ) : (
        <Text style={textStyle}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  button_small: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
  },
  button_medium: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 90,
  },
  button_large: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 120,
  },
  buttonFollow: {
    backgroundColor: colors.secondary,
    borderWidth: 0,
  },
  buttonFollowing: {
    backgroundColor: '#E5E5E5',
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonText_small: {
    fontSize: 13,
  },
  buttonText_medium: {
    fontSize: 14,
  },
  buttonText_large: {
    fontSize: 16,
  },
  buttonTextFollow: {
    color: colors.background,
  },
  buttonTextFollowing: {
    color: colors.text,
  },
});
