import { SimpleTextEditor } from "../../../components/stammdaten/SimpleTextEditor";

/**
 * Abteilungen-Editor (see /mockups/070-stammdaten/stammdaten-abteilungen.html):
 * Anzeigename/Beschreibung/Aktiv, Einfachauswahl an der Person, Personenzähler.
 */
export default function AbteilungenScreen() {
  return (
    <SimpleTextEditor
      category="department"
      eyebrow="Stammdaten · People"
      title="Abteilungen"
      subtitle="Organisationsbereiche für die Zuordnung an Personen, Profile und People-Liste."
      createLabel="＋ Abteilung anlegen"
      emptyActionLabel="Erste Abteilung anlegen"
      footerNote="Einfachauswahl an der Person"
      singularNoun="Abteilung"
    />
  );
}
