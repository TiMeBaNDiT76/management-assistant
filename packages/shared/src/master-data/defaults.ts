import { eq } from "drizzle-orm";
import {
  MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
  type MasterDataCategory,
} from "../constants";
import { masterDataEntries } from "../db/schema";
import type { AppDatabase } from "../db/types";
import type { NewMasterDataEntry } from "../types";
import { slugifyKey } from "./slug";

/**
 * Per-tenant seed defaults for the master data module (Stammdaten).
 *
 * German display names are tenant-facing *data* (not schema) and live here on
 * purpose. Machine `key`s of the categories `relationship_type`,
 * `appointment_type` and `task_status` mirror the existing enum values
 * (`EMPLOYEE_RELATIONSHIP_TYPES`, `CONVERSATION_TYPES`, `ACTION_ITEM_STATUSES`)
 * so migrating referencing tables to master data keys is a no-op rename.
 *
 * Holiday dates are stamped for 2026; tenants can edit or extend them at
 * runtime. Countries/locations/roles are deliberately small, generic sets.
 */
export interface MasterDataSeedEntry {
  category: MasterDataCategory;
  /** Stable machine key. For enum-backed categories this MUST be the enum value. Slugged from the display name when omitted. */
  key?: string;
  displayName: string;
  pluralLabel?: string | null;
  description?: string | null;
  colorHex?: string | null;
  frequency?: string | null;
  isDone?: boolean;
  sortOrder: number;
  countryIso?: string | null;
  scope?: string | null;
  date?: string | null;
}

/** Seed dataset covering all 8 categories (`is_done` only on "done"). */
export const MASTER_DATA_SEEDS: readonly MasterDataSeedEntry[] = [
  // --- role ---------------------------------------------------------------
  {
    category: "role",
    key: "teamleitung",
    displayName: "Teamleitung",
    pluralLabel: "Teamleitungen",
    description: "Führt ein Team und trägt Personalverantwortung.",
    sortOrder: 10,
  },
  {
    category: "role",
    key: "teammitglied",
    displayName: "Teammitglied",
    pluralLabel: "Teammitglieder",
    description: "Mitglied eines Teams ohne Personalverantwortung.",
    sortOrder: 20,
  },
  {
    category: "role",
    key: "extern",
    displayName: "Extern",
    pluralLabel: "Externe",
    description: "Externe Begleitung ohne Anstellungsverhältnis.",
    sortOrder: 30,
  },

  // --- department ----------------------------------------------------------
  {
    category: "department",
    key: "geschaeftsfuehrung",
    displayName: "Geschäftsführung",
    description: "Obere Führungsebene des Unternehmens.",
    sortOrder: 10,
  },
  {
    category: "department",
    key: "entwicklung",
    displayName: "Entwicklung",
    pluralLabel: "Entwicklungsteams",
    description: "Produkt- und Softwareentwicklung.",
    sortOrder: 20,
  },
  {
    category: "department",
    key: "vertrieb",
    displayName: "Vertrieb",
    description: "Kundengewinnung und -betreuung.",
    sortOrder: 30,
  },
  {
    category: "department",
    key: "personal",
    displayName: "Personal",
    description: "Recruiting und Personalentwicklung.",
    sortOrder: 40,
  },
  {
    category: "department",
    key: "finanzen",
    displayName: "Finanzen",
    description: "Buchhaltung und Controlling.",
    sortOrder: 50,
  },

  // --- relationship_type (keys mirror EMPLOYEE_RELATIONSHIP_TYPES) ---------
  {
    category: "relationship_type",
    key: "reports_to",
    displayName: "Weisungslinie",
    description: "Hierarchische Führungsbeziehung (berichtet an).",
    sortOrder: 10,
  },
  {
    category: "relationship_type",
    key: "peer",
    displayName: "Peer",
    description: "Person auf derselben Hierarchieebene.",
    sortOrder: 20,
  },
  {
    category: "relationship_type",
    key: "stakeholder",
    displayName: "Stakeholder",
    description: "Betroffene Person mit Einfluss, ohne Weisungsbefugnis.",
    sortOrder: 30,
  },
  {
    category: "relationship_type",
    key: "mentor",
    displayName: "Mentor:in",
    description: "Erfahrene Begleitung auf Augenhöhe.",
    sortOrder: 40,
  },
  {
    category: "relationship_type",
    key: "informal",
    displayName: "Informell",
    description: "Informelle Beziehung ohne formale Rolle.",
    sortOrder: 50,
  },

  // --- appointment_type (keys mirror CONVERSATION_TYPES) -------------------
  {
    category: "appointment_type",
    key: "one_on_one",
    displayName: "1:1 Gespräch",
    colorHex: "#3B82F6",
    frequency: "monatlich",
    description: "Regelmäßiges Einzelgespräch mit direktem Report.",
    sortOrder: 10,
  },
  {
    category: "appointment_type",
    key: "feedback",
    displayName: "Feedback-Gespräch",
    colorHex: "#F59E0B",
    frequency: "quartalsweise",
    description: "Fokussiertes Gespräch über Leistung und Verhalten.",
    sortOrder: 20,
  },
  {
    category: "appointment_type",
    key: "career",
    displayName: "Karrieregespräch",
    colorHex: "#8B5CF6",
    frequency: "jährlich",
    description: "Entwicklungs- und Karriereperspektiven.",
    sortOrder: 30,
  },
  {
    category: "appointment_type",
    key: "adhoc",
    displayName: "Spontangespräch",
    colorHex: "#10B981",
    frequency: "bei Bedarf",
    description: "Ungeplantes Gespräch im Tagesgeschäft.",
    sortOrder: 40,
  },

  // --- task_status (keys mirror ACTION_ITEM_STATUSES) ----------------------
  {
    category: "task_status",
    key: "open",
    displayName: "Offen",
    colorHex: "#64748B",
    description: "Noch nicht begonnen.",
    sortOrder: 10,
  },
  {
    category: "task_status",
    key: "in_progress",
    displayName: "In Bearbeitung",
    colorHex: "#3B82F6",
    description: "Aktiv in Arbeit.",
    sortOrder: 20,
  },
  {
    category: "task_status",
    key: "done",
    displayName: "Erledigt",
    colorHex: "#22C55E",
    isDone: true,
    description: "Abgeschlossen — beendet die Aufgabe.",
    sortOrder: 30,
  },
  {
    category: "task_status",
    key: "cancelled",
    displayName: "Abgebrochen",
    colorHex: "#EF4444",
    description: "Ohne Abschluss verworfen.",
    sortOrder: 40,
  },

  // --- location ------------------------------------------------------------
  {
    category: "location",
    key: "zentrale",
    displayName: "Zentrale",
    description: "Hauptstandort / Firmenzentrale.",
    sortOrder: 10,
  },
  {
    category: "location",
    key: "niederlassung",
    displayName: "Niederlassung",
    pluralLabel: "Niederlassungen",
    description: "Regionaler Außenstandort.",
    sortOrder: 20,
  },
  {
    category: "location",
    key: "homeoffice",
    displayName: "Homeoffice",
    description: "Mobiles Arbeiten außerhalb des Bürogebäudes.",
    sortOrder: 30,
  },
  {
    category: "location",
    key: "aussendienst",
    displayName: "Außendienst",
    description: "Unterwegs beim Kunden oder unterwegs.",
    sortOrder: 40,
  },

  // --- country -------------------------------------------------------------
  {
    category: "country",
    key: "de",
    displayName: "Deutschland",
    countryIso: "DE",
    sortOrder: 10,
  },
  {
    category: "country",
    key: "at",
    displayName: "Österreich",
    countryIso: "AT",
    sortOrder: 20,
  },
  {
    category: "country",
    key: "ch",
    displayName: "Schweiz",
    countryIso: "CH",
    sortOrder: 30,
  },

  // --- holiday (German national holidays 2026) -----------------------------
  {
    category: "holiday",
    key: "neujahr",
    displayName: "Neujahr",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-01-01",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 10,
  },
  {
    category: "holiday",
    key: "karfreitag",
    displayName: "Karfreitag",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-04-03",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 20,
  },
  {
    category: "holiday",
    key: "ostermontag",
    displayName: "Ostermontag",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-04-06",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 30,
  },
  {
    category: "holiday",
    key: "tag-der-arbeit",
    displayName: "Tag der Arbeit",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-05-01",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 40,
  },
  {
    category: "holiday",
    key: "christi-himmelfahrt",
    displayName: "Christi Himmelfahrt",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-05-14",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 50,
  },
  {
    category: "holiday",
    key: "pfingstmontag",
    displayName: "Pfingstmontag",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-05-25",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 60,
  },
  {
    category: "holiday",
    key: "tag-der-deutschen-einheit",
    displayName: "Tag der Deutschen Einheit",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-10-03",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 70,
  },
  {
    category: "holiday",
    key: "erster-weihnachtstag",
    displayName: "1. Weihnachtstag",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-12-25",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 80,
  },
  {
    category: "holiday",
    key: "zweiter-weihnachtstag",
    displayName: "2. Weihnachtstag",
    countryIso: "DE",
    scope: MASTER_DATA_HOLIDAY_SCOPE_NATIONAL,
    date: "2026-12-26",
    description: "Gesetzlicher Feiertag in Deutschland.",
    sortOrder: 90,
  },
];

