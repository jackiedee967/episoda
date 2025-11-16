import React from 'react';
import { StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';

interface PosterSkeletonProps {
  width?: number;
  height?: number;
  style?: any;
}

export default function PosterSkeleton({ width = 108, height = 140, style }: PosterSkeletonProps) {
  return (
    <SkeletonBlock 
      width={width} 
      height={height} 
      borderRadius={8} 
      style={[styles.poster, style]} 
    />
  );
}

const styles = StyleSheet.create({
  poster: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
