# Design-Review · Milestone 0.7.0 · Stammdaten-App

## Dateien

- `index.html` — Mockup-Übersicht und Einstieg in die Review-Screens
- `stammdaten-app.html` — Stammdaten-App `/m/stammdaten`, Datentyp-Karten und Zähler
- `stammdaten-standorte.html` — ausschließlich Standort-Editor: Schlüssel, Anzeigename, explizites Land (Deutschland/Polen-Select-Beispiele), Farbe und Deaktivieren
- `stammdaten-rollen.html` — Rollen-Editor mit Anzeigename/Beschreibung, Aktivstatus und Personenzähler
- `stammdaten-abteilungen.html` — Abteilungs-Editor mit Anzeigename/Beschreibung, Aktivstatus und Personenzähler
- `stammdaten-beziehungstypen.html` — Beziehungstyp-Editor mit Singular/Plural-Label und Beziehungszähler
- `stammdaten-terminarten.html` — Terminarten-Editor mit Farbe/Live-Preview und redaktioneller Frequenz
- `stammdaten-taskstatus.html` — sortierbare Task-Status, `isDone`, Farben und Kanban-Vorschau
- `stammdaten-feiertage.html` — Jahresliste mit Landes- und Standort-Scope, Deutschland-/Polen-Beispielen
- `stammdaten-land.html` — Länderübersicht und Standort-Abhängigkeiten
- `kanban-dynamisch.html` — 5-Spalten-Standard sowie optionale 6. Spalte „Später“
- `dialoge-konsum.html` — People-Rollen/Abteilung, Gesprächs-Terminart/Frequenz, Land-/Standortauswahl
- `_palette.css` — MudBlazor-inspirierte Slate/Blau Tokens und 060-Struktur

Alle Ansichten sind statische HTML/CSS-Dateien ohne JavaScript-Abhängigkeit. Screens enthalten Interaktions-, MudBlazor- und Kantenzustandsnotizen.

## Entscheide / Mockup-Defaults

