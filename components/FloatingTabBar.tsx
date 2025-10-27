
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Text,
  Pressable,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';

interface TabBarItem {
  name: string;
  icon: string;
  route: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  selectionMode?: boolean;
  selectedCount?: number;
  onLogPress?: () => void;
}

export default function FloatingTabBar({ tabs, selectionMode = false, selectedCount = 0, onLogPress }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [containerWidth, setContainerWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const isActive = (route: string) => {
    if (route === '/(home)') {
      return pathname === '/' || pathname.includes('/(home)') || pathname.includes('/show/');
    }
    return pathname.includes(route);
  };

  const getActiveTabIndex = () => {
    return tabs.findIndex(tab => isActive(tab.route));
  };

  const activeTabIndex = getActiveTabIndex();

  useEffect(() => {
    if (activeTabIndex >= 0 && containerWidth > 0) {
      Animated.spring(animatedValue, {
        toValue: activeTabIndex,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
        mass: 1,
      }).start();
    }
  }, [activeTabIndex, containerWidth, animatedValue]);

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const getIndicatorStyle = () => {
    if (containerWidth === 0) {
      return { opacity: 0 };
    }

    const tabWidth = (containerWidth - 24) / tabs.length;
    const translateX = animatedValue.interpolate({
      inputRange: tabs.map((_, i) => i),
      outputRange: tabs.map((_, i) => 12 + i * tabWidth),
    });

    return {
      position: 'absolute' as const,
      left: 0,
      top: 8,
      bottom: 8,
      width: tabWidth,
      backgroundColor: colors.accent,
      borderRadius: 20,
      transform: [{ translateX }],
    };
  };

  if (selectionMode && selectedCount > 0) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable 
            style={styles.logButton}
            onPress={onLogPress}
          >
            <Text style={styles.logButtonText}>
              Log {selectedCount} {selectedCount === 1 ? 'episode' : 'episodes'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View 
          style={styles.pillContainer}
          onLayout={handleLayout}
        >
          <Animated.View style={getIndicatorStyle()} />
          {tabs.map((tab, index) => {
            const active = isActive(tab.route);
            return (
              <TouchableOpacity
                key={index}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route)}
              >
                <IconSymbol
                  name={tab.icon as any}
                  size={24}
                  color={active ? tokens.colors.black : tokens.colors.pureWhite}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.pageBackground,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)',
    elevation: 8,
    position: 'relative',
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logButton: {
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)',
    elevation: 8,
  },
  logButtonText: {
    ...tokens.typography.buttonSmall,
    color: tokens.colors.black,
    textAlign: 'center',
  },
});
