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
