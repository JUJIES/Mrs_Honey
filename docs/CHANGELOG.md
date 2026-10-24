# Änderungsprotokoll

## 2026-10-24 – Bandenbonus für Word Blaster

- Challenge: direkt 10, nach einer Bande 15, nach zwei Banden 20 Punkte.
  Derselbe geprüfte Trefferpfad zählt Bonuspunkte für Ergebnis und Highscore.
- Goldener Doppelring und Bonusplakette mit eigener Tonfolge; bei reduzierter
  Bewegung ohne aufsteigende Plakette, Stummschaltung bleibt maßgeblich.
- Bestenlisten-Regelversion v2; frühere v1-Einträge bleiben gespeichert und getrennt.
  Auswahl erklärt die Wertung; Validierung prüft die tatsächliche Treffer-/Punktespanne.
- 73 Node-Tests, Eingabe-Smoke, echter Minutentest mit Speicherung und echter
  Banden-Treffer im Browser bestanden; eigene Bonus-Prüfseite ohne Namensspeicherung.
- App/CSS `word-blaster-bonus-1`, PWA-Shell v58. Keine neuen Runtime-Medien oder Dependencies.

## 2026-10-24 – Kanone tiefer eingesetzt

- Gestrichelte Fokusellipse um den Sockel entfernt; Ziehen und Tastatur bleiben bedienbar.
- Rohr 6px tiefer in das feste Vorderlager eingesetzt. Mündung, Laser und Zielhilfe
  folgen derselben Geometrie; Bilddateien bleiben unverändert.
- App/CSS `word-blaster-seating-1`, PWA-Shell v57.

## 2026-10-24 – Word Blaster: drei Stufen und 60-Sekunden-Challenge

- Auswahl vor dem Spiel: Leicht/Mittel/Knifflig und Set-Runde/Challenge.
  Bewegung, Mindestbildgröße und Zielhilfe folgen einem gemeinsamen Profil.
- Challenge füllt Ziele aus demselben Set nach, zählt 10 Punkte pro Treffer und
  endet nach einer echten Minute. Pause/Tabwechsel verlängern die Deadline nicht.
  Vorhandener Treffer-/Generationspfad, kurze Erfolgsphase und kollisionsfreies
  Nachfüllen am frei gewordenen Platz; kein Zurücksetzen der übrigen Kapseln.
- Lokale Top 10 pro Set/Stufe mit Namenseintrag, sicherer Textdarstellung und
  verständlichem Verhalten bei gesperrtem Speicher. Kein Server-/Lernfortschritt-
  Modell verändert; neues Storage-Format unter eigenem versionierten Namespace.
- Produktvertrag, Modell-/Storage-Tests und echter 60-Sekunden-Browser-Smoke
  ergänzt. App/CSS `word-blaster-levels-2`, Shell v56. Bestehende Bilder und
  MP3s bleiben unverändert.

## 2026-10-24 – Integriertes Kanonenlager statt aufgesetztem Rohr

- Gemeinsam gestaltete V2-Bildteile: tiefe hintere Aufnahme, zylindrisches Rohr
  ohne spitzes Flaschenende und feste vordere Achskappe mit Lagerwangen.
- Zeichenreihenfolge verdeckt den gekürzten Montageschaft hinter dem Vorderlager;
  nur das Rohr dreht und federt zurück. Gemeinsamer Renderer und zentrale
  Bildrechtecke statt unabhängiger Positionierung einzelner Teile.
- Mündung, Sockelhöhe, Target-Freiraum und Touchfläche an die größere Einheit
  angepasst. Ziehen/Loslassen und Desktop-Pfeile/Leertaste bleiben bestehen.
- Winkel-Vorschau nutzt denselben Renderer wie das Spiel. V1-Bilder archiviert,
  aktuelle Teile in Inventar und Precache; bestehender Blitz und MP3s bleiben.
  App/CSS `word-blaster-joint-2`, Shell v54; Details in `WORD_BLASTER.md`.

