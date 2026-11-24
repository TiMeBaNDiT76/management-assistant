module.exports = function (api) {
  api.cache(true);

  // Under Jest the NativeWind JSX transform (jsxImportSource) is incompatible
  // with babel-jest's mock hoisting; className props are ignored in tests.
  const isTest = process.env.NODE_ENV === "test";

  return {
    presets: isTest
      ? ["babel-preset-expo"]
      : [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
