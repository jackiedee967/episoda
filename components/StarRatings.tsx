import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';

interface StarRatingsProps {
  rating: number;
  size?: number;
}

function HalfStar({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="halfFill" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="50%" stopColor="#8bfc76" stopOpacity="1" />
          <Stop offset="50%" stopColor="transparent" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill="url(#halfFill)"
        stroke="#8bfc76"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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
});