- **Stammdaten als Modul:** ein Drawer-Eintrag „Stammdaten“ öffnet `/m/stammdaten`; eine Karte pro Typ führt zum Editor. Zähler sind typbezogen, keine Schreibrechtebehauptung.
- **Deaktivieren statt Löschen:** Standort-/Terminart-/Rollen-/Abteilungswerte werden nicht hart gelöscht. Bestehende Referenzen bleiben lesbar; Deaktivierung verhindert neue Auswahl. Standort-Schlüssel sind nach Anlegen unveränderlich; Rollen-Schlüssel werden laut R2 aus dem Anzeigenamen abgeleitet und im Editor nicht angezeigt.
- **Standort-Editor:** Eigenes MudDataGrid/MudDialog nach dem StandortePage-Muster #77 mit Schlüssel, Anzeigename, expliziter Land-Auswahl, Farbdot/Hex und Aktivstatus. Deutschland und Polen sind im Editor als Länder-Auswahl sichtbar. Der REST-Abgleich in `docs/people-rest.md` gilt konkret für `/api/people/standorte`.
- **Typspezifische Editoren:** Kein generischer Standort-Formular-Klon: Rollen/Abteilungen haben Textfelder und Personenzähler ohne Farbe; Beziehungstypen ergänzen Singular/Plural; nur Terminarten behalten Farbe und ergänzen ein prominentes Frequenzfeld.
- **Task-Status:** Standard-Reihenfolge `Open → Waiting → In Progress → Review → Done`; neutrale/amber/blaue/violette/grüne Farben. Nur `Done` ist im Mockup `isDone=true`; mindestens ein aktiver `isDone`-Status ist erforderlich. DnD ändert die Reihenfolge, explizites Speichern persistiert sie. Status mit Task-Verweisen lassen sich nicht deaktivieren.
- **Dynamisches Board:** Kanban-Spaltenzahl/Label/Farbe/Reihenfolge werden aus aktiven Status-Stammdaten erzeugt. Die 6-Spalten-Variante setzt „Später“ hinter „In Progress“ nur als Konzeptbeispiel; sie ist kein Seed-Entscheid.
- **Feiertage:** Jahr ist Filter; Scope ist entweder landesweit für ein explizites Land oder für einen expliziten Standort. Polen-Beispiele sind bewusst sichtbar. Seed ist Importquelle, manuelle Korrekturen bleiben möglich.
- **Länder und Standorte:** Land ist ein explizites Feld mit ISO-Code und Standort-Abhängigkeitsanzeige. Deutschland und Polen sind Beispiele, nicht Defaults. Winterthur ist als inaktiver Standort dargestellt; Remote und Winterthur sind nicht automatisch in demselben Land zu interpretieren, ihre Zuordnung ist in der UI explizit zu pflegen.
- **Verbrauchende Apps:** People-Rollen Mehrfachauswahl; Abteilung, Land, Standort und Terminart Einfachauswahl. Terminarten `feedback-gespraech` (#4F46E5) und `wie-gehts-dir` (#0F766E) zeigen Frequenz-Hinweise, keine automatischen Erinnerungen/Serien.
- **i18n:** stabile Keys/REST-Werte sind von UiText-Anzeigenamen getrennt gedacht; UI kann Deutsch/Englisch sein. Keine Annahme zu einem primären Land oder ausschließlich deutschen Feiertagen.
- **Palette:** Slate `#F8FAFC / #E2E8F0 / #0F172A`, Primary `#3B82F6`, plus zurückhaltende Indigo-/Türkis-Akzente entsprechend `mockups/060-conversations/`.

## Typspezifische Editoren (Rework R2, User-Feedback)

- **Rollen (`stammdaten-rollen.html`):** Anzeigename, Beschreibung, aktiv. Kein Farbwert und kein sichtbarer Schlüssel; der Dialog erklärt „Schlüssel wird aus dem Namen abgeleitet“. Die Tabelle zeigt gekürzte Beschreibung und „Verwendet von“ als Personenanzahl. Duplikate beim Anzeigenamen sind case-insensitive zu markieren. Rollen sind Multi-Select an der Person.
- **Abteilungen (`stammdaten-abteilungen.html`):** Analog zu Rollen: Anzeigename, Beschreibung, aktiv sowie „Verwendet von“ (Personen). Keine Farbe und kein sichtbarer Schlüssel; case-insensitive Anzeigenamen-Duplikate. Abteilung ist Einfachauswahl an der Person.
- **Beziehungstypen (`stammdaten-beziehungstypen.html`):** Anzeigename/Singular, `pluralLabel`, optionale Beschreibung und aktiv. Tabelle zeigt Singular, Plural, Anzahl Beziehungen und Status; kein Farbfeld. Partner:in, Kind/Kinder und Kolleg:in/Kolleg:innen sind illustrative Seed-Beispiele für Filter-/Chip-Beschriftung.
- **Terminarten (`stammdaten-terminarten.html`):** Behalten `farbeHex` und Live-Preview. Frequenz ist ein eigenes, prominentes Textfeld/Select (wöchentlich, monatlich, quartalsweise, jährlich, nach Bedarf plus eigene Formulierung), optional Beschreibung und Aktivstatus. Dialog-Platzhalter: „erscheint als Hinweis beim Gespräch“. Es handelt sich um redaktionellen Hinweistext, nicht um automatische Serie oder Erinnerung.
- **Standorte (`stammdaten-standorte.html`):** Eigenständiges Muster mit Schlüssel, Anzeigename, Farbe, aktiv und verpflichtend sichtbarer Land-Auswahl; Beispiele zeigen Deutschland und Polen explizit. Das Land wird nicht aus einem Namen wie „Remote“ abgeleitet.

### Offene REST-Fragen (R2)

1. Welche Endpunkte und exakten DTO-/Feldnamen gelten je Typ (insbesondere generierter Rollenschlüssel, `pluralLabel`, Frequenztext und optionaler Beschreibungstext)?
2. Welche Count-Felder/Responseform liefert das Backend für „Verwendet von“: Personen je Rolle/Abteilung und Beziehungen je Beziehungstyp? Diese UI-Zähler benötigen Backend-Aggregate; **Issue #106 liefert die Counts je Typ**. Bis dahin sind angezeigte Werte Beispieldaten und im Fehler-/Stale-Zustand als solche kenntlich zu machen.
3. Welche Duplikat-/Validierungsregeln und Fehlerpayloads gelten je Ressource (case-insensitive Namen, Singular vs. Plural-Eindeutigkeit, Konfliktstatus und auto-generierter Schlüssel)?
4. Wie funktionieren Aktivieren/Deaktivieren und Referenzschutz, sowie Cache-/Versionsinvalidierung nach Änderungen? Bestehende People-/Beziehungs-/Gesprächsreferenzen bleiben im Mockup lesbar; konkrete REST-Regeln sind zu bestätigen.

## Offene Fragen für Review #105

1. **GitLab-Issue/Kommentare:** Die GitLab-Workitem-Details und Kommentare waren in dieser Ausführungsumgebung nicht erreichbar (kein GitLab-MCP-Ressourcenzugriff und kein Projekt-Issue-Link in den lokalen Dateien). Die oben stehenden Defaults folgen daher der Aufgabenbeschreibung und lokalen Verträgen; bitte vor Freigabe gegen alle Entscheide in #105 abgleichen.
2. **Stammdaten-REST:** Welche API-Endpunkte, exakten Feldnamen, Key-Regeln und Fehlerpayloads gelten für Rollen, Abteilungen, Beziehungstypen, Terminarten, Task-Status, Feiertage und Länder? Ist das Aggregat eine eigene Stammdaten-API oder bleiben Typen modulbezogen?
3. **Beziehungstypen/Rollen/Abteilungen:** Sind `Partner`, `Kind`, `Kollege` bereits feste People-Werte oder künftig editierbar? Rollen-/Abteilungswerte und deren Key-/Duplikatregeln bitte fachlich festlegen.
4. **Standort-/Landdaten:** Bestätigen, ob Standorte ein verpflichtendes Land/ISO-Feld erhalten. Mockup verwendet Beispiele Aschaffenburg, Berlin, Dortmund, Kunde, Remote, Winterthur; Remote und Winterthur bleiben im Editor ohne Landzuordnung, bis sie fachlich festgelegt sind. „Kunde“/„Remote“ könnten standortartige Arbeitsmodi statt geografischer Orte sein.
5. **Taskstatus:** Darf ein Status umbenannt/deaktiviert werden, wenn historische Tasks ihn referenzieren? Wie werden UiText-Lokalisierung, Status-Key-Stabilität, „unbekannter Status“ und Übergänge bei Umordnung abgebildet? Ist `isDone` wirklich genau ein Status oder mindestens einer?
6. **Feiertage:** Seed-Quelle/Updatefrequenz, Feiertagsumfang (landesweit vs. regional), bewegliche Feiertage, eindeutige Kombinationen und Verhalten bei doppeltem Datum/Scope bestätigen. Die Kalenderzeilen sind illustrative Beispiele.
7. **Frequenz-Hinweise:** Bestätigen, dass es bei Terminarten redaktioneller UiText ist und keine maschinenlesbare Erinnerung oder Terminserie erzeugt.
8. **UiText:** Festlegen, ob Stammdaten Anzeigenamen je Sprache speichern oder stabile Keys über UiText lokalisieren; wie benutzerdefinierte Werte übersetzt werden.
9. **Abhängigkeiten/Berechtigungen:** Sind Länder mit Standorten, Status mit Task-Referenzen und Stammdaten-Änderungen per Rollen/Rechten geschützt? Welcher Retry-/stale-cache-Vertrag gilt?

Nach Rückmeldung die offenen Entscheide in #105 dokumentieren und erst dann als freigegeben markieren. Kein Push/MR.
