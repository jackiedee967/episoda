import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export default function FadeInView({ 
  children, 
  duration = 300, 
  delay = 0,
  style 
}: FadeInViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      fadeAnim.setValue(1);
      return;
    }

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start(() => {
        hasAnimated.current = true;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
}
