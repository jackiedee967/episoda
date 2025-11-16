import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCircle from './SkeletonCircle';
import SkeletonLine from './SkeletonLine';

export default function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <SkeletonCircle size={20} />
        <SkeletonLine width={100} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: '#3e3e3e',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
