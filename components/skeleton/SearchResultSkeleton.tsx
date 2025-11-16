import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';
import SkeletonLine from './SkeletonLine';
import { colors } from '@/styles/tokens';

export default function SearchResultSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock width={108} height={140} borderRadius={8} />
      <View style={styles.info}>
        <SkeletonLine width={150} height={16} />
        <SkeletonLine width={100} height={12} style={styles.subtitle} />
        <SkeletonLine width="90%" height={10} style={styles.description} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  subtitle: {
    marginTop: 4,
  },
  description: {
    marginTop: 4,
  },
});
