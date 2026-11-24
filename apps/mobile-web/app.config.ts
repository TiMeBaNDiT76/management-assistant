/**
 * Expo app config.
 *
 * Moved from app.json so `experiments.baseUrl` can be driven by the
 * EXPO_PUBLIC_BASE_URL environment variable at export time. The API's
 * static export is served from a GCS bucket subpath
 * (e.g. /managerassistant-web-test), where the bucket name is the first
 * path segment; without the prefix, asset URLs like /_expo/static/...
 * resolve against the domain root and fail with 400.
 *
 * When EXPO_PUBLIC_BASE_URL is unset (local dev), baseUrl stays empty
 * and asset paths remain absolute from the domain root.
 */
module.exports = {
  name: "Management Assistant",
  slug: "management-assistant",
  version: "0.1.0",
  scheme: "management-assistant",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  platforms: ["ios", "android", "web"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.example.managementassistant",
  },
  android: {
    package: "com.example.managementassistant",
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: false,
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL || "",
  },
};
