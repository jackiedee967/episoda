import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import tokens from '@/styles/tokens';
import { SortIcon } from './SortIcon';
import * as Haptics from 'expo-haptics';

export type SortOption = 'recent' | 'hot';

interface SortDropdownProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  style?: ViewStyle;
}

export default function SortDropdown({ sortBy, onSortChange, style }: SortDropdownProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(sortBy === 'recent' ? 'hot' : 'recent');
  };

  return (
    <Pressable 
      style={[styles.container, style]} 
      onPress={handlePress}
    >
      <Text style={styles.text}>Sort by</Text>
      <SortIcon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  text: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: -0.26,
  },
});
