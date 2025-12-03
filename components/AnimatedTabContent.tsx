import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useNavigationDirection } from '@/contexts/NavigationDirectionContext';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabIndex: number;
}

const ANIMATION_DURATION = 200;

export default function AnimatedTabContent({ children, tabIndex }: AnimatedTabContentProps) {
  const [key, setKey] = useState(0);
  const { direction, currentTabIndex } = useNavigationDirection();

  useFocusEffect(
    useCallback(() => {
      setKey((prevKey) => prevKey + 1);
    }, [])
  );

  const getEnteringAnimation = () => {
    if (direction === 'right') {
      return SlideInRight.duration(ANIMATION_DURATION);
    } else if (direction === 'left') {
      return SlideInLeft.duration(ANIMATION_DURATION);
    }
    return FadeIn.duration(ANIMATION_DURATION);
  };

  const getExitingAnimation = () => {
    if (direction === 'right') {
      return SlideOutLeft.duration(ANIMATION_DURATION);
    } else if (direction === 'left') {
      return SlideOutRight.duration(ANIMATION_DURATION);
    }
    return FadeOut.duration(ANIMATION_DURATION);
  };

  return (
    <Animated.View
      key={key}
      style={styles.container}
      entering={getEnteringAnimation()}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