## 2026-10-24 – Direktes Ziehen und Loslassen bei Word Blaster

- Touch-Steuerleiste vollständig entfernt. Freie Fläche um die Kanone nimmt
  relative horizontale Ziehbewegungen an; Loslassen schießt. Desktop-Pfeile und
  Leertaste bleiben. Mehr Spielfeldhöhe durch entfallene Richtungs-/Feuertasten.
- 10px Totzone gegen versehentliche Taps, Rückkehr zum Startpunkt zum Abbrechen,
  sichtbarer Sockelring. Zweiter Kontakt, Pointercancel/Capture-Verlust, Pause,
  Resize, Tab-Verlust und Release außerhalb des Rahmens feuern nicht.
- Eine Eingabelogik für Touch/Maus/Stift über Pointer-Capture; kein neuer
  Schusspfad. Vorhandene Winkelgrenzen, Schusslimits und Generationen bleiben.
- Browser-Smoke-/Layout- und Unit-Prüfungen auf Gesten umgestellt und erweitert;
  Produktvertrag in `WORD_BLASTER.md`. App/CSS `word-blaster-drag-2`, Shell v52.
  Medienbestand und bestehende MP3s unverändert.

## 2026-10-24 – Gemalte, bewegliche Kanone

- Gezeichnete Kanonenformen durch Imagegen-Rastermotive ersetzt: fester Sockel,
  separat drehbares Rohr und vierstufiger Sprite-Mündungsblitz. 220ms Rückstoß
  bewegt nur das Rohr entlang seiner Achse; Reduced Motion hält es still.
- Gemalter Mündungsmittelpunkt ist gemeinsame Quelle für Zielhilfe, Schuss und
  Blitz. Target-Bereich hält den größeren Rohrumfang bei allen Winkeln frei.
- Pflichtbilder laden vor Spielstart über den vorhandenen Assetpfad; Ladefehler
  bieten Wiederholung. Kanonenbilder in Vorladen, Offline-Inventar und Precache.
- Originale/Prompts/Alpha-/Frame-QC unter `references/source_images/word-blaster-cannon-v1/`.
  App-Version `word-blaster-cannon-1`, Shell v50; vorhandene Lernbilder/MP3s bleiben.

## 2026-10-24 – Word Blaster als weiteres Belohnungsspiel

- Grundmodus Wort → Bild: drehbare Kanone, Pfeiltasten/Leertaste und große
  Touch-Steuerung, bewegte Kapseln, Schutz bei falschen Bildern und Erfolgsimpuls.
- Gemeinsame Reflexionsgeometrie für Zielhilfe und Laser, feste Physikschritte,
  kontinuierliche Trefferprüfung, maximal zwei Abpraller und zwei aktive Schüsse.
  Wandtreffer erhalten zusätzliche goldene Effekte, ohne den Zähler zu verändern.
- Eigene Mount/Destroy-Session, Pause bei Tab-/Größenwechsel, Generationsschutz
  gegen alte Schüsse. Gruppenweise alle Setitems; bestehende Bilder/MP3s bleiben.
- Neues transparentes Auswahlmotiv mit lokalem Freistellnachweis, PWA/Export
  ergänzt. App/CSS `word-blaster-2`, Shell v49. Produktvertrag: `WORD_BLASTER.md`.
- Bild → Wort und Hören → Bild sind noch nicht umgesetzt; iPad-9-Praxisabnahme offen.

## 2026-10-24 – Freigestellte Spielmotive für die Bonusauswahl

- Eigene Gouache-Motive für Memory (gleiche Tierkarten) und Catch a Pair
  (Bild-/Wortpaar im Sockel) statt Textsymbolen. Titel und Erklärung bleiben Text.
- Lokal mit BiRefNet freigestellt und unter Erhalt der nativen Innenflächen
  kantenbereinigt; transparente 640px-PNGs ohne Beschnitt auf den Schaltflächen.
  Desktop/Tablet vertikal, schmales Handy horizontal angeordnet.
