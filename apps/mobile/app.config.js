/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "EcoSnap",
    slug: "ecosnap",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "ecosnap",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: { supportsTablet: true, bundleIdentifier: "com.ecosnap.app" },
    android: { package: "com.ecosnap.app", edgeToEdgeEnabled: true },
    plugins: ["expo-router"],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabasePublishableKey:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
};
