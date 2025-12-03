import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated as RNAnimated, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
  const isFirstRender = useRef(true);
  const lastTabIndex = useRef(currentTabIndex);

  useFocusEffect(
    React.useCallback(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        translateX.setValue(0);
        opacity.setValue(1);
        return;
      }

      if (lastTabIndex.current === currentTabIndex) {
        return;
      }
      lastTabIndex.current = currentTabIndex;

      if (direction === 'right') {
        translateX.setValue(SLIDE_DISTANCE);
      } else if (direction === 'left') {
        translateX.setValue(-SLIDE_DISTANCE);
      } else {
        translateX.setValue(0);
        opacity.setValue(0.8);
      }

      RNAnimated.parallel([
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
      ]).start();
    }, [direction, currentTabIndex])
  );

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
