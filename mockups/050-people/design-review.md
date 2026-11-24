# Design-Review · Milestone 0.5.0 · People

## Screens

- `index.html` — Modulübersicht und Einstieg in alle Mockups
- `mitarbeiter-liste.html` — Mitarbeiterliste mit Suche, Filtern, Einsatzstandort und Status
- `character-sheet.html` — Mitarbeiterprofil mit Attributen/Skills, Beziehungen und Einsatz
- `beziehungen.html` — statische Vorschau des Beziehungsgraphen

Alle Screens sind statisches HTML/CSS, verwenden die gemeinsame `_palette.css` und enthalten am Seitenfuß MudBlazor-Mapping sowie relevante Kantenzustände.

## Review-Fokus

1. Ist die Mitarbeiterliste mit Rolle/Abteilung, Status und Einsatzstandort auf einen Blick verständlich?
2. Trägt das Character Sheet den „Mitarbeiterverwaltung“-Use-Case, oder sind andere Abschnitte wichtiger?
3. Sind Beziehungen als eigener Graph-Überblick und die Typen Partner, Kinder und Kollegen passend?
4. Sind Leerezustände, Fehlerbehandlung und der vorgeschlagene deutsche Wortschatz klar?
5. Sind Standortfarben unterscheidbar und im Kalender sowie in der Liste konsistent?

## Offene Entscheidungen

- **Einsatzstandort-Farbwelt:** Vorschlag: Berlin blau, Winterhur violett, Remote petrol, Kunde · Blume orange. Sind Farben und Kategorien verbindlich? „Winterhur“ ist gemäß Vorgabe übernommen.
- **Attribute/Skills:** Mockup nutzt fünf Beispielwerte auf einer Skala von 0–100 mit Selbsteinschätzung. Welche Attribute sind fachlich relevant, wer bewertet sie und wer darf sie sehen/bearbeiten?
- **REST-Feldnamen/-Werte:** Die Screens nutzen sichtbare Begriffe Mitarbeiter, Rolle, Abteilung, Einsatzstandort und Status. API-Enums, optionale Felder und Beziehungsschema bitte gegen Vertrag #38–#41 prüfen.
- **Privatsphäre:** Sichtbarkeit und Berechtigungen für Partner/Kinder sowie private Kontaktdaten festlegen.
- **Graph-Umfang:** Maximal angezeigte Tiefe/Personenzahl und Umgang mit Mehrfachbeziehungen klären.

## Freigabe

Review im zugehörigen Workitem kommentieren. Nach fachlicher und visueller Zustimmung das Label **`mockup:freigegeben`** am Design-Review-Workitem setzen. Offene Entscheidungen entweder vor Freigabe klären oder dort explizit als akzeptierte Annahmen dokumentieren.
