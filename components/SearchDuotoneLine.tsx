import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface SearchDuotoneLineProps {
  testID?: string;
  width?: number;
  height?: number;
}

export function SearchDuotoneLine({ testID, width = 17, height = 17 }: SearchDuotoneLineProps) {
  return (
    <Image
      testID={testID}
      source={require('@/public/search-icon.png')}
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
