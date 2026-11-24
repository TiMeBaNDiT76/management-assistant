import { SimpleTextEditor } from "../../../components/stammdaten/SimpleTextEditor";

/**
 * Rollen-Editor (see /mockups/070-stammdaten/stammdaten-rollen.html):
 * Anzeigename/Beschreibung/Aktiv, Multi-Select an der Person, Personenzähler.
 */
export default function RollenScreen() {
  return (
    <SimpleTextEditor
      category="role"
      eyebrow="Stammdaten · People"
      title="Rollen"
      subtitle="Rollen sind in Personenprofilen mehrfach auswählbar. Anzeigename und Beschreibung steuern die redaktionelle Darstellung."
      createLabel="＋ Rolle anlegen"
      emptyActionLabel="Erste Rolle anlegen"
      footerNote="Mehrfachauswahl an der Person"
      singularNoun="Rolle"
    />
  );
}
