/**
 * Generates a stable machine key (slug) from a display name.
 *
 * German umlauts are transliterated (`ä` → `ae`, `ö` → `oe`, `ü` → `ue`,
 * `ß` → `ss`), remaining diacritics are stripped, and all non-alphanumeric
 * runs collapse to a single `-`. Returns `"entry"` when nothing survives
 * (e.g. a display name consisting solely of punctuation) — duplicate handling
 * is the caller's concern (unique index per tenant+category).
 */
export function slugifyKey(input: string): string {
  const transliterated = input
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "entry";
}
