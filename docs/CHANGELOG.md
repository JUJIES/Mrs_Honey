# Änderungsprotokoll

## 2026-10-04 – Verständliche Kompetenzauswahl

- Drei neue ruhige Gouache-Motive erklären die tatsächliche Aufgabe: Hören → Bild auswählen; Lesen → Wort/Bild zuordnen; Sprechen → Bild in einem englischen Satz benennen.
- Titel und kurze Handlungsanweisung stehen außerhalb des Bildes; mobile Karten nutzen ein kompaktes Bild/Text-Layout, ohne Motivbeschnitt.
- Übungslogik, Lernsets, Audio und Spracherkennung unverändert. PWA-Cache auf v28 und versionierte App/CSS-URLs aktualisiert.
- Weboptimierte JPEGs: zusammen rund 1 MB statt 6 MB PNG; unveränderte Generierungsoriginale unter `references/source_images/mode_competencies/`, nicht Teil des öffentlichen Runtimes.
- Veraltete Modus-/Sprachangaben in Konzept und UI-Regeln korrigiert; Satzpflicht im Sprechen-Modus anhand des bestehenden Codes dokumentiert.
- Bildgenerierung: eingebautes Bildwerkzeug, drei separate `illustration-story`-Prompts. Gemeinsamer Stil: vereinfachte Gouache, elfenbeinfarbener Grund, abgerundete Formen, blaugraue Konturen, ruhige Pastellakzente, Querformat 3:2, kein Rahmen/Logo.
  - Hören: großes Ohr, Lautsprecher/Schallwellen, orange Katze auf Bildkarte und antippender Finger; blauer Akzent, ohne Text.
  - Lesen: Wortkarte mit exakt `cat`, passende orange Katze auf Bildkarte, antippender Finger und dezente Verbindung; salbeigrüner Akzent.
  - Sprechen: orange Katze auf Bildkarte, ockerfarbenes Mikrofon, Sprechblase mit exakt `It's a cat.`; gelber Akzent, kein antippender Finger.
