import React, { useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

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
  const opacity = useSharedValue(hasAlreadyAnimated ? 1 : 0);
  const [hasAnimated, setHasAnimated] = useState(hasAlreadyAnimated);

  useEffect(() => {
    if (hasAlreadyAnimated) {
      return;
    }

    const markAsAnimated = () => {
      if (animationKey) {
        animatedSectionsCache.add(animationKey);
      }
      setHasAnimated(true);
    };

    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(markAsAnimated)();
        }
      })
    );
  }, [animationKey, hasAlreadyAnimated, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
