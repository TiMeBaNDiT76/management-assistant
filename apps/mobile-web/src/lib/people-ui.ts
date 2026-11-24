/**
 * UI helpers for the People module (see /mockups/050-people/).
 *
 * Employees store master-data *keys* in `role`, `department` and `location`
 * (single source of truth, same contract as relationship types); the screens
 * resolve them to the German `displayName` for rendering. Unknown or
 * deactivated values are never dropped — they fall back to the raw stored
 * value so a stale reference stays visible instead of silently disappearing.
 */
import type { MasterDataEntryWithUsage } from "@mgmt/shared";

/** Value of an unassigned select ("nicht zugeordnet" / "Alle …"). */
export const NO_SELECTION = "";
/** Label of the empty option in create/edit dialogs. */
export const NO_SELECTION_LABEL = "— nicht zugeordnet —";
/** Rows per page of the employee list (mockup: five entries per page). */
export const PEOPLE_PAGE_SIZE = 5;
/** The API caps a single employees page at 100 rows (`paginationSchema`). */
export const PEOPLE_MAX_ROWS = 100;

export interface SelectOptionLike {
  value: string;
  label: string;
}

/** Minimal RFC 5322-ish check — the API validates the real format. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** `YYYY-MM-DD` incl. a real calendar-date round trip (API uses `z.iso.date`). */
export function isIsoDate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === trimmed;
}

/**
 * Resolves a stored master-data key to its display name.
 * Returns the raw stored value when it no longer exists (stale reference)
 * and `null` for empty values.
 */
export function resolveMasterDataLabel(
  entries: MasterDataEntryWithUsage[] | undefined,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const hit = entries?.find((entry) => entry.key === value);
  return hit ? hit.displayName : value;
}

interface SelectOptionsConfig {
  /** Only active entries are newly selectable (inactive stay resolvable). */
  activeOnly?: boolean;
  /** Prefix option, e.g. "Alle Abteilungen". */
  emptyLabel?: string;
}

/** Master-data entries → `OptionSelect` options (`displayName` as label). */
export function toSelectOptions(
  entries: MasterDataEntryWithUsage[] | undefined,
  config: SelectOptionsConfig = {},
): SelectOptionLike[] {
  const source = (entries ?? []).filter((entry) => (config.activeOnly ? entry.isActive : true));
  const options = source.map((entry) => ({ value: entry.key, label: entry.displayName }));
  return config.emptyLabel
    ? [{ value: NO_SELECTION, label: config.emptyLabel }, ...options]
    : options;
}

/**
 * Keeps a stored-but-deactivated value selectable in edit dialogs so the user
 * sees the stale reference ("… (inaktiv)") instead of an empty field.
 */
export function ensureCurrentOption(
  options: SelectOptionLike[],
  entries: MasterDataEntryWithUsage[] | undefined,
  current: string,
): SelectOptionLike[] {
  if (!current || options.some((option) => option.value === current)) return options;
  const label = resolveMasterDataLabel(entries, current) ?? current;
  return [...options, { value: current, label: `${label} (inaktiv)` }];
}

/**
 * Maps a tRPC error from the employees module to a German user-facing
 * message (CONFLICT is keyed on the server message because the service
 * reuses it for duplicate e-mails).
 */
export function getEmployeeErrorMessage(error: unknown): string {
  const data = (error as { data?: { code?: string } } | null | undefined)?.data;
  const message = (error as { message?: string } | null | undefined)?.message ?? "";
  switch (data?.code) {
    case "CONFLICT":
      if (/email/i.test(message)) {
        return "E-Mail-Adresse ist bereits hinterlegt — bitte eine andere verwenden.";
      }
      return "Die Person ist bereits vorhanden.";
    case "NOT_FOUND":
      return "Person nicht gefunden. Sie wurde möglicherweise bereits gelöscht.";
    case "BAD_REQUEST":
      return "Die Eingaben sind ungültig — bitte prüfe die markierten Felder.";
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "Keine Berechtigung für diese Aktion.";
    default:
      return "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
  }
}

/**
 * Page numbers around the current page with "…" gaps, e.g. `1 … 4 5 6 … 20`.
 * Used by the mockup's page stepper (five entries per page).
 */
export function pageWindow(current: number, total: number, max = 5): (number | "…")[] {
  if (total <= 1) return total <= 0 ? [] : [1];
  if (total <= max) return Array.from({ length: total }, (_, index) => index + 1);
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  let end = start + max - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - max + 1);
  }
  const pages: (number | "…")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total) {
    if (end < total - 1) pages.push("…");
    pages.push(total);
  }
  return pages;
}

/** "1–5 von 24 Mitarbeitern" (mockup pagination copy). */
export function formatPersonRange(from: number, to: number, total: number): string {
  return `${from}–${to} von ${total} ${total === 1 ? "Mitarbeiter" : "Mitarbeitern"}`;
}
