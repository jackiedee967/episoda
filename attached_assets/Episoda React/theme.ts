export type Themes = keyof typeof themes;

export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

export const display = {
  // No "[Scale: Display]" variable collection found
} as const;

export const typography = {
  // No "[Scale: Fonts]" variable collection found
} as const;

export const font = {
  // No "Fonts" variable collection found
} as const;

export const palette = {
  // No "[Scale: Colors]" variable collection found
} as const;

export const themes = {
  main: {
    // No local color styles or color variables found
    breakpoints,
    display,
    font,
    palette,
    typography,
  },
} as const;

export const initialTheme: Themes = 'main' as const
