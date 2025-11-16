import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/styles/tokens';
import SkeletonContainer from './SkeletonContainer';

interface SkeletonCircleProps {
  size?: number;
  style?: any;
}

export default function SkeletonCircle({ size = 40, style }: SkeletonCircleProps) {
  return (
    <SkeletonContainer style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <View style={styles.background} />
    </SkeletonContainer>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
  background: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.grey3,
  },
});
