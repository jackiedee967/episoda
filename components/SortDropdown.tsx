import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View, Modal, TouchableWithoutFeedback } from 'react-native';
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
    <View>
      <Pressable 
        style={[styles.container, style]} 
        onPress={handlePress}
      >
        <Text style={styles.text}>Sort by</Text>
        <SortIcon />
      </Pressable>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    minWidth: 150,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  optionActive: {
    backgroundColor: tokens.colors.greenHighlight,
  },
  optionText: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionTextActive: {
    color: tokens.colors.black,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.cardStroke,
  },
});
