import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import tokens from '@/styles/tokens';

interface Vector3DividerProps {
  testID?: string;
  style?: ViewStyle;
}

export function Vector3Divider({ testID, style }: Vector3DividerProps) {
  return <View testID={testID} style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: tokens.colors.pureWhite,
    opacity: 0.5,
  },
});
