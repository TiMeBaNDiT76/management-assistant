/* eslint-disable no-undef */
// Global Jest setup for the Expo app.

// Safe-area context needs no native module in tests.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
    SafeAreaFrameContext: React.createContext(insets),
  };
});
