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

// PRODUCTION GUARD: Fail-fast if credentials missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '🚨 CRITICAL: Missing Supabase credentials!\n' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n' +
    'Add them to your environment variables (Replit Secrets or .env file).'
  );
}

console.log('✅ Supabase Client initialized:', {
  url: SUPABASE_URL.substring(0, 30) + '...',
  keyLength: SUPABASE_ANON_KEY.length
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
