import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';
import SkeletonLine from './SkeletonLine';
import tokens from '@/styles/tokens';

export default function SearchResultSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock width={80.34} height={98.79} borderRadius={8} />
      <View style={styles.info}>
        <SkeletonLine width="100%" height={16} style={styles.title} />
        <SkeletonLine width="95%" height={12} style={styles.descriptionLine1} />
        <SkeletonLine width="80%" height={12} style={styles.descriptionLine2} />
        <View style={styles.statsRow}>
          <SkeletonLine width={35} height={12} />
          <SkeletonLine width={65} height={12} />
          <SkeletonLine width={75} height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: tokens.colors.cardStroke,
    padding: 11,
    gap: 17,
    marginBottom: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  descriptionLine1: {
    marginBottom: 2,
  },
  descriptionLine2: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
