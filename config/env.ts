// Environment configuration that works reliably across all platforms
// Uses Constants.expoConfig.extra for Expo apps (populated from app.config.js)

import Constants from 'expo-constants';

const getTraktClientId = () => {
  const key = 
    process.env.TRAKT_CLIENT_ID ||
    Constants.expoConfig?.extra?.traktClientId ||
    (Constants.manifest as any)?.extra?.traktClientId ||
    '';
  return key;
};

export const ENV = {
  TRAKT_CLIENT_ID: getTraktClientId(),
  TRAKT_CLIENT_SECRET: process.env.TRAKT_CLIENT_SECRET || '',
  OMDB_API_KEY: process.env.OMDB_API_KEY || '',
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
} as const;

export default ENV;
