/**
 * UI helpers for the Stammdaten module (see /mockups/070-stammdaten/).
 *
 * Category metadata drives the overview cards and editor headers; the error
 * mapping translates tRPC error codes into German user-facing messages.
 */
import type { MasterDataCategory } from "@mgmt/shared";

export interface MasterDataCategoryMeta {
  category: MasterDataCategory;
  /** Card / editor title, e.g. "Rollen". */
  title: string;
  /** Expo Router path of the type-specific editor. */
  editorRoute: string;
  /** Ionicons name used on the overview card. */
  icon: string;
  /** Overview card description (mockup copy). */
  description: string;
  /** Card footer link, e.g. "Rollen verwalten". */
  manageLabel: string;
  /** Unit of the "Verwendet von N …" counter; `null` when nothing references the category. */
  usageUnit: { singular: string; plural: string } | null;
}

/** Overview card order follows the mockup (stammdaten-app.html). */
export const MASTER_DATA_CATEGORY_ORDER: MasterDataCategory[] = [
  "location",
  "role",
  "department",
  "relationship_type",
  "appointment_type",
  "task_status",
  "holiday",
  "country",
];

export const MASTER_DATA_CATEGORY_META: Record<
  MasterDataCategory,
  MasterDataCategoryMeta
> = {
  location: {
    category: "location",
    title: "Standorte",
    editorRoute: "/stammdaten/standorte",
    icon: "location-outline",
    description: "Landzuordnung, Farbe, Schlüssel und Personenzahl je Einsatzort.",
    manageLabel: "Standorte verwalten",
    usageUnit: { singular: "Person", plural: "Personen" },
  },
  role: {
    category: "role",
    title: "Rollen",
    editorRoute: "/stammdaten/rollen",
    icon: "people-outline",
    description: "Multi-Select an der Person; Anzeigename, Beschreibung und Aktivstatus.",
    manageLabel: "Rollen verwalten",
    usageUnit: { singular: "Person", plural: "Personen" },
  },
  department: {
    category: "department",
    title: "Abteilungen",
    editorRoute: "/stammdaten/abteilungen",
    icon: "business-outline",
    description: "Einfachauswahl an der Person; Organisationsbereich und Beschreibung.",
    manageLabel: "Abteilungen verwalten",
    usageUnit: { singular: "Person", plural: "Personen" },
  },
  relationship_type: {
    category: "relationship_type",
    title: "Beziehungstypen",
    editorRoute: "/stammdaten/beziehungstypen",
    icon: "git-network-outline",
    description: "Singular und Plural für People-Beziehungen, Filter und Chips.",
    manageLabel: "Typen verwalten",
    usageUnit: { singular: "Beziehung", plural: "Beziehungen" },
  },
  appointment_type: {
    category: "appointment_type",
    title: "Terminarten",
    editorRoute: "/stammdaten/terminarten",
    icon: "time-outline",
    description: "Gesprächsart mit Kalenderfarbe und Frequenz-Hinweis, ohne automatische Serie.",
    manageLabel: "Terminarten verwalten",
    usageUnit: { singular: "Gespräch", plural: "Gespräche" },
  },
  task_status: {
    category: "task_status",
    title: "Task-Status",
    editorRoute: "/stammdaten/task-status",
    icon: "layers-outline",
    description: "Kanban-Spalten, Reihenfolge und Erledigt-Markierung.",
    manageLabel: "Status verwalten",
    usageUnit: { singular: "Task", plural: "Tasks" },
  },
  holiday: {
    category: "holiday",
    title: "Feiertage",
    editorRoute: "/stammdaten/feiertage",
    icon: "calendar-outline",
    description: "Kalender pro Jahr, Land oder Standort; importierte Beispiele bleiben bearbeitbar.",
    manageLabel: "Feiertage verwalten",
    usageUnit: null,
  },
  country: {
    category: "country",
    title: "Länder",
    editorRoute: "/stammdaten/laender",
    icon: "globe-outline",
    description: "ISO-Ländercodes, explizite Standortzuordnung und Feiertags-Scope.",
    manageLabel: "Länder verwalten",
    usageUnit: null,
  },
};

/** "Verwendet von N …" counter with singular/plural handling. */
export function formatUsageCount(
  count: number,
  unit: { singular: string; plural: string },
): string {
  return count === 1 ? `1 ${unit.singular}` : `${count} ${unit.plural}`;
}

/** ISO date (YYYY-MM-DD) → German display (DD.MM.YYYY). Falls back to the raw value. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}

export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/**
 * Maps a tRPC error (e.g. from a failed mutation) to a German user-facing
 * message. Server messages from the master-data service are matched against
 * known shapes; anything unknown falls back to a generic hint.
 */
export function getMasterDataErrorMessage(error: unknown): string {
  const data = (error as { data?: { code?: string } } | null | undefined)?.data;
  const message = (error as { message?: string } | null | undefined)?.message ?? "";
  switch (data?.code) {
    case "CONFLICT":
      if (/the key/.test(message)) {
        return "Schlüssel bereits vorhanden — bitte einen eindeutigen Schlüssel wählen.";
      }
      if (/cannot be deleted/.test(message)) {
        return "Der Eintrag wird verwendet und kann nicht gelöscht werden — bitte deaktiviere ihn stattdessen.";
      }
      return "Name bereits vorhanden";
    case "NOT_FOUND":
      return "Eintrag nicht gefunden. Er wurde möglicherweise bereits gelöscht.";
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "Keine Berechtigung für diese Aktion.";
    default:
      return "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
  }
}
