import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants';

// Database Configuration
// Development: atzrteveximvujzoneuu (EPISODA-Dev)
// Production: mbwuoqoktdgudzaemjhx (EPISODA-Prod)
const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || 
                     (Constants as any).manifest?.extra?.SUPABASE_URL || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || 
                          (Constants as any).manifest?.extra?.SUPABASE_ANON_KEY || 
                          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail-fast if credentials missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '🚨 CRITICAL: Missing Supabase credentials!\n' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n' +
    'Add them to your environment variables (Replit Secrets or .env file).'
  );
}

// Identify which database we're connected to
const isDev = SUPABASE_URL.includes('atzrteveximvujzoneuu');
const dbName = isDev ? 'EPISODA-Dev' : 'EPISODA-Prod';

console.log(`🔌 SUPABASE CONNECTION: ${dbName}`, {
  environment: isDev ? '✅ DEVELOPMENT' : '⚠️ PRODUCTION',
  fullUrl: SUPABASE_URL
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
