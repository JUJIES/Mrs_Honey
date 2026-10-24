# Änderungsprotokoll

## 2026-10-24 – Neue Audios über GPT-Audio-1.5

- Nach drei echten Hörproben hat Julius `alloy` mit der warmen, langsamen britisch-englischen Regie als Standard für alle neuen Audios freigegeben. Das bestehende Standardprofil entspricht exakt den Proben; bisherige MP3s bleiben unverändert.

- Key-Formular im eingebauten Browser geprüft: `same-origin` statt `no-referrer` erhält den POST-Origin. Fremde/null-Origins bleiben gesperrt; die ursprüngliche Einstellung hatte legitimes Speichern abgelehnt.

- Neue englische Audios entstehen mit `gpt-audio-1.5` / `alloy` nach dem Video-Lab-Muster: Chat Completions, WAV plus Transkript, Wortvergleich, geprüfter Cache und MP3-Konvertierung. Warme langsame britisch-englische Regie liegt versioniert im Profil. Kein Modellfallback oder automatisches Retry.
- Eigener Oskar-Key über kurzlebiges Loopback-Passwortformular, private Datei außerhalb von Repo/Webroot. Kein Key im Chat, Frontend oder Release; keine Übernahme fremder Projekt-Keys.
- Bestehende MP3s bleiben erhalten. Import erstellt nur fehlende Dateien und übernimmt Profil-/Hash-Metadaten aus Renderer-Sidecars. Stimmen-QA vergleicht Profile getrennt; kleine unbewertbare Gruppen bleiben ein sichtbarer Prüffehler.
- Neue Lipsync-Dateien erhalten den vollständigen Sprechertext als Dialoghilfe statt nur das Wortlabel; alte MP3s/Lipsync-Dateien werden dabei nicht neu erzeugt.
- Neue lokale CLI ersetzt die externe Wizard-Pflicht für Oskar; gemeinsamer Wizard und Video Lab bleiben unverändert. Entwicklungswerkzeug ohne neue Dependencies, kein neuer Runtime-Dienst. Hörproben/Cache liegen außerhalb des Repos.
- Pipeline-, Setup- und Agent-Doku aktualisiert; veraltete deutsch/englische Beispiele in der Datenstruktur auf den aktuellen English-only-Vertrag korrigiert.

## 2026-10-24 – Zuverlässiges Laden auf iPad und Handy

- Ein wiederverwendetes Audioelement wird beim ersten Tippen freigeschaltet; spätere Wörter und Rückmeldungen verwenden dasselbe Element. Lipsync blockiert die Wiedergabe nicht mehr.
- Audio erhält getrennte Zeitfenster für Netzwerkstart (12 s) und Wiedergabe (8 s); blockierte oder fehlgeschlagene Wiedergabe zeigt einen Hinweis zum erneuten Antippen von Mrs. Honey.
- Hören/Lesen geben Antworten und automatisches Vorlesen erst frei, wenn alle vier Bilder dekodiert sind. Bei Ladefehlern folgt ein automatischer Versuch ohne den alten Cache, danach eine sichtbare Wiederholungsoption. Fehlgeschlagene Lernset-Anfragen lassen die Auswahl bedienbar.
- Verlassene Bild-/Antwortrunden dürfen keine neue Aufgabe oder Feedback im nächsten Bildschirm starten.
- Der Bär verwendet ein quadratisches, von nativen Buttonabständen unabhängiges Koordinatensystem; Kopfposition bleibt über Geräteausrichtungen hinweg gleich.
- Body-Set-Bundle und Set-Cover im PWA-Precache ergänzt. Neue App-/CSS-URLs und Cache-Version verhindern die Weiterverwendung der alten Ladeabläufe. Vollständiger Offline-Audiobetrieb wird weiterhin nicht versprochen.
- Fehlgeschlagene Manifest-/Feedback-Anfragen deaktivieren Audio nicht mehr dauerhaft für die Sitzung. Neue Regressionstests: `node --test tests/mobile-reliability.test.cjs`. Lerninhalte und Audioaufnahmen bleiben unverändert.

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
