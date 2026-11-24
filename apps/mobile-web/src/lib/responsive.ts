/**
 * Pure breakpoint helpers for the responsive layouts.
 *
 * Sources of truth (never modified): `/mockups/070-stammdaten/`
 * - `_palette.css`: desktop shell (AppBar 64px + 240px drawer) at 760px,
 *   see `useIsDesktop` — this file only covers grid/row level breakpoints.
 * - `stammdaten-app.html`: card grid 4 → 2 → 1 columns at 1050 / 560.
 * - `stammdaten-taskstatus.html`: status row hides the usage column at ≤900
 *   and the color label at ≤620; Kanban preview scrolls horizontally.
 */

/** Card grid: ≥1051px → 4 columns (mockup @media max-width: 1050px → 2). */
export function cardGridColumns(width: number): 1 | 2 | 4 {
  if (width > 1050) return 4;
  if (width > 560) return 2;
  return 1;
}

/** Wide two-column content split (dashboard/overview cards) at ≥1050px. */
export function isWideLayout(width: number): boolean {
  return width >= 1050;
}

/** Task-status row: "Verwendet von …" column visible only above 900px. */
export function showUsageColumn(width: number): boolean {
  return width > 900;
}

/** Task-status row: color hex label visible only above 620px. */
export function showColorLabel(width: number): boolean {
  return width > 620;
}
