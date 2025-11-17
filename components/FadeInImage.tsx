import React, { useState, useRef } from 'react';
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
  };

  return (
    <Animated.View style={[containerStyle, { opacity: fadeAnim }]}>
      <Image
        {...imageProps}
        style={style || { width: '100%', height: '100%' }}
        onLoad={handleLoad}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
      />
    </Animated.View>
  );
}