/**
 * Idempotently seeds the default master data for one tenant: for every
 * category in which the tenant has **no entries at all**, the seed rows are
 * inserted (`ON CONFLICT DO NOTHING` guards the unique indexes). Categories
 * the tenant has already touched are never re-seeded, so renaming or clearing
 * defaults is preserved.
 */
export async function ensureDefaultMasterData(
  db: AppDatabase,
  ownerUserId: string,
): Promise<void> {
  const existing = await db
    .selectDistinct({ category: masterDataEntries.category })
    .from(masterDataEntries)
    .where(eq(masterDataEntries.ownerUserId, ownerUserId));
  const seededCategories = new Set(existing.map((row) => row.category));

  const missingSeeds = MASTER_DATA_SEEDS.filter(
    (seed) => !seededCategories.has(seed.category),
  );
  if (missingSeeds.length === 0) return;

  const rows: NewMasterDataEntry[] = missingSeeds.map((seed) => ({
    id: crypto.randomUUID(),
    ownerUserId,
    category: seed.category,
    key: seed.key ?? slugifyKey(seed.displayName),
    displayName: seed.displayName,
    pluralLabel: seed.pluralLabel ?? null,
    description: seed.description ?? null,
    colorHex: seed.colorHex ?? null,
    frequency: seed.frequency ?? null,
    isDone: seed.isDone ?? false,
    isActive: true,
    sortOrder: seed.sortOrder,
    countryIso: seed.countryIso ?? null,
    scope: seed.scope ?? null,
    date: seed.date ?? null,
  }));

  await db.insert(masterDataEntries).values(rows).onConflictDoNothing();
}
