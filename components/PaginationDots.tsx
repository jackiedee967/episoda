import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PaginationDotsProps {
  total: number;
  current: number;
  activeColor?: string;
  inactiveColor?: string;
  testID?: string;
}

export function PaginationDots({
  total,
  current,
  activeColor = 'rgba(139, 252, 118, 1)',
  inactiveColor = 'rgba(255, 255, 255, 0.3)',
  testID,
}: PaginationDotsProps) {
  return (
    <View style={styles.container} testID={testID}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: index === current ? activeColor : inactiveColor },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
