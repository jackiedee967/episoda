import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedTabPanelProps {
  children: React.ReactNode;
  activeIndex: number;
  style?: any;
}

const ANIMATION_DURATION = 200;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AnimatedTabPanel({ 
  children, 
  activeIndex, 
  style 
}: AnimatedTabPanelProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const prevIndexRef = useRef(activeIndex);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    const prevIndex = prevIndexRef.current;
    
    if (activeIndex === prevIndex) return;
    
    const isGoingRight = activeIndex > prevIndex;
    const slideDistance = SCREEN_WIDTH * 0.12;
    
    translateX.value = isGoingRight ? slideDistance : -slideDistance;
    opacity.value = 0.3;
    
    translateX.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
