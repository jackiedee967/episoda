import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface SortIconProps {
  testID?: string;
  width?: number;
  height?: number;
}

export function SortIcon({ testID, width = 16, height = 16 }: SortIconProps) {
  return (
    <Image
      testID={testID}
      source={require('@/public/sort-icon.png')}
      style={[styles.icon, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    tintColor: '#ffffff',
  },
});
