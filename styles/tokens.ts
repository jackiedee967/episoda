/**
 * Design Tokens - Generated from Figma design tokens JSON
 * Auto-mapped color and typography system for consistent styling
 */

// ==================== COLORS ====================
export const colors = {
  // Card & Background Colors
  cardStroke: '#3e3e3eff',
  cardBackground: '#1b1b1bff',
  pageBackground: '#0e0e0eff',
  
  // Base Colors
  black: '#000000ff',
  pureWhite: '#ffffffff',
  almostWhite: '#f4f4f4ff',
  
  // Accent Colors
  greenHighlight: '#8bfc76ff',
  
  // Greys
  grey1: '#a9a9a9ff',
  grey2: '#d8d8d8ff',
  grey3: '#333333ff',
  
  // Tab Colors - Backgrounds
  tabBack: '#fff3efff',
  tabBack2: '#faf5ffff',
  tabBack3: '#deffa0ff',
  tabBack4: '#dee8ffff',
  tabBack5: '#ffe2e2ff',
  tabBack6: '#ffe5f3ff',
  
  // Tab Colors - Strokes
  tabStroke: '#ff5e00ff',
  tabStroke2: '#9334e9ff',
  tabStroke3: '#0f6100ff',
  tabStroke4: '#1700c6ff',
  tabStroke5: '#c20003ff',
  tabStroke6: '#c20081ff',
  
  // Image Stroke
  imageStroke: '#ffffff4d',
  
  // Additional UI colors
  accentHover: '#7AE665',
  error: '#FF4444',
  inputBackground: '#EFEFEF',
  inputStroke: '#E0E0E0',
  purpleLight: '#2A2A2A',
  blue: '#3B82F6',
} as const;

// ==================== TYPOGRAPHY ====================
// Complete typography tokens with all font properties
export const typography = {
  // Titles
  titleXl: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 43,
    fontWeight: '400' as const,
    fontStyle: 'normal' as const,
    letterSpacing: -0.86,
    lineHeight: 43,
  },
  titleL: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 25,
    fontWeight: '400' as const,
    fontStyle: 'normal' as const,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  
  // Subtitles
  subtitle: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '500' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 17,
  },
  subtitleR: {
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontWeight: '300' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 20.4,
  },
  smallSubtitle: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '500' as const,
    fontStyle: 'normal' as const,
    letterSpacing: -0.26,
    lineHeight: 13,
  },
  
  // Paragraphs
  p1: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '300' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 15.6,
  },
  p1B: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 13,
  },
  p1M: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '500' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 15.6,
  },
  p3M: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '500' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 10,
  },
  p3R: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '300' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 12,
  },
  p3B: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '600' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 10,
  },
  p4: {
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontWeight: '300' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 9.6,
  },
  
  // Buttons
  buttonSmall: {
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600' as const,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
} as const;

// ==================== MAPPING UTILITIES ====================
/**
 * Normalize a string for matching (removes spaces, dots, underscores, all dash variants)
 * Handles ASCII hyphens, en dashes (–), em dashes (—), and other Unicode dash characters
 */
function normalize(str: string): string {
  return str.toLowerCase()
    .replace(/[\s._\-\u2013\u2014\u2010-\u2015]/g, ''); // Strips spaces, dots, underscores, ASCII hyphen, en dash, em dash, and other Unicode dashes
}

/**
 * Shared color mapping table - exhaustive and testable
 */
