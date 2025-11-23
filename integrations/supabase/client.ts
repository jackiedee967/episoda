import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants';

// PRODUCTION CREDENTIALS - Use EXPO_PUBLIC_ env vars accessible to Expo bundler
const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || 
                     (Constants as any).manifest?.extra?.SUPABASE_URL || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || 
                          (Constants as any).manifest?.extra?.SUPABASE_ANON_KEY || 
                          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// PRODUCTION GUARD: Fail-fast if credentials missing or using DEV instance
const DEV_URL = 'https://mbwuoqoktdgudzaemjhx.supabase.co';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '🚨 CRITICAL: Missing Supabase credentials!\n' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n' +
    'Add them to your environment variables (Replit Secrets or .env file).'
  );
}

if (SUPABASE_URL === DEV_URL) {
  throw new Error(
    '🚨 CRITICAL: App is using DEV Supabase instance!\n' +
    'This will break 2FA and user data. Check your EXPO_PUBLIC_SUPABASE_URL environment variable.'
  );
}

console.log('✅ Supabase Client initialized:', {
  url: SUPABASE_URL.substring(0, 30) + '...',
  keyLength: SUPABASE_ANON_KEY.length,
  isProd: SUPABASE_URL !== DEV_URL
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
