import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tokens from '@/styles/tokens';

interface GradientPlaceholderProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function GradientPlaceholder({
  width,
  height,
  borderRadius = 8,
  style,
  children,
}: GradientPlaceholderProps) {
  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[tokens.colors.cardBackground, tokens.colors.grey3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

interface ShowPosterPlaceholderProps {
  width: number;
  aspectRatio?: number;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function ShowPosterPlaceholder({
  width,
  aspectRatio = 1.5,
  borderRadius = 8,
  style,
  children,
}: ShowPosterPlaceholderProps) {
  const height = width * aspectRatio;
  
  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[tokens.colors.cardBackground, tokens.colors.grey3, tokens.colors.cardBackground]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}
