import React, { useEffect, useState, useCallback } from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedCollapsibleProps {
  expanded: boolean;
  children: React.ReactNode;
  duration?: number;
}

export default function AnimatedCollapsible({
  expanded,
  children,
  duration = 250,
}: AnimatedCollapsibleProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const [measured, setMeasured] = useState(false);
  const animatedHeight = useSharedValue(0);
  const opacity = useSharedValue(expanded ? 1 : 0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
      if (!measured) {
        setMeasured(true);
        if (expanded) {
          animatedHeight.value = height;
          opacity.value = 1;
        }
      }
    }
  }, [measured, expanded, contentHeight]);

  useEffect(() => {
    if (!measured || contentHeight === 0) return;

    animatedHeight.value = withTiming(expanded ? contentHeight : 0, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(expanded ? 1 : 0, {
      duration: duration * 0.8,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [expanded, contentHeight, measured, duration]);

  const containerStyle = useAnimatedStyle(() => {
    if (!measured) {
      return { 
        height: expanded ? undefined : 0,
        overflow: 'hidden' as const,
      };
    }
    return {
      height: animatedHeight.value,
      overflow: 'hidden' as const,
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: measured ? opacity.value : (expanded ? 1 : 0),
  }));

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={contentStyle}>
        <View 
          onLayout={onLayout} 
          style={measured ? undefined : (expanded ? undefined : styles.hidden)}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
  },
});
