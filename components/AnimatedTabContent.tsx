import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated as RNAnimated } from 'react-native';
import { useNavigationDirection } from '@/contexts/NavigationDirectionContext';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabIndex: number;
}

const ANIMATION_DURATION = 200;
const SLIDE_DISTANCE = 50;

export default function AnimatedTabContent({ children, tabIndex }: AnimatedTabContentProps) {
  const { direction, previousTabIndex, currentTabIndex } = useNavigationDirection();
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const lastAnimatedToIndex = useRef<number | null>(null);
  const animationRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (tabIndex !== currentTabIndex) {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      translateX.setValue(0);
      opacity.setValue(1);
      return;
    }

    if (lastAnimatedToIndex.current === currentTabIndex) {
      return;
    }

    if (lastAnimatedToIndex.current === null) {
      lastAnimatedToIndex.current = currentTabIndex;
      translateX.setValue(0);
      opacity.setValue(1);
      return;
    }

    lastAnimatedToIndex.current = currentTabIndex;

    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (direction === 'right') {
      translateX.setValue(SLIDE_DISTANCE);
    } else if (direction === 'left') {
      translateX.setValue(-SLIDE_DISTANCE);
    } else {
      translateX.setValue(0);
      opacity.setValue(0.8);
    }

    animationRef.current = RNAnimated.parallel([
      RNAnimated.timing(translateX, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current.start(() => {
      animationRef.current = null;
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [currentTabIndex, direction, tabIndex, translateX, opacity]);

  return (
    <RNAnimated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      {children}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
