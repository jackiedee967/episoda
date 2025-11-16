import React, { useState, useRef } from 'react';
import { Animated } from 'react-native';
import { Image, ImageProps } from 'expo-image';

interface FadeInImageProps extends ImageProps {
  duration?: number;
}

export default function FadeInImage({ 
  duration = 300, 
  style,
  onLoad,
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

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      <Image
        {...imageProps}
        style={{ width: '100%', height: '100%' }}
        onLoad={handleLoad}
      />
    </Animated.View>
  );
}
