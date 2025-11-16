import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonCircle from './SkeletonCircle';
import SkeletonLine from './SkeletonLine';

interface CommentSkeletonProps {
  isReply?: boolean;
}

export default function CommentSkeleton({ isReply = false }: CommentSkeletonProps) {
  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <SkeletonCircle size={32} />
      <View style={styles.content}>
        <SkeletonLine width={100} height={14} style={styles.username} />
        <SkeletonLine width="90%" height={12} style={styles.textLine} />
        <SkeletonLine width="70%" height={12} style={styles.textLine} />
        <View style={styles.footer}>
          <SkeletonLine width={60} height={10} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  replyContainer: {
    marginLeft: 44,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  username: {
    marginBottom: 2,
  },
  textLine: {
    marginBottom: 2,
  },
  footer: {
    marginTop: 4,
  },
});
