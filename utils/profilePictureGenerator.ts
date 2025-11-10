import { supabase } from '@/app/integrations/supabase/client';

export const COLOR_SCHEMES = [
  { id: 1, icon: '#FFF2F3', base: '#FF135E' },
  { id: 2, icon: '#FFE5F3', base: '#C20081' },
  { id: 3, icon: '#DEE8FF', base: '#1700C6' },
  { id: 4, icon: '#DEFFA0', base: '#0F6100' },
  { id: 5, icon: '#FAF5FF', base: '#9334E9' },
  { id: 6, icon: '#FFF3EF', base: '#FF5E00' },
  { id: 7, icon: '#FFE2E2', base: '#C20003' },
];

export const ICON_NAMES = [
  'icon-1-ellipse',
  'icon-2-flower-3',
  'icon-3-flower-11',
  'icon-4-moon',
  'icon-5-diamond',
  'icon-6-diamond-hollow',
  'icon-7-cross',
  'icon-8-blocks',
  'icon-9-star-classic',
  'icon-10-star-8point',
  'icon-11-star-curved',
  'icon-12-star-burst',
  'icon-13-sparkle',
  'icon-14-star-twirl',
  'icon-15-star-rounded',
  'icon-16-wheel-plus',
  'icon-17-wheel-x',
];

export interface AvatarConfig {
  colorSchemeId: number;
  iconName: string;
}

export function generateRandomAvatarConfig(): AvatarConfig {
  const randomColorScheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
  const randomIconName = ICON_NAMES[Math.floor(Math.random() * ICON_NAMES.length)];

  return {
    colorSchemeId: randomColorScheme.id,
    iconName: randomIconName,
  };
}

