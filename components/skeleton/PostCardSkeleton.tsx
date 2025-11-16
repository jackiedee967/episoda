import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCircle from './SkeletonCircle';
import SkeletonLine from './SkeletonLine';
import SkeletonBlock from './SkeletonBlock';
import { colors } from '@/styles/tokens';

export default function PostCardSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.userPostInfo}>
        <SkeletonBlock width={108} height={140} borderRadius={8} style={styles.poster} />
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <SkeletonCircle size={24} />
            <SkeletonLine width={120} height={14} style={styles.username} />
          </View>
          
          <SkeletonLine width="90%" height={12} style={styles.textLine} />
          <SkeletonLine width="70%" height={12} style={styles.textLine} />
          
          <View style={styles.tags}>
            <SkeletonBlock width={60} height={20} borderRadius={12} />
            <SkeletonBlock width={50} height={20} borderRadius={12} />
          </View>
          
          <View style={styles.footer}>
            <SkeletonLine width={40} height={10} />
            <SkeletonLine width={60} height={10} />
          </View>
        </View>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.actions}>
        <SkeletonCircle size={18} />
        <SkeletonCircle size={18} />
        <SkeletonCircle size={18} />
        <SkeletonCircle size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userPostInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    flexShrink: 0,
  },
  contentContainer: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    flex: 1,
  },
  textLine: {
    marginVertical: 2,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardStroke,
    marginVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 24,
  },
});
