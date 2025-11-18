export const SHOW_COLOR_PALETTE = [
  '#FF5E00',
  '#FF135E',
  '#9334E9',
  '#1700C6',
  '#0F6100',
  '#00B8D4',
  '#F50057',
  '#6200EA',
  '#FF6F00',
  '#00C853',
  '#D500F9',
  '#0091EA',
  '#C51162',
  '#AA00FF',
  '#00BFA5',
  '#FF3D00',
  '#7C4DFF',
  '#00E676',
  '#FF1744',
  '#00B0FF',
];

export function generateLightVariant(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const lightR = Math.round(r + (255 - r) * 0.85);
  const lightG = Math.round(g + (255 - g) * 0.85);
  const lightB = Math.round(b + (255 - b) * 0.85);
  
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`;
}

export function assignColorToShow(traktId: number): string {
  const traktIdStr = String(traktId);
  let hash = 0;
  for (let i = 0; i < traktIdStr.length; i++) {
    const char = traktIdStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % SHOW_COLOR_PALETTE.length;
  return SHOW_COLOR_PALETTE[index];
}

export interface ShowColorScheme {
  primary: string;
  light: string;
}

export function getShowColorScheme(traktId: number | undefined, existingColor?: string | null): ShowColorScheme {
  if (!traktId) {
    console.warn('⚠️ getShowColorScheme called without traktId - using default color');
    const primary = existingColor || SHOW_COLOR_PALETTE[0];
    const light = generateLightVariant(primary);
    return { primary, light };
  }
  
  const primary = existingColor || assignColorToShow(traktId);
  const light = generateLightVariant(primary);
  
  return { primary, light };
}
