import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || (Constants as any).manifest?.extra?.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "https://mbwuoqoktdgudzaemjhx.supabase.co";
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || (Constants as any).manifest?.extra?.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3VvcW9rdGRndWR6YWVtamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTE4MzAsImV4cCI6MjA3NjE4NzgzMH0.aAWDr1SkB-isZUJGMFHGPrcLIQaa9zOGwOif3Btz7-0";

console.log('🔧 Supabase Client Config:', {
  url: SUPABASE_URL,
  keyLength: SUPABASE_ANON_KEY?.length,
  source: Constants.expoConfig?.extra?.SUPABASE_URL ? 'expoConfig' : (Constants as any).manifest?.extra?.SUPABASE_URL ? 'manifest' : process.env.EXPO_PUBLIC_SUPABASE_URL ? 'env' : 'fallback'
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
