import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import tokens from '@/styles/tokens';

interface StarRatingsProps {
  rating: number;
  size?: number;
}

function HalfStar({ size = 14 }: { size?: number }) {
  return (
    <View style={[styles.starWrapper, { width: size, height: size }]}>
      <Star
        size={size}
        color="#8bfc76"
        fill="none"
        strokeWidth={1.5}
      />
      <View style={[styles.halfStarOverlay, { width: size / 2, height: size }]}>
        <Star
          size={size}
          color="#8bfc76"
          fill="#8bfc76"
          strokeWidth={1.5}
        />
      </View>
    </View>
  );
}

export default function StarRatings({ rating, size = 14 }: StarRatingsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      {[...Array(fullStars)].map((_, i) => (
        <Star
          key={`full-${i}`}
          size={size}
          color="#8bfc76"
          fill="#8bfc76"
          strokeWidth={1.5}
        />
      ))}
      {hasHalfStar && <HalfStar key="half" size={size} />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star
          key={`empty-${i}`}
          size={size}
          color={tokens.colors.grey1}
          fill="none"
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
  starWrapper: {
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
