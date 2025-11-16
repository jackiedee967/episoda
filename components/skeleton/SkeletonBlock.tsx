import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/styles/tokens';
import SkeletonContainer from './SkeletonContainer';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonBlock({ width = '100%', height = 100, borderRadius = 8, style }: SkeletonBlockProps) {
  return (
    <SkeletonContainer style={[styles.block, { width, height, borderRadius }, style]}>
      <View style={styles.background} />
    </SkeletonContainer>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
  background: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grey3,
  },
});
