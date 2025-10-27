import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import tokens from '@/styles/tokens';

interface StarRatingsProps {
  rating: number; // 1-5
  size?: number;
}

export default function StarRatings({ rating, size = 14 }: StarRatingsProps) {
  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          color={i < rating ? tokens.colors.greenHighlight : tokens.colors.grey1}
          fill={i < rating ? tokens.colors.greenHighlight : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});
