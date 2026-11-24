/**
 * NativeWind/Tailwind theme derived from the design palette in `/mockups`
 * (see the mockups' _palette.css — MudBlazor-like light theme).
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --mud-primary / -dark / -soft
        primary: {
          DEFAULT: "#2C6CBF",
          dark: "#1F4F8F",
          soft: "#E8F0FB",
        },
        secondary: "#6C757D",
        success: "#2E7D32",
        warning: "#ED9D00",
        error: "#D32F2F",
        info: "#0288D1",
        // --mud-text / -secondary / -disabled
        ink: {
          DEFAULT: "#27243B",
          secondary: "#6E6A7F",
          disabled: "#9C99AA",
        },
        // --mud-background / -surface / -divider
        canvas: "#F4F7FB",
        surface: "#FFFFFF",
        divider: "#E8E7EF",
      },
      borderRadius: {
        mud: "8px",
        mudlg: "12px",
      },
    },
  },
  plugins: [],
};