export async function assignRandomAvatar(userId: string): Promise<boolean> {
  try {
    const config = generateRandomAvatarConfig();

    const { error } = await supabase
      .from('profiles' as any)
      .update({
        avatar_color_scheme: config.colorSchemeId,
        avatar_icon: config.iconName,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[assignRandomAvatar] Database error:', error);
      return false;
    }

    console.log(`✅ Assigned avatar to user ${userId}: scheme=${config.colorSchemeId}, icon=${config.iconName}`);
    return true;
  } catch (error) {
    console.error('[assignRandomAvatar] Unexpected error:', error);
    return false;
  }
}

export function getColorScheme(id: number) {
  return COLOR_SCHEMES.find(scheme => scheme.id === id) || COLOR_SCHEMES[0];
}

export function getIconFileName(iconName: string): string {
  return `${iconName}.svg`;
}

export function generateAvatarDataURI(colorSchemeId: number, iconName: string): string {
  // Fallback to scheme 1 if invalid
  const colorScheme = getColorScheme(colorSchemeId);
  
  // Normalize icon name (handle legacy numeric values)
  const normalizedIconName = normalizeIconName(iconName);
  
  // Create 160x160 square with 116x116 centered icon
  // Icon paths are in 200x200 coordinate system, scale to 116x116 (0.58x)
  // Center by translating 22px (160-116)/2 on each axis
  const svg = `
    <svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="160" height="160" fill="${colorScheme.base}"/>
      <g transform="translate(22, 22) scale(0.58)">
        ${getIconPath(normalizedIconName, colorScheme.icon)}
      </g>
    </svg>
  `.trim();
  
  // Convert to data URI
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

function normalizeIconName(iconName: string | number): string {
  // Handle legacy numeric icon identifiers (0-16)
  if (typeof iconName === 'number' || /^\d+$/.test(iconName)) {
    const iconIndex = typeof iconName === 'number' ? iconName : parseInt(iconName, 10);
    if (iconIndex >= 0 && iconIndex < ICON_NAMES.length) {
      return ICON_NAMES[iconIndex];
    }
    // Fallback to first icon if out of range
    return ICON_NAMES[0];
  }
  
  // Already a valid icon name string
  return iconName;
}

function getIconPath(iconName: string, iconColor: string): string {
  const iconPaths: Record<string, string> = {
    'icon-1-ellipse': `<path d="M200 30C200 46.5685 186.569 60 170 60C153.431 60 140 46.5685 140 30C140 13.4315 153.431 0 170 0C186.569 0 200 13.4315 200 30Z" fill="${iconColor}"/><path d="M200 170C200 186.569 186.569 200 170 200C153.431 200 140 186.569 140 170C140 153.431 153.431 140 170 140C186.569 140 200 153.431 200 170Z" fill="${iconColor}"/><path d="M151 100C151 128.167 128.167 151 100 151C71.8335 151 49 128.167 49 100C49 71.8335 71.8335 49 100 49C128.167 49 151 71.8335 151 100Z" fill="${iconColor}"/><path d="M60 30C60 46.5685 46.5685 60 30 60C13.4315 60 0 46.5685 0 30C0 13.4315 13.4315 0 30 0C46.5685 0 60 13.4315 60 30Z" fill="${iconColor}"/><path d="M60 170C60 186.569 46.5685 200 30 200C13.4315 200 0 186.569 0 170C0 153.431 13.4315 140 30 140C46.5685 140 60 153.431 60 170Z" fill="${iconColor}"/>`,
    'icon-2-flower-3': `<path d="M200 50C200 22.3858 177.614 -1.20706e-06 150 0C122.386 1.20706e-06 100 22.3858 100 50C100 22.3858 77.6142 3.16408e-06 50 4.37114e-06C22.3858 6.55671e-06 -2.18557e-06 22.3858 0 50C1.20706e-06 77.6142 22.3858 100 50 100C22.3858 100 3.16408e-06 122.386 4.37114e-06 150C5.5782e-06 177.614 22.3858 200 50 200C77.6142 200 100 177.614 100 150C100 177.614 122.386 200 150 200C177.614 200 200 177.614 200 150C200 122.392 177.625 100.011 150.02 100C177.625 99.9894 200 77.6077 200 50Z" fill="${iconColor}"/>`,
    'icon-3-flower-11': `<path d="M80.255 32.5C76.0239 17.5 81.7646 0 99.9998 0C118.235 0 123.976 17.5 119.745 32.5C116.765 43.0643 108.888 67.2694 104.49 80.6609C103.68 83.1282 105.316 85.7238 107.566 87.0311C109.815 88.3371 112.814 88.393 114.551 86.4617C123.986 75.9709 141.084 57.062 148.774 49.2057C159.691 38.0534 177.766 34.2589 186.884 49.9998C196.001 65.7408 183.667 79.4467 168.519 83.2942C157.85 86.0041 132.879 91.3076 119.045 94.2069C116.497 94.7409 115.049 97.4047 115.049 100C115.049 102.595 116.497 105.259 119.045 105.793C132.879 108.692 157.85 113.996 168.519 116.706C183.667 120.553 196.001 134.259 186.884 150C177.766 165.741 159.691 161.947 148.774 150.794C141.084 142.938 123.986 124.029 114.551 113.538C112.814 111.607 109.815 111.663 107.566 112.969C105.316 114.276 103.68 116.872 104.49 119.339C108.888 132.731 116.765 156.936 119.745 167.5C123.976 182.5 118.235 200 99.9998 200C81.7646 200 76.0239 182.5 80.255 167.5C83.2352 156.936 91.1117 132.731 95.5102 119.339C96.3199 116.872 94.6838 114.276 92.434 112.969C90.1849 111.663 87.1857 111.607 85.4488 113.538C76.0142 124.029 58.9156 142.938 51.2257 150.794C40.3095 161.947 22.2343 165.741 13.1159 150C3.99853 134.259 16.3329 120.553 31.4806 116.706C42.15 113.996 67.1206 108.692 80.9548 105.793C83.5028 105.259 84.951 102.595 84.951 100C84.951 97.4047 83.5028 94.7409 80.9548 94.2069C67.1206 91.3076 42.15 86.0041 31.4806 83.2942C16.3329 79.4467 3.99853 65.7408 13.1159 49.9998C22.2343 34.2589 40.3095 38.0534 51.2257 49.2057C58.9156 57.062 76.0142 75.9709 85.4488 86.4617C87.1857 88.393 90.1849 88.3371 92.434 87.0311C94.6838 85.7238 96.3199 83.1282 95.5102 80.6609C91.1117 67.2694 83.2352 43.0643 80.255 32.5Z" fill="${iconColor}"/>`,
    'icon-4-moon': `<path d="M186.048 180.392C190.823 175.617 194.506 169.844 196.887 163.403C199.268 156.962 200.3 149.978 199.925 142.851C199.55 135.723 197.774 128.592 194.7 121.863C191.626 115.135 187.313 108.941 182.008 103.636C176.703 98.3308 170.51 94.018 163.781 90.9439C157.053 87.8698 149.921 86.0945 142.794 85.7193C135.666 85.3442 128.682 86.3766 122.241 88.7576C115.8 91.1386 110.027 94.8215 105.252 99.5961L186.048 180.392Z" fill="${iconColor}"/><path d="M13.9519 19.6068C9.17731 24.3814 5.49437 30.1542 3.11339 36.5956C0.7324 43.0369 -0.300003 50.0207 0.0751221 57.1481C0.450248 64.2756 2.22556 71.4071 5.29968 78.1356C8.37381 84.864 12.6866 91.0576 17.9917 96.3628C23.2968 101.668 29.4904 105.981 36.2189 109.055C42.9473 112.129 50.0789 113.904 57.2063 114.279C64.3338 114.654 71.3175 113.622 77.7589 111.241C84.2002 108.86 89.973 105.177 94.7476 100.403L13.9519 19.6068Z" fill="${iconColor}"/><path d="M19.6077 186.048C24.3823 190.822 30.155 194.505 36.5964 196.886C43.0377 199.267 50.0215 200.3 57.149 199.925C64.2764 199.549 71.408 197.774 78.1364 194.7C84.8649 191.626 91.0585 187.313 96.3636 182.008C101.669 176.703 105.981 170.509 109.056 163.781C112.13 157.052 113.905 149.921 114.28 142.793C114.655 135.666 113.623 128.682 111.242 122.241C108.861 115.799 105.178 110.027 100.403 105.252L19.6077 186.048Z" fill="${iconColor}"/><path d="M180.39 13.9519C175.616 9.17732 169.843 5.49438 163.402 3.1134C156.96 0.732422 149.977 -0.299976 142.849 0.0751547C135.722 0.450286 128.59 2.2256 121.862 5.29973C115.133 8.37386 108.94 12.6866 103.634 17.9917C98.3293 23.2969 94.0165 29.4905 90.9424 36.2189C87.8683 42.9474 86.0929 50.0789 85.7178 57.2064C85.3427 64.3338 86.3751 71.3176 88.7561 77.759C91.137 84.2003 94.82 89.9731 99.5946 94.7477L180.39 13.9519Z" fill="${iconColor}"/>`,
    'icon-5-diamond': `<path d="M100 0L200 100L100 200.001L-0.000427246 100L100 0Z" fill="${iconColor}"/>`,
    'icon-6-diamond-hollow': `<path fill-rule="evenodd" clip-rule="evenodd" d="M200.001 100L100 0L0 100L100 200.001L200.001 100ZM140 64C140 61.7909 138.209 60 136 60H64C61.7909 60 60 61.7909 60 64V136C60 138.209 61.7909 140 64 140H136C138.209 140 140 138.209 140 136V64Z" fill="${iconColor}"/>`,
    'icon-7-cross': `<path d="M130 0H70V70H2.62268e-06L0 130H70V200H130V130H200V70H130V0Z" fill="${iconColor}"/>`,
    'icon-8-blocks': `<path d="M150 4.37114e-06V50L50 50L50 0L150 4.37114e-06Z" fill="${iconColor}"/><path d="M50 150L50 50L0 50V150H50Z" fill="${iconColor}"/><path d="M150 150V50H200V150H150Z" fill="${iconColor}"/><path d="M150 150H50L50 200H150V150Z" fill="${iconColor}"/>`,
    'icon-9-star-classic': `<path d="M100 4.99998L127.194 72.6423L200 77.5735L144 124.31L161.803 195L100 156.242L38.1966 195L56 124.31L0 77.5735L72.8065 72.6423L100 4.99998Z" fill="${iconColor}"/>`,
    'icon-10-star-8point': `<path d="M58.5786 -1.1703e-05L100 31.4846L141.421 -1.52588e-05L148.448 51.5523L200 58.5786L168.515 100L200 141.421L148.448 148.448L141.421 200L100 168.515L58.5786 200L51.5523 148.448L3.55575e-06 141.421L31.4846 100L0 58.5786L51.5523 51.5523L58.5786 -1.1703e-05Z" fill="${iconColor}"/>`,
    'icon-11-star-curved': `<path d="M15.5351 188.281C56.1889 157.612 76.5158 142.278 100 142.278C123.485 142.278 143.812 157.612 184.466 188.281L200 200L188.281 184.466C157.612 143.812 142.278 123.485 142.278 100C142.278 76.5158 157.612 56.1889 188.281 15.5352L200 0.000497704L184.466 11.7195C143.812 42.3881 123.485 57.7225 100 57.7225C76.5158 57.7225 56.1889 42.3881 15.5351 11.7195L0 3.05176e-05L11.7194 15.5351C42.3881 56.1889 57.7224 76.5158 57.7224 100C57.7224 123.485 42.3881 143.812 11.7195 184.466L0.000396729 200L15.5351 188.281Z" fill="${iconColor}"/>`,
    'icon-12-star-burst': `<path d="M115.13 60.5209L100 0L84.8699 60.5205L46.2607 46.2595L60.522 84.8695L0 100L60.5213 115.13L46.2602 153.74L84.8696 139.479L100 200L115.13 139.478L153.741 153.74L139.48 115.13L200 100L139.479 84.8697L153.74 46.2595L115.13 60.5209Z" fill="${iconColor}"/>`,
    'icon-13-sparkle': `<path d="M100 0C112.424 62.3824 137.256 87.4559 200 100C137.241 112.544 112.409 137.618 100 200C87.5765 137.618 62.744 112.529 0 100C62.7585 87.4559 87.591 62.3824 100 0Z" fill="${iconColor}"/>`,
    'icon-14-star-twirl': `<path d="M199.686 0.31543C144.773 55.5693 144.877 144.877 200 200C144.877 144.877 55.5684 144.771 0.314453 199.685C55.2266 144.432 55.123 55.123 0 0C55.123 55.123 144.432 55.2295 199.686 0.31543Z" fill="${iconColor}"/>`,
    'icon-15-star-rounded': `<path d="M100 0C107.13 31.5634 143.35 46.5666 170.711 29.2893C153.433 56.6495 168.437 92.8703 200 100C168.437 107.13 153.433 143.35 170.711 170.711C143.35 153.433 107.13 168.437 100 200C92.8703 168.437 56.6495 153.433 29.2893 170.711C46.5666 143.35 31.5634 107.13 0 100C31.5634 92.8703 46.5666 56.6495 29.2893 29.2893C56.6495 46.5666 92.8703 31.5634 100 0Z" fill="${iconColor}"/>`,
    'icon-16-wheel-plus': `<path fill-rule="evenodd" clip-rule="evenodd" d="M120 0H80V51.7157L43.4315 15.1472L15.1472 43.4314L51.7158 80H0V120H51.7157L15.1472 156.568L43.4315 184.853L80 148.284V200H120V148.284L156.569 184.853L184.853 156.569L148.284 120H200V80H148.284L184.853 43.4314L156.569 15.1471L120 51.7157V0Z" fill="${iconColor}"/>`,
    'icon-17-wheel-x': `<path d="M108 0H92V80.6865L34.9458 23.6323L23.6321 34.9461L80.6861 92H0V108H80.6863L23.6324 165.054L34.9461 176.368L92 119.314V200H108V119.314L165.053 176.367L176.367 165.054L119.313 108H200V92H119.314L176.367 34.9463L165.054 23.6326L108 80.6863V0Z" fill="${iconColor}"/>`,
  };
  
  return iconPaths[iconName] || iconPaths['icon-1-ellipse'];
}
