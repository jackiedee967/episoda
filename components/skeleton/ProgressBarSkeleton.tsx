import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLine from './SkeletonLine';
import SkeletonBlock from './SkeletonBlock';

export default function ProgressBarSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLine width={120} height={14} />
        <SkeletonLine width={60} height={12} />
      </View>
      <SkeletonBlock width="100%" height={6} borderRadius={3} style={styles.progressBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    marginTop: 4,
  },
});
