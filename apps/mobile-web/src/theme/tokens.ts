/**
 * Design tokens — mirrored from the mockup palette (see `/mockups` _palette.css).
 * Keep in sync with `tailwind.config.js` (single source of truth for TS).
 */
export const colors = {
  primary: { DEFAULT: "#2C6CBF", dark: "#1F4F8F", soft: "#E8F0FB" },
  success: "#2E7D32",
  warning: "#ED9D00",
  error: "#D32F2F",
  info: "#0288D1",
  ink: "#27243B",
  inkSecondary: "#6E6A7F",
  inkDisabled: "#9C99AA",
  canvas: "#F4F7FB",
  surface: "#FFFFFF",
  divider: "#E8E7EF",
} as const;

export const spacing = { s: 4, m: 8, l: 12, xl: 16, xxl: 24 } as const;

export const radii = { md: 8, lg: 12 } as const;
