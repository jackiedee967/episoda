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
import { colors, typography, components } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

export interface Tab {
  key: string;
  label: string;
  color?: string;
  strokeColor?: string;
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
      backgroundColor: isActive ? colors.greenHighlight : 'transparent',
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
      color: isActive ? colors.black : colors.textSecondary,
      ...typography.p1Bold,
    };
  };

  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab.key;

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
        <Text style={getTabTextStyle(tab, isActive)}>{tab.label}</Text>
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
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusButton,
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: components.borderRadiusTag,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPressed: {
    opacity: 0.8,
  },
});
