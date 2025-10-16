import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://mbwuoqoktdgudzaemjhx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id3VvcW9rdGRndWR6YWVtamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTE4MzAsImV4cCI6MjA3NjE4NzgzMH0.aAWDr1SkB-isZUJGMFHGPrcLIQaa9zOGwOif3Btz7-0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