- Gemeinsames Vorladen, Medieninventar und PWA-Precache ergänzt. Prompts,
  Originale und Bearbeitungsnachweis unter `references/source_images/bonus_games/`.
  App/CSS `bonus-art-2`, Shell v47; bestehende Lernbilder und MP3s unverändert.

## 2026-10-24 – Sockel auswählen und Einsätze herausheben

- Sockel sind echte auswählbare Buttons; Bild-/Wortknoten sitzen darin als
  dekorative Einsätze. Auswahl gehört dem festen Platz und bewegt sich nicht
  mit dem Bild. Gemeinsames kurzes Rütteln statt unabhängiger Bildbewegung.
- Dauerhaftes Bobbing und Jelly-Drücken entfernt. Inhalte sitzen ruhig unter
  der Sockellippe; Wechsel heben 180ms heraus und senken am Ziel 220ms ein,
  einschließlich der Anfangsanimation. Sperre bleibt bis zum Einsenken bestehen.
- Abbruch, Zielzuordnung, Fokus, Resize und Fortschritt mit dem bestehenden
  Mount/Destroy-Vertrag abgestimmt; Kollisions-/Browserprüfungen erweitert.
- Bestehenden Cache-Prioritätstest auf echte Request-Starts synchronisiert statt
  zwei feste Eventloop-Durchläufe anzunehmen; Prioritätsaussagen unverändert.
- App/CSS `catch-pair-9`, Shell v45; Bilder und MP3s unverändert.

## 2026-10-24 – Ein klarer Paarzähler

- Sichtbare Zustandsbeschreibungen und doppelte Fortschrittsangaben entfernt.
  Ein großer mittiger Zähler `3 / 10 Paare` ersetzt die kleine Eckanzeige;
  der Kopf zeigt nur den Setnamen. Screenreader-Rückmeldungen und sichtbare
  Lade-/Fehlerhinweise bleiben erhalten. Spielregeln unverändert.

## 2026-10-24 – Passende Sockel und gemeinsame Zustandssignale

- Zentrierte Vertiefungen mit gemeinsamen Karten-/Bildradien statt versetzter
  Plattformen; weniger Schatten, keine blauen Doppelrahmen oder Auswahlsterne.
- Sockel zeigen Auswahl dezent türkis, bevorstehenden Wechsel gelb, Fehlversuch
  kurz rot und Treffer grün. Erste Auswahl bleibt bei Fehler bestehen.
- Zentrale Zustandsableitung und Timer-Cleanup schützen vor alten Farben nach
  Tausch, Größenwechsel oder Neustart; Zustands-/Browserprüfungen erweitert.
- App/CSS `catch-pair-5`, Shell v41; Medieninventar und MP3s unverändert.

## 2026-10-24 – Catch a Pair als Belohnungsspiel

- Nach Lernrunden zwischen Catch a Pair, Memory und bei Colours Wimmelspiel wählen.
- Gewähltes Set mit gemischten Gegenbahnen, angekündigten zufälligen Wechseln,
  Einrasten, Verpuffen, nachrutschenden Karten und kürzeren neutralen Bahnen.
  Ausgewählte Karten dürfen wechseln und verlieren dabei ihre Markierung.
- Gemeinsamer Abschlusswirbel aus beiden Bahnpunkten, lokale Effektklänge,
  adaptive Karten/Abschnitte für Desktop und Tablet; keine MP3-/Setänderungen.
- Eigenes Modul mit Mount/Destroy, bestehende Asset-Schicht, PWA-/Release-Dateien
  ergänzt (Shell v40, App/CSS `catch-pair-3`). Regeln und Prüfgrenzen unter `CATCH_A_PAIR.md`.

## 2026-10-24 – Rendering-Härtung und Safari-Freigabevertrag

