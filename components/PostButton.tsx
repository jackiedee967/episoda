
import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { colors, components, spacing } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';

interface PostButtonProps {
  onPress: () => void;
  pulseAnim: Animated.Value;
}

export default function PostButton({ onPress, pulseAnim }: PostButtonProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.leftContent}>
        <Animated.View 
          style={[
            styles.dot,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.8],
                outputRange: [1, 0.4],
              }),
            },
          ]} 
        />
        <Text style={styles.text}>What are you watching?</Text>
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Tell your friends</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
    paddingVertical: spacing.gapMedium,
    paddingHorizontal: spacing.gapLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    minHeight: 56,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.gapMedium,
  },
  text: {
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.gapLarge,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.black,
  },
});
