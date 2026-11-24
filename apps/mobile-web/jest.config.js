/**
 * Jest setup for the Expo app (Jest + React Native Testing Library).
 * The jest-expo preset handles React Native transforms and mocks.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.test.{ts,tsx}"],
  setupFiles: ["./jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!react-native|@react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|react-native-css-interop|nativewind|@tanstack|@trpc|react-server-dom)",
  ],
};
