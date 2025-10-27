import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

interface ButtonLProps {
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
  disabled?: boolean;
}

export default function ButtonL({ onPress, children, testID, disabled = false }: ButtonLProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  return (
    <Pressable
      testID={testID}
      style={[styles.root, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={styles.label}>{children || 'Tell your friends'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingTop: 11,
    paddingLeft: 34,
    paddingBottom: 11,
    paddingRight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
    alignSelf: 'stretch',
  },
  label: {
    color: tokens.colors.black,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 24,
  },
  disabled: {
    opacity: 0.5,
  },
});
