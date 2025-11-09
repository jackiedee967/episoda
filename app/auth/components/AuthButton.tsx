import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, typography } from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Reusable button component for auth screens
 * Uses design tokens for consistent styling
 */
export function AuthButton({ 
  title, 
  onPress, 
  loading = false, 
  variant = 'primary',
  disabled = false,
  style
}: AuthButtonProps) {
  const handlePress = () => {
    if (!loading && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const isPrimary = variant === 'primary';
  const buttonStyle = [
    styles.button,
    isPrimary ? styles.primaryButton : styles.secondaryButton,
    (loading || disabled) && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    typography.subtitle,
    isPrimary ? styles.primaryText : styles.secondaryText,
  ];

  return (
    <Pressable
      style={buttonStyle}
      onPress={handlePress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.pureWhite : colors.black} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: colors.greenHighlight,
  },
  secondaryButton: {
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: colors.black,
  },
  secondaryText: {
    color: colors.black,
  },
});
