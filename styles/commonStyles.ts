
import { StyleSheet } from 'react-native';

export const colors = {
  // Background colors
  pageBackground: '#0E0E0E',
  cardBackground: '#1B1B1B',
  
  // Primary colors
  greenHighlight: '#8BFC76',
  almostWhite: '#F4F4F4',
  pureWhite: '#FFFFFF',
  black: '#000000',
  
  // Grey scale
  cardStroke: '#3E3E3E',
  grey1: '#A9A9A9',
  grey2: '#D8D8D8',
  grey3: '#333333',
  
  // Image/Media
  imageStroke: '#FFFFF4',
  
  // Tab colors with strokes
  tabBack: '#FAF5FF',
  tabBack2: '#DEFFAD',
  tabBack3: '#CEEBFF',
  tabBack4: '#FFE2E2',
  tabBack5: '#FFF8F3',
  tabBack6: '#FFF8F3',
  
  tabStroke: '#FF3EFF',
  tabStroke2: '#9334E9',
  tabStroke3: '#0F6100',
  tabStroke4: '#1700C6',
  tabStroke5: '#FF5E00',
  tabStroke6: '#C20081',
  
  // Legacy aliases for compatibility
  background: '#0E0E0E',
  card: '#1B1B1B',
  text: '#FFFFFF',
  textSecondary: '#A9A9A9',
  accent: '#8BFC76',
  accentHover: '#7AE665',
  border: '#3E3E3E',
  error: '#FF4444',
  inputBackground: '#EFEFEF',
  inputStroke: '#E0E0E0',
  primary: '#8BFC76',
  secondary: '#8BFC76',
  highlight: '#8BFC76',
  purple: '#9334E9',
  purpleLight: '#2A2A2A',
  green: '#8BFC76',
  blue: '#3B82F6',
};

// Typography system matching Figma specs
export const typography = {
  // Font families
  fontFamily: 'FunnelDisplay_400Regular',
  fontFamilyBold: 'FunnelDisplay_700Bold',
  
  // Text styles from Figma
  titleXL: {
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 43,
    lineHeight: 43,
    fontWeight: '700' as const,
  },
  titleL: {
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 25,
    lineHeight: 25 * 1.2,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 17,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
  smallSubtitle: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 13,
    lineHeight: 13,
    fontWeight: '500' as const,
  },
  buttonSmall: {
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 13,
    lineHeight: 13 * 1.2,
    fontWeight: '600' as const,
  },
  p1Bold: {
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 13,
    lineHeight: 13 * 1.2,
    fontWeight: '600' as const,
  },
  p1: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 13,
    lineHeight: 13 * 1.2,
    fontWeight: '400' as const,
  },
  p2Bold: {
    fontFamily: 'FunnelDisplay_700Bold',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '600' as const,
  },
  p2Medium: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '500' as const,
  },
  p2: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 10,
    lineHeight: 10 * 1.2,
    fontWeight: '400' as const,
  },
  p3Medium: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '500' as const,
  },
  p3Regular: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 10,
    lineHeight: 10 * 1.2,
    fontWeight: '400' as const,
  },
  p3Bold: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '600' as const,
  },
  p4: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 8,
    lineHeight: 8 * 1.2,
    fontWeight: '400' as const,
  },
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
