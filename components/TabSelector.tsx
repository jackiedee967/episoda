import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

export interface Tab {
  key: string;
  label: string;
  color?: string;
  strokeColor?: string;
  hasIndicator?: boolean;
}

interface TabSelectorProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  variant?: 'default' | 'colored';
  scrollable?: boolean;
}

export default function TabSelector({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  scrollable = false,
}: TabSelectorProps) {
  const handleTabPress = (tabKey: string) => {
    if (tabKey !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tabKey);
    }
  };

  const getTabStyle = (tab: Tab, isActive: boolean): ViewStyle => {
    if (variant === 'colored' && tab.color) {
      return {
        backgroundColor: isActive ? tab.color : 'transparent',
        borderWidth: 1,
        borderColor: isActive ? (tab.strokeColor || tab.color) : colors.cardStroke,
      };
    }

    return {
      backgroundColor: isActive ? tokens.colors.greenHighlight : 'transparent',
      borderWidth: 0,
    };
  };

  const getTabTextStyle = (tab: Tab, isActive: boolean): TextStyle => {
    if (variant === 'colored') {
      return {
        color: isActive ? colors.black : colors.textSecondary,
        ...typography.buttonSmall,
      };
    }

    return {
      color: isActive ? tokens.colors.black : tokens.colors.pureWhite,
      fontFamily: 'Funnel Display',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    };
  };

  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab.key;
    const showIndicator = !isActive && tab.hasIndicator;

    return (
      <Pressable
        key={tab.key}
        onPress={() => handleTabPress(tab.key)}
        style={({ pressed }) => [
          styles.tab,
          getTabStyle(tab, isActive),
          pressed && styles.tabPressed,
        ]}
      >
        <View style={styles.tabContent}>
          <Text style={getTabTextStyle(tab, isActive)}>{tab.label}</Text>
          {showIndicator && <View style={styles.indicator} />}
        </View>
      </Pressable>
    );
  };

  const content = <View style={styles.tabsContainer}>{tabs.map(renderTab)}</View>;

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    height: 46,
  },
  scrollContent: {
    paddingHorizontal: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 34,
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.greenHighlight,
  },
});
