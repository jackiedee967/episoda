import React, { useState, useRef } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View, TouchableWithoutFeedback } from 'react-native';
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
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDropdownVisible(!dropdownVisible);
  };

  const handleOptionPress = (option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(option);
    setDropdownVisible(false);
  };

  return (
    <>
      {dropdownVisible && (
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
      )}
      
      <View style={styles.wrapper}>
        <Pressable 
          style={[styles.container, style]} 
          onPress={handlePress}
        >
          <Text style={styles.text}>Sort by</Text>
          <SortIcon />
        </Pressable>

        {dropdownVisible && (
          <View style={styles.dropdown}>
            <Pressable
              style={[styles.option, sortBy === 'recent' && styles.optionActive]}
              onPress={() => handleOptionPress('recent')}
            >
              <Text style={[styles.optionText, sortBy === 'recent' && styles.optionTextActive]}>
                Recent
              </Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={[styles.option, sortBy === 'hot' && styles.optionActive]}
              onPress={() => handleOptionPress('hot')}
            >
              <Text style={[styles.optionText, sortBy === 'hot' && styles.optionTextActive]}>
                Hot
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
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
    ...tokens.typography.p4,
    color: tokens.colors.pureWhite,
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 82,
    height: 64,
    padding: 6,
    flexDirection: 'column',
    gap: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.grey3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
    flex: 1,
  },
  optionActive: {
    backgroundColor: tokens.colors.greenHighlight,
  },
  optionText: {
    ...tokens.typography.p3R,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
  },
  optionTextActive: {
    color: tokens.colors.black,
  },
  divider: {
    height: 2,
  },
});
