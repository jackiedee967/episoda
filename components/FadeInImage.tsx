import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Image, ImageProps } from 'expo-image';

interface FadeInImageProps extends ImageProps {
  duration?: number;
  containerStyle?: ViewStyle;
}

export default function FadeInImage({ 
  duration = 300, 
  style,
  containerStyle,
  ...imageProps 
}: FadeInImageProps) {
  const flatStyle = StyleSheet.flatten(style) || {};
  const hasExplicitDimensions = 
    (typeof flatStyle.width === 'number' || typeof flatStyle.height === 'number');

  const defaultContainerStyle = hasExplicitDimensions 
    ? {} 
    : { width: '100%' as const, height: '100%' as const };

  const defaultImageStyle = hasExplicitDimensions
    ? style
    : [{ width: '100%' as const, height: '100%' as const }, style];

  return (
    <View style={[defaultContainerStyle, containerStyle]}>
      <Image
        {...imageProps}
        style={defaultImageStyle}
        transition={duration}
      />
    </View>
  );
}
