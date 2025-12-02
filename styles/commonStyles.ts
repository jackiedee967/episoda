
import { StyleSheet } from 'react-native';
import tokens from './tokens';

// Color aliases mapped to design tokens for easy access
export const colors = {
  // Primary colors from design tokens
  pageBackground: tokens.colors.pageBackground,
  cardBackground: tokens.colors.cardBackground,
  greenHighlight: tokens.colors.greenHighlight,
  almostWhite: tokens.colors.almostWhite,
  pureWhite: tokens.colors.pureWhite,
  black: tokens.colors.black,
  
  // Grey scale
  cardStroke: tokens.colors.cardStroke,
  grey1: tokens.colors.grey1,
  grey2: tokens.colors.grey2,
  grey3: tokens.colors.grey3,
  
  // Image/Media
  imageStroke: tokens.colors.imageStroke,
  
  // Tab colors
  tabBack: tokens.colors.tabBack,
  tabBack2: tokens.colors.tabBack2,
  tabBack3: tokens.colors.tabBack3,
  tabBack4: tokens.colors.tabBack4,
  tabBack5: tokens.colors.tabBack5,
  tabBack6: tokens.colors.tabBack6,
  
  tabStroke: tokens.colors.tabStroke,
  tabStroke2: tokens.colors.tabStroke2,
  tabStroke3: tokens.colors.tabStroke3,
  tabStroke4: tokens.colors.tabStroke4,
  tabStroke5: tokens.colors.tabStroke5,
  tabStroke6: tokens.colors.tabStroke6,
  
  // Legacy aliases for backward compatibility
  background: tokens.colors.pageBackground,
  card: tokens.colors.cardBackground,
  text: tokens.colors.almostWhite,
  textSecondary: tokens.colors.grey1,
  accent: tokens.colors.greenHighlight,
  accentHover: tokens.colors.accentHover,
  border: tokens.colors.cardStroke,
  error: tokens.colors.error,
  inputBackground: tokens.colors.inputBackground,
  inputStroke: tokens.colors.inputStroke,
  primary: tokens.colors.greenHighlight,
  secondary: tokens.colors.greenHighlight,
  highlight: tokens.colors.greenHighlight,
  purple: tokens.colors.tabStroke2,
  purpleLight: tokens.colors.purpleLight,
  green: tokens.colors.greenHighlight,
  blue: tokens.colors.blue,
};

// Typography aliases mapped to design tokens
export const typography = {
  // Font families - use registered font names from app/_layout.tsx
  fontFamily: 'FunnelDisplay_400Regular',
  fontFamilyBold: 'FunnelDisplay_700Bold',
  
  // Text styles from design tokens
  titleXL: tokens.typography.titleXl,
  titleL: tokens.typography.titleL,
  subtitle: tokens.typography.subtitle,
  smallSubtitle: tokens.typography.smallSubtitle,
  buttonSmall: tokens.typography.buttonSmall,
  p1Bold: tokens.typography.p1B,
  p1Medium: tokens.typography.p1M,
  p1: tokens.typography.p1,
  p2Bold: tokens.typography.p3B,
  p2Medium: tokens.typography.p3M,
  p2: tokens.typography.p3R,
  p3Medium: tokens.typography.p3M,
  p3Regular: tokens.typography.p3R,
  p3Bold: tokens.typography.p3B,
  p4: tokens.typography.p4,
};

export const spacing = {
  pageMargin: 20,
  cardPadding: 16,
  sectionSpacing: 32,
  gapSmall: 8,
  gapMedium: 12,
  gapLarge: 16,
  gapXLarge: 24,
};

export const components = {
  borderRadiusCard: 16,
  borderRadiusButton: 12,
  borderRadiusTag: 8,
  buttonHeight: 46,
  inputHeight: 50,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  text: {
    color: colors.text,
    ...typography.p1,
  },
  textSecondary: {
    color: colors.textSecondary,
    ...typography.p2,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: components.borderRadiusCard,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  button: {
    backgroundColor: colors.greenHighlight,
    borderRadius: components.borderRadiusButton,
    height: components.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.black,
    ...typography.buttonSmall,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: components.borderRadiusButton,
    borderWidth: 1,
    borderColor: colors.inputStroke,
    height: components.inputHeight,
    paddingHorizontal: 16,
    ...typography.p1,
    color: colors.black,
  },
});
