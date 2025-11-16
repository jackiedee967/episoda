import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/styles/tokens';
import SkeletonContainer from './SkeletonContainer';

interface SkeletonLineProps {
  width?: number | string;
  height?: number;
  style?: any;
}

export default function SkeletonLine({ width = '100%', height = 12, style }: SkeletonLineProps) {
  return (
    <SkeletonContainer style={[styles.line, { width, height }, style]}>
      <View style={styles.background} />
    </SkeletonContainer>
  );
}

const styles = StyleSheet.create({
  line: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  background: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grey3,
  },
});
