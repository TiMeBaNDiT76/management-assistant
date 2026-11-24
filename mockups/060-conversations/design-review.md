# Design-Review · Milestone 0.6.0 · Conversations

## Dateien

- `index.html` — Kachelübersicht der Ansichten und Workitem-Verweise
- `gespraechsliste.html` — gruppierte Gespräche, Filter und Termin-Task-Badges (#42)
- `gespraech-detail.html` — verbundener Termin-Task, Protokoll und Aktionspunkte (#43, #45)
- `ziele-meilensteine.html` — Person-/Extern-Ziele, Ziel-/Meilenstein-Prüfungstasks, Fortschritt und Tabellenvorschau (#44)
- `terminarten.html` — Terminarten-Stammdaten mit Aktivstatus, Farbe, Frequenzhinweis und Kalenderbezug (#45)
- `tasks-kanban-termine.html` — Ausschnitt Mb.Tasks-Kanban mit fünf Statusspalten und Conversation-Rückverweisen
- `_palette.css` — verbindliche Slate-/Blau-Palette und dokumentierter Indigo-Sekundärakzent

Alle Ansichten bleiben statische HTML/CSS-Mockups ohne JavaScript. Breakpoints, MudBlazor-Mapping und Kantenzustände sind in den Screens enthalten.

## Getroffene Entscheidungen aus dem Review

- **Gesprächstermine → Mb.Tasks:** Ein vereinbarter Termin erzeugt automatisch den Task-Typ **„Termin“** mit Fälligkeit zur Terminzeit und Rückverweis zum Gespräch. Status **Waiting** bis zum Termin; **Done** bedeutet: Gespräch durchgeführt und Protokoll erfasst. Aktionspunkte bleiben eigenständige Tasks. Sichtbar in Gesprächsliste, Detail und Kanban.
- **Zieltermine → Mb.Tasks:** Beim Anlegen eines Ziels werden automatisch **Zwischenprüfung** und **Ergebnisprüfung** angelegt. Datum Zwischenprüfung wird im Formular abgefragt; Vorgabe ist **Mitte der Laufzeit**, im Formular überschreibbar. Ergebnisprüfung ist an das Ziel-Enddatum gebunden. Ziel verschieben → Prüfungstermine folgen.
- **Q2 · Meilensteine → Tasks: ENTSCHEIDEN:** Meilensteine können optional Prüfungstermin-Tasks erzeugen; Vorschlag/Mockup-Default ist **an**, pro Meilenstein abschaltbar. Task-Typ **„Meilenstein-Prüfung“**, Fälligkeit gleich Meilenstein-Fälligkeit; Rückverweis auf Ziel und Meilenstein. Im Ziel-Detail wird der Badge nur gezeigt, wenn Task erzeugt wurde.
- **Mb.Tasks-Kanban:** Fünf Spalten in dieser Reihenfolge: **Open → Waiting → In Progress → Review → Done**. Termin-Tasks liegen typischerweise in Waiting.
- **Task-Badge-Typen:** **„Termin“**, **„Zwischenprüfung“**, **„Ergebnisprüfung“**, **„Meilenstein-Prüfung“**. Die Mockups nutzen typfarbige Chips; genaue Badge-Optik/Icons im Kanban und in Gesprächs-/Ziel-Details noch abstimmen.

## Weiterhin offen

1. **Q2 fachlich finalisieren:** Soll die optionale Meilenstein-Prüfung tatsächlich mit Default an eingeführt werden oder muss die Vorgabe je Team/Terminart konfigurierbar sein?
2. **Task-Badge-Optik:** Farben, Icons, kompakte Darstellung und Anzeige Task-ID/Status in Tabellen und Cards festlegen.
3. **Verschieben und Synchronisierung:** Verhalten bei manuell abweichend verschobenem Task, Zieländerung nach Erstellung und fehlgeschlagener Task-Synchronisierung definieren.
4. **Protokoll und Privatsphäre:** Sichtbarkeit/Berechtigungen, Änderungsverlauf, Aufbewahrung und Umfang der Teilnehmer:innen fachlich bestimmen.
5. **Ziel-Fortschritt:** Mockup rechnet erledigte Meilensteine / alle Meilensteine; Berechnung, leere Meilensteinliste und Gewichtung bestätigen.
6. **Terminarten-Vertrag:** Sind Frequenzhinweise redaktionell oder maschinenlesbare Regeln? REST-Felder/Keys und Kalenderdarstellung abstimmen.
7. **REST-Abgleich:** Verbindliche Feldnamen, Statuswerte, Queryparameter, Task-Link/Korrelation und Fehlerpayloads aus #42–#45 mit den Mockups abgleichen. People-Zieltypen `Person` und `Extern` sind aus `/api/people/meta` übernommen.

Die getroffenen Entscheidungen im zugehörigen Review #84 festhalten; verbleibende Fragen dort explizit beantworten. Nach Freigabe das Label `mockup:freigegeben` setzen.
