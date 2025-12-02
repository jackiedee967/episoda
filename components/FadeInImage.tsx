import React, { useRef } from 'react';
import { Animated, ViewStyle, StyleSheet } from 'react-native';
import { Image, ImageProps, ImageStyle } from 'expo-image';

interface FadeInImageProps extends ImageProps {
  duration?: number;
  containerStyle?: ViewStyle;
}

export default function FadeInImage({ 
  duration = 300, 
  style,
  containerStyle,
  onLoad,
  onError,
  onLoadEnd,
  ...imageProps 
}: FadeInImageProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = (event: any) => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
    
    if (onLoad) {
      onLoad(event);
    }
  };

  const handleError = (error: any) => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 0,
      useNativeDriver: false,
    }).start();
    
    if (onError) {
      onError(error);
    }
  };

  const handleLoadEnd = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
    
    if (onLoadEnd) {
      onLoadEnd();
    }
  };

  // Check if style has explicit dimensions (for icons)
  // If so, don't apply 100% defaults to container
  const flatStyle = StyleSheet.flatten(style) || {};
  const hasExplicitDimensions = 
    (typeof flatStyle.width === 'number' || typeof flatStyle.height === 'number');

  // For images with explicit dimensions (icons), container should match
  // For images without (thumbnails filling containers), use 100% defaults
  const defaultContainerStyle = hasExplicitDimensions 
    ? {} 
    : { width: '100%' as const, height: '100%' as const };

  const defaultImageStyle = hasExplicitDimensions
    ? style
    : [{ width: '100%' as const, height: '100%' as const }, style];

  return (
    <Animated.View style={[defaultContainerStyle, containerStyle, { opacity: fadeAnim }]}>
      <Image
        {...imageProps}
        style={defaultImageStyle}
        onLoad={handleLoad}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
      />
    </Animated.View>
  );
}
