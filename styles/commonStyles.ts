
import { StyleSheet } from 'react-native';

export const colors = {
  // Dark mode colors
  background: '#0E0E0E',
  card: '#282828',
  cardStroke: '#3E3E3E',
  text: '#FFFFFF',
  textSecondary: '#999999',
  accent: '#8BFC76',
  accentHover: '#7AE665',
  border: '#2A2A2A',
  error: '#FF4444',
  inputBackground: '#EFEFEF',
  inputStroke: '#E0E0E0',
  
  // Legacy aliases for compatibility
  primary: '#8BFC76',
  secondary: '#8BFC76',
  highlight: '#8BFC76',
  purple: '#9334E9',
  purpleLight: '#2A2A2A',
  green: '#8BFC76',
  blue: '#3B82F6',
};

export const typography = {
  fontFamily: 'FunnelDisplay_400Regular',
  fontFamilyBold: 'FunnelDisplay_700Bold',
  lineHeight: 1.3,
};

export const spacing = {
  pageMargin: 20,
  cardPadding: 16,
  sectionSpacing: 32,
  gapSmall: 8,
  gapMedium: 12,
  gapLarge: 16,
};

export const components = {
  borderRadiusCard: 16,
  borderRadiusButton: 16,
  borderRadiusTag: 12,
  buttonHeight: 46,
  inputHeight: 46,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
    lineHeight: typography.lineHeight * 16,
  },
  textSecondary: {
    color: colors.textSecondary,
    lineHeight: typography.lineHeight * 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: components.borderRadiusCard,
    borderWidth: 0.5,
    borderColor: colors.cardStroke,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: components.borderRadiusButton,
    height: components.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: components.borderRadiusButton,
    borderWidth: 1,
    borderColor: colors.inputStroke,
    height: components.inputHeight,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
});
