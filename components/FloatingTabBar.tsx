
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '@/styles/commonStyles';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = Dimensions.get('window').width - 32,
  borderRadius = 24,
  bottomMargin = 16,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeIndex = useSharedValue(0);

  const handleTabPress = (route: string, index: number) => {
    activeIndex.value = withSpring(index);
    router.push(route as any);
  };

  const getCurrentIndex = () => {
    const index = tabs.findIndex((tab) => pathname.includes(tab.name));
    return index >= 0 ? index : 0;
  };

  const currentIndex = getCurrentIndex();

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      activeIndex.value,
      tabs.map((_, i) => i),
      tabs.map((_, i) => (i * containerWidth) / tabs.length)
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <SafeAreaView style={[styles.safeArea, { marginBottom: bottomMargin }]} edges={['bottom']}>
      <BlurView intensity={80} tint="light" style={[styles.container, { width: containerWidth, borderRadius }]}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: containerWidth / tabs.length,
              borderRadius: borderRadius - 4,
            },
            animatedStyle,
          ]}
        />
        {tabs.map((tab, index) => {
          const isActive = currentIndex === index;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab.route, index)}
            >
              <IconSymbol
                name={tab.icon as any}
                size={24}
                color={isActive ? colors.text : colors.textSecondary}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    height: '80%',
    backgroundColor: colors.highlight,
    top: '10%',
    left: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.text,
  },
});