- Überholte SVG-/Portrait- und Größenregeln entfernt; nur das bestehende Companion-Rig bleibt als Runtime-Darstellung.
- Body-/Augenframes einmal dekodieren und erst vollständig vorbereitet austauschen; bei Fehlern aktuelle Darstellung erhalten und später erneut versuchen.
- Dekorative Arbeit in verdeckten Tabs pausieren, lange Atempausen sauber neu starten, abgeschlossene Blink-Timer entfernen und reduzierte Bewegung respektieren.
- Sieben neue Regressionstests und wiederverwendbarer, lesender Layout-Audit; reale Safari-Sichtprüfung bleibt ausdrücklich Teil der Freigabe. Vertrag in `docs/RENDERING.md` und `AGENTS.md`.

## 2026-10-24 – Safari schneidet Bärenkopf nicht mehr ab

- Äußeren `drop-shadow`-Filter am Bärenbutton in Ruhe und während Wiedergabe entfernt; begrenzter radialer Bodenschatten statt Filter über überstehenden, transformierten Kopfebenen.
- Den gemeldeten horizontalen Kopfbeschnitt in der echten Mac-Safari-Sitzung reproduziert und die vollständige Figur nach der Korrektur auch während Mund-/Kopfbewegung visuell bestätigt. Geometrie, Lernlogik und Audio unverändert.
- CSS `safari-avatar-1`, Shell-Cache v38; Medieninventar unverändert. Hintergrund: WebKit-Bug 313665, `https://bugs.webkit.org/show_bug.cgi?id=313665`.

## 2026-10-24 – Gesprochene Memory-Treffer

- Jedes gefundene Paar spricht direkt die vorhandene itembezogene Lese-Rückmeldung mit voller Medienlautstärke, ohne vorheriges allgemeines Lob oder Erfolgs-Cue; keine MP3 neu erzeugt oder verändert.
- Beide Trefferkarten und das Wort werden vom tatsächlichen Audioanfang bis zum Ende gemeinsam hervorgehoben. Erhaltene Kartenknoten ermöglichen flüssige Flip-/Farbübergänge; 220 ms Vorlauf/Ausklang statt langer Zusatzpause.
- Sichtbarer Wiederholungsknopf, passender Fehlerhinweis und Schutz gegen veraltete asynchrone Abläufe nach Zurück/Neustart. Regeln und Tests unter `docs/MEMORY_FEEDBACK.md`.
- App-/CSS-URLs `memory-feedback-2`, Shell-Cache v37; vorbereitete Medien bleiben im getrennten Inhaltsspeicher. Kompakte Labels in dichten mobilen Rastern erhalten auch bei langen Wörtern das sichtbare Bild.

## 2026-10-24 – Automatisches Vorladen für unterwegs

- Ausgewähltes Set und gemeinsame Dateien ohne Downloadbedienung vorbereiten; aktuelle/nächste Aufgabe priorisieren, abgebrochene Downloads automatisch wiederholen.
- Vollständige, hashgeprüfte Medien/JSONs unabhängig vom Shell-Cache speichern; Audio aus lokal vorbereiteten Dateien und mit Offline-Teilbereichsanfragen wiedergeben. App-/Helper-URLs `background-cache-4`, Shell-Cache v35.
- Vorhandenes Audio-Bundle `{files:[...]}` direkt unterstützen, damit Feedback keine unnötige Online-JSON-Abfrage voraussetzt.
- Generiertes 733-Dateien-Inventar und automatische Bild-/Audio-Sync-Anbindung; POSIX-URLs und definierte Textzeilenenden für identische Mac-/Windows-Releases. Keine Audioaufnahmen oder Lerninhalte neu erzeugt.
- 28 automatisierte Tests sowie vollständige Offline-Spielabläufe bei gestopptem Testserver; öffentlich Hören/Lesen und lokales Audio geprüft. Details: `docs/OFFLINE_LOADING.md`, Release-Nachweis in Abschnitt 8 des Migrationsplans.

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
