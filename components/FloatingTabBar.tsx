
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
  const expansionAnim = useRef(new Animated.Value(0)).current;
  const iconOpacityAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;

  const isActive = (route: string) => {
    if (route === '/(home)') {
      return pathname === '/' || pathname.includes('/(home)');
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

  useEffect(() => {
    if (selectionMode && selectedCount > 0) {
      Animated.parallel([
        Animated.spring(expansionAnim, {
          toValue: 1,
          useNativeDriver: false,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(iconOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.sequence([
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(expansionAnim, {
            toValue: 0,
            useNativeDriver: false,
            damping: 18,
            stiffness: 180,
            mass: 0.8,
          }),
          Animated.timing(iconOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [selectionMode, selectedCount, expansionAnim, iconOpacityAnim, textOpacityAnim]);

  const handleTabPress = (route: string) => {
    router.push(route);
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
    const fullWidth = containerWidth - 24;
    
    const translateX = animatedValue.interpolate({
      inputRange: tabs.map((_, i) => i),
      outputRange: tabs.map((_, i) => 12 + i * tabWidth),
    });

    const animatedWidth = expansionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [tabWidth, fullWidth],
    });

    const animatedTranslateX = expansionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -12 - activeTabIndex * tabWidth + 12],
    });

    return {
      position: 'absolute' as const,
      left: 0,
      top: 8,
      bottom: 8,
      width: animatedWidth,
      backgroundColor: colors.accent,
      borderRadius: 20,
      transform: [
        { translateX: translateX },
        { translateX: animatedTranslateX },
      ],
    };
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable 
          style={styles.pillContainer}
          onLayout={handleLayout}
          onPress={selectionMode && selectedCount > 0 ? onLogPress : undefined}
        >
          <Animated.View style={getIndicatorStyle()} />
          
          <Animated.View 
            style={[
              styles.iconsContainer,
              { opacity: iconOpacityAnim }
            ]}
            pointerEvents={selectionMode && selectedCount > 0 ? 'none' : 'auto'}
          >
            {tabs.map((tab, index) => {
              const active = isActive(tab.route);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.route)}
                >
                  <IconSymbol
                    name={tab.icon}
                    size={24}
                    color={active ? tokens.colors.black : tokens.colors.pureWhite}
                  />
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          <Animated.View 
            style={[
              styles.textContainer,
              { opacity: textOpacityAnim }
            ]}
            pointerEvents={selectionMode && selectedCount > 0 ? 'auto' : 'none'}
          >
            <Text style={styles.logButtonText}>
              Log {selectedCount} {selectedCount === 1 ? 'episode' : 'episodes'}
            </Text>
          </Animated.View>
        </Pressable>
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
  iconsContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 2,
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingVertical: 16,
  },
  logButtonText: {
    ...tokens.typography.buttonSmall,
    color: tokens.colors.black,
    textAlign: 'center',
  },
});
