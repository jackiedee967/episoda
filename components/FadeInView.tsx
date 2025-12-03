import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

const animatedSectionsCache = new Set<string>();

export function resetFadeInCache() {
  animatedSectionsCache.clear();
}

export function resetFadeInKey(key: string) {
  animatedSectionsCache.delete(key);
}

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  animationKey?: string;
}

export default function FadeInView({ 
  children, 
  duration = 300, 
  delay = 0,
  style,
  animationKey
}: FadeInViewProps) {
  const hasAlreadyAnimated = animationKey ? animatedSectionsCache.has(animationKey) : false;
  const fadeAnim = useRef(new Animated.Value(hasAlreadyAnimated ? 1 : 0)).current;

  useEffect(() => {
    if (hasAlreadyAnimated) {
      return;
    }

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(() => {
        if (animationKey) {
          animatedSectionsCache.add(animationKey);
        }
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, delay, animationKey, hasAlreadyAnimated]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
}