const COLOR_MAP: Record<string, string> = {
  [normalize('Pure.White')]: colors.pureWhite,
  [normalize('pure white')]: colors.pureWhite,
  [normalize('Black')]: colors.black,
  [normalize('Card Background')]: colors.cardBackground,
  [normalize('Card Stroke')]: colors.cardStroke,
  [normalize('Page Background')]: colors.pageBackground,
  [normalize('Green Highlight')]: colors.greenHighlight,
  [normalize('Almost White')]: colors.almostWhite,
  [normalize('Grey 1')]: colors.grey1,
  [normalize('Grey 2')]: colors.grey2,
  [normalize('Grey 3')]: colors.grey3,
  [normalize('Tab - Back')]: colors.tabBack,
  [normalize('Tab - Back 2')]: colors.tabBack2,
  [normalize('Tab - Back 3')]: colors.tabBack3,
  [normalize('Tab - Back 4')]: colors.tabBack4,
  [normalize('Tab - Back 5')]: colors.tabBack5,
  [normalize('Tab - Back 6')]: colors.tabBack6,
  [normalize('Tab - Stroke')]: colors.tabStroke,
  [normalize('Tab - Stroke 2')]: colors.tabStroke2,
  [normalize('Tab - Stroke 3')]: colors.tabStroke3,
  [normalize('Tab - Stroke 4')]: colors.tabStroke4,
  [normalize('Tab - Stroke 5')]: colors.tabStroke5,
  [normalize('Tab - Stroke 6')]: colors.tabStroke6,
  [normalize('Image Stroke')]: colors.imageStroke,
  [normalize('Accent Hover')]: colors.accentHover,
  [normalize('Error')]: colors.error,
  [normalize('Input Background')]: colors.inputBackground,
  [normalize('Input Stroke')]: colors.inputStroke,
  [normalize('Purple Light')]: colors.purpleLight,
  [normalize('Blue')]: colors.blue,
};

/**
 * Map Figma color names to token colors
 * Handles naming variations: 'Pure.White', 'Pure White', 'pure white' all → pureWhite
 * @throws Error if color name is not found in mapping table
 */
export function mapColor(figmaColorName: string): string {
  const normalized = normalize(figmaColorName);
  const mapped = COLOR_MAP[normalized];
  
  if (!mapped) {
    throw new Error(
      `❌ Unmapped color: "${figmaColorName}". Add this color to the COLOR_MAP in styles/tokens.ts or use a valid hex value directly.`
    );
  }
  
  return mapped;
}

/**
 * Map font properties to typography token
 * Matches by fontSize and fontWeight combination
 */
export function mapTypography(fontSize: number, fontWeight: number | string): typeof typography[keyof typeof typography] | null {
  const weight = typeof fontWeight === 'string' ? parseInt(fontWeight) : fontWeight;
  
  // Match by fontSize + fontWeight
  if (fontSize === 43 && weight === 700) return typography.titleXl;
  if (fontSize === 25 && weight === 700) return typography.titleL;
  if (fontSize === 17 && weight === 500) return typography.subtitle;
  if (fontSize === 17 && weight === 300) return typography.subtitleR;
  if (fontSize === 13 && weight === 500) return typography.smallSubtitle;
  if (fontSize === 13 && weight === 300) return typography.p1;
  if (fontSize === 13 && weight === 600) return typography.p1B;
  if (fontSize === 10 && weight === 500) return typography.p3M;
  if (fontSize === 10 && weight === 300) return typography.p3R;
  if (fontSize === 10 && weight === 600) return typography.p3B;
  if (fontSize === 8 && weight === 300) return typography.p4;
  if (fontSize === 13 && weight === 600) return typography.buttonSmall; // Same as p1B but different lineHeight
  
  console.warn(`⚠️ Unmapped typography: fontSize ${fontSize}, fontWeight ${weight}`);
  return null;
}

/**
 * Get typography token by name (case-insensitive, handles variations)
 */
export function mapTypographyByName(name: string): typeof typography[keyof typeof typography] | null {
  const normalized = normalize(name);
  
  const typeMap: Record<string, typeof typography[keyof typeof typography]> = {
    [normalize('title xl')]: typography.titleXl,
    [normalize('title l')]: typography.titleL,
    [normalize('subtitle')]: typography.subtitle,
    [normalize('subtitle - r')]: typography.subtitleR,
    [normalize('small subtitle')]: typography.smallSubtitle,
    [normalize('p1')]: typography.p1,
    [normalize('p1 - b')]: typography.p1B,
    [normalize('p1 - m')]: typography.p1M,
    [normalize('p3 - m')]: typography.p3M,
    [normalize('p3 - r')]: typography.p3R,
    [normalize('p3 3- b')]: typography.p3B,
    [normalize('p4')]: typography.p4,
    [normalize('button - small')]: typography.buttonSmall,
  };
  
  return typeMap[normalized] || null;
}

// Export default tokens object
export default {
  colors,
  typography,
  mapColor,
  mapTypography,
  mapTypographyByName,
};
