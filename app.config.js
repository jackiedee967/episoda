const traktClientId = process.env.TRAKT_CLIENT_ID || '235d184cb03ded3292ed89fe4347e3452a3087027d76f5edd13bdb65ccf2d456';

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
    plugins: ["expo-font", "expo-router", "expo-web-browser", "expo-dev-client"],
    scheme: "episoda",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      traktClientId: traktClientId,
      eas: {
        projectId: "97b05198-6f1d-4374-b216-f0b119eb3c0c"
      }
    },
  },
  scheme: "EPISODA",
};
