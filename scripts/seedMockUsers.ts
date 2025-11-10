import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COLOR_SCHEMES = [
  { id: 1, icon: '#FFF2F3', base: '#FF135E' },
  { id: 2, icon: '#FFE5F3', base: '#C20081' },
  { id: 3, icon: '#DEE8FF', base: '#1700C6' },
  { id: 4, icon: '#DEFFA0', base: '#0F6100' },
  { id: 5, icon: '#FAF5FF', base: '#9334E9' },
  { id: 6, icon: '#FFF3EF', base: '#FF5E00' },
  { id: 7, icon: '#FFE2E2', base: '#C20003' },
];

const ICON_NAMES = [
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

function generateRandomAvatarConfig() {
  const randomColorScheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
  const randomIconName = ICON_NAMES[Math.floor(Math.random() * ICON_NAMES.length)];

  return {
    colorSchemeId: randomColorScheme.id,
    iconName: randomIconName,
  };
}

const mockUsers = [
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    username: 'jackie',
    display_name: 'Jackie',
    bio: 'Reality TV addict 🌴',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    username: 'max',
    display_name: 'Max',
    bio: 'Binge watcher extraordinaire 📺',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    username: 'mia',
    display_name: 'Mia',
    bio: 'Drama lover 💕',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    username: 'liz',
    display_name: 'Liz',
    bio: 'TV show theorist 🔍',
  },
];

const followRelationships = [
  { follower: 'a0000000-0000-0000-0000-000000000002', following: 'a0000000-0000-0000-0000-000000000003' },
  { follower: 'a0000000-0000-0000-0000-000000000003', following: 'a0000000-0000-0000-0000-000000000002' },
  { follower: 'a0000000-0000-0000-0000-000000000003', following: 'a0000000-0000-0000-0000-000000000004' },
  { follower: 'a0000000-0000-0000-0000-000000000002', following: 'a0000000-0000-0000-0000-000000000004' },
  { follower: 'a0000000-0000-0000-0000-000000000004', following: 'a0000000-0000-0000-0000-000000000005' },
  { follower: 'a0000000-0000-0000-0000-000000000005', following: 'a0000000-0000-0000-0000-000000000002' },
  { follower: 'a0000000-0000-0000-0000-000000000005', following: 'a0000000-0000-0000-0000-000000000003' },
];

async function seedMockUsers() {
  console.log('🌱 Starting mock user seeding...\n');

  console.log('📝 Creating mock users in profiles table...');
  for (const user of mockUsers) {
    const avatarConfig = generateRandomAvatarConfig();
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        user_id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_color_scheme: avatarConfig.colorSchemeId,
        avatar_icon: avatarConfig.iconName,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error creating user ${user.username}:`, error.message);
    } else {
      console.log(`✅ Created/updated user: ${user.username} (${user.display_name})`);
      console.log(`   Avatar: scheme=${avatarConfig.colorSchemeId}, icon=${avatarConfig.iconName}`);
    }
  }

  console.log('\n🔗 Setting up follow relationships...');
  for (const rel of followRelationships) {
    const { data, error } = await supabase
      .from('follows')
      .upsert({
        follower_id: rel.follower,
        following_id: rel.following,
        created_at: new Date().toISOString(),
      }, { onConflict: 'follower_id,following_id' });

    if (error) {
      console.error(`❌ Error creating follow relationship:`, error.message);
    } else {
      const followerUser = mockUsers.find(u => u.id === rel.follower);
      const followingUser = mockUsers.find(u => u.id === rel.following);
      console.log(`✅ ${followerUser?.username} → ${followingUser?.username}`);
    }
  }

  console.log('\n✨ Mock user seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   • Created ${mockUsers.length} mock users`);
  console.log(`   • Set up ${followRelationships.length} follow relationships`);
  console.log(`   • All users have auto-generated profile pictures`);
  console.log('\n💡 You can now follow these users in your app!');
}

seedMockUsers().catch(console.error);
