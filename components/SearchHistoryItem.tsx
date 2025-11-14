import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { X, Clock } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

interface SearchHistoryItemProps {
  query: string;
  onPress: () => void;
  onRemove: () => void;
}

export default function SearchHistoryItem({ query, onPress, onRemove }: SearchHistoryItemProps) {
  const handleRemove = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={handlePress}
    >
      <View style={styles.leftContent}>
        <Clock size={16} color={tokens.colors.grey1} />
        <Text style={styles.queryText} numberOfLines={1}>
          {query}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.removeButton,
          pressed && styles.removeButtonPressed
        ]}
        onPress={handleRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={16} color={tokens.colors.grey1} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: tokens.colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: tokens.colors.grey3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  queryText: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
    flex: 1,
  },
  removeButton: {
    padding: 4,
    borderRadius: 4,
  },
  removeButtonPressed: {
    backgroundColor: tokens.colors.tabBack2,
  },
});
