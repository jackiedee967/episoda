import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

const followRelationshipsByUsername = [
  { follower: 'jackie', following: 'max' },
  { follower: 'max', following: 'jackie' },
  { follower: 'max', following: 'mia' },
  { follower: 'jackie', following: 'mia' },
  { follower: 'mia', following: 'liz' },
  { follower: 'liz', following: 'jackie' },
  { follower: 'liz', following: 'max' },
];

async function seedMockUsers() {
  console.log('🌱 Starting mock user seeding...\n');

  console.log('📝 Creating auth users and profiles...');
  for (const user of mockUsers) {
    const avatarConfig = generateRandomAvatarConfig();
    
    let createdUserId;
    const userEmail = `${user.username}@episoda-mock.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      user_metadata: {},
      email: userEmail,
      email_confirm: true,
    } as any);

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('User already registered')) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', user.username)
          .single();
        
        createdUserId = existingProfile?.user_id;
        
        if (!createdUserId) {
          console.error(`❌ Auth user exists but profile not found for ${user.username}`);
          continue;
        }
        console.log(`ℹ️  Auth user already exists: ${user.username} (${createdUserId})`);
      } else {
        console.error(`❌ Error creating auth user ${user.username}:`, authError.message);
        continue;
      }
    } else {
      createdUserId = authData?.user?.id;
      console.log(`✅ Created auth user: ${user.username} (${createdUserId})`);
    }

    if (!createdUserId) {
      console.error(`❌ Missing user ID for ${user.username}, skipping profile creation`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: createdUserId,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_color_scheme: avatarConfig.colorSchemeId,
        avatar_icon: avatarConfig.iconName,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'username' });

    if (error) {
      console.error(`❌ Error creating profile ${user.username}:`, error.message);
    } else {
      console.log(`✅ Created/updated profile: ${user.username} (${user.display_name})`);
      console.log(`   Avatar: scheme=${avatarConfig.colorSchemeId}, icon=${avatarConfig.iconName}`);
      
      user.id = createdUserId || user.id;
    }
  }

  console.log('\n🔗 Setting up follow relationships...');
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', mockUsers.map(u => u.username));

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message);
    return;
  }

  for (const rel of followRelationshipsByUsername) {
    const followerProfile = allProfiles?.find(p => p.username === rel.follower);
    const followingProfile = allProfiles?.find(p => p.username === rel.following);

    if (!followerProfile || !followingProfile) {
      console.error(`❌ Could not find profiles for ${rel.follower} → ${rel.following}`);
      continue;
    }

    const { data, error } = await supabase
      .from('follows')
      .upsert({
        follower_id: followerProfile.user_id,
        following_id: followingProfile.user_id,
        created_at: new Date().toISOString(),
      }, { onConflict: 'follower_id,following_id' });

    if (error) {
      console.error(`❌ Error creating follow relationship:`, error.message);
    } else {
      console.log(`✅ ${rel.follower} → ${rel.following}`);
    }
  }

  console.log('\n✅ Verifying seeded data...');
  const { data: verifyProfiles } = await supabase
    .from('profiles')
    .select('username, user_id')
    .in('username', mockUsers.map(u => u.username));
  
  const profileUserIds = verifyProfiles?.map(p => p.user_id) || [];
  const { data: verifyFollows } = await supabase
    .from('follows')
    .select('follower_id, following_id')
    .in('follower_id', profileUserIds);

  console.log(`   Profiles in database: ${verifyProfiles?.length || 0}/${mockUsers.length}`);
  console.log(`   Follow relationships: ${verifyFollows?.length || 0}/${followRelationshipsByUsername.length}`);

  console.log('\n✨ Mock user seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   • Created ${mockUsers.length} mock users`);
  console.log(`   • Set up ${followRelationshipsByUsername.length} follow relationships`);
  console.log(`   • All users have auto-generated profile pictures`);
  console.log('\n💡 You can now follow these users in your app!');
}

seedMockUsers().catch(console.error);
