const traktClientId = process.env.TRAKT_CLIENT_ID || '235d184cb03ded3292ed89fe4347e3452a3087027d76f5edd13bdb65ccf2d456';
const omdbApiKey = process.env.OMDB_API_KEY || '';
const tmdbApiKey = process.env.TMDB_API_KEY || '';

// PRODUCTION CREDENTIALS - No fallbacks to prevent silent DEV instance usage
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL: Missing Supabase credentials. ' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables. ' +
    'Production builds will fail without these.'
  );
}

module.exports = {
  expo: {
    name: "EPISODA",
    slug: "EPISODA",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/natively-dark.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/natively-dark.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.EPISODA",
      deploymentTarget: "15.1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/natively-dark.png",
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
      package: "com.anonymous.EPISODA",
    },
    web: {
      favicon: "./assets/images/final_quest_240x240.png",
      bundler: "metro",
    },
    plugins: [
      "expo-asset",
      "expo-font",
      "expo-router",
      "expo-web-browser",
      "expo-dev-client",
      "react-native-edge-to-edge",
      [
        "expo-notifications",
        {
          icon: "./assets/images/natively-dark.png",
          color: "#A8FF00"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1",
            buildReactNativeFromSource: true
          }
        }
      ]
    ],
    scheme: "episoda",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      traktClientId: traktClientId,
      omdbApiKey: omdbApiKey,
      tmdbApiKey: tmdbApiKey,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_ANON_KEY: supabaseAnonKey,
      eas: {
        projectId: "97b05198-6f1d-4374-b216-f0b119eb3c0c"
      }
    },
  },
  scheme: "EPISODA",
};
