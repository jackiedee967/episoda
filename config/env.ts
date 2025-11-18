// Environment configuration that works reliably across all platforms
// Uses hardcoded fallback for Trakt since process.env doesn't work on Expo web with Metro

export const ENV = {
  // Hardcoded Trakt credentials from app.config.js (process.env doesn't work on Expo web)
  TRAKT_CLIENT_ID: '235d184cb03ded3292ed89fe4347e3452a3087027d76f5edd13bdb65ccf2d456',
  TRAKT_CLIENT_SECRET: process.env.TRAKT_CLIENT_SECRET || '',
  OMDB_API_KEY: process.env.OMDB_API_KEY || '',
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
} as const;

console.log('🔑 Trakt Client ID configured (length):', ENV.TRAKT_CLIENT_ID.length);

export default ENV;
