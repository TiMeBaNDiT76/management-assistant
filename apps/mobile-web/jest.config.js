/**
 * Jest setup for the Expo app (Jest + React Native Testing Library).
 * The jest-expo preset handles React Native transforms and mocks.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.test.{ts,tsx}"],
  // Slow CI runners can exceed Jest's 5s default on render-heavy RNTL suites.
  testTimeout: 15000,
  setupFiles: ["./jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!react-native|@react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|react-native-css-interop|nativewind|@tanstack|@trpc|react-server-dom)",
  ],
};
