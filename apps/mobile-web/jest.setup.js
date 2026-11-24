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

// AsyncStorage ships native code — the auth layer only needs an in-memory
// stub in tests (Firebase persistence is never exercised against a real
// native module here).
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => store.get(key) ?? null),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});
