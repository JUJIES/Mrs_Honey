# Word Blaster – Belohnungsspiel

## Produktlogik

Weiteres Belohnungsspiel nach der Lernrunde, neben Memory und Catch a Pair;
Colours behält zusätzlich sein Wimmelspiel. Kein neuer Lernmodus und keine
Änderung des Lernfortschritts oder vorhandener Lernbilder/MP3s. Ausschließlich
Challenge-Bestenlisten werden lokal pro Browser, Set und Stufe gespeichert.

Das Spiel umfasst **Wort lesen → Bild treffen**. Die weiteren besprochenen
Varianten Bild → Wort und Hören → Bild sind noch nicht implementiert; keine
wirkungslosen Auswahlfelder dafür anzeigen. `items` des gewählten Sets sind die
einzige Quelle für IDs, Bilder und englische Wörter.

- Feste Kanone unten mittig, Winkel −75° bis +75°. Desktop: ←/→ drehen,
  Leertaste feuert einen Schuss, Escape pausiert. Einzelne kurze Pfeiltaps
  funktionieren ebenso wie Halten. Nach dem Start besitzt der Ziehbereich den
  Tastaturfokus; Pause-/Tonbuttons behalten ihre native Leertastenbedienung.
- Touch / Maus / Stift: **unten ziehen zum Zielen, loslassen zum Schießen**.
  Die freie Fläche um die Kanone ist das Eingabeziel (148px hoch, innerhalb des
  Rahmens), nicht die Bildkapseln. Keine Richtungsbuttons, Winkelleiste oder
  Feuertaste. Relative horizontale Bewegung erhält den Winkel beim Aufsetzen;
  Linksziehen dreht nach links, Rechtsziehen nach rechts. Die Empfindlichkeit
  skaliert mit der Spielfeldbreite. Gestengeschwindigkeit verändert keine Schusskraft.
- Erst mehr als 10 CSS-Pixel horizontaler Weg geben den Schuss frei; kurze Taps
  und vertikales Wischen feuern nicht. Zurück in die Start-Totzone ziehen bricht
  ab. Ein dezenter Ring am Sockel unterscheidet Kontakt und schussbereites Zielen.
  Loslassen außerhalb des Rahmens, `pointercancel`, Capture-Verlust und ein
  zweiter Kontakt (auch außerhalb des Ziehbereichs) brechen ab. Erst ein frischer
  Pointerdown nach Ende aller Kontakte darf eine neue Geste beginnen.
- Aktives Ziehen bzw. gehaltene Pfeiltasten verlangsamen die Kapseln je nach Stufe
  weich auf 55%, 75% oder 100% (Knifflig).
  Ein echter Release schießt höchstens einmal durch denselben Schuss-/Cooldown-
  und Promptgeneration-Vertrag wie die Leertaste. Pause, Größenwechsel, Treffer
  durch einen älteren Schuss, Tab-Verlust und Verlassen verwerfen die Geste.
- In der Set-Runde erscheinen alle Setwörter einmal. Platzabhängige Gruppen mit bis zu sechs
  Kapseln; verbleibende Kapseln behalten ihre Position nach einem Treffer. Erst
  nach Abräumen einer Gruppe folgt die nächste. Kleine Ansichten zeigen weniger
  Kapseln in echten CSS-Pixeln, statt das gesamte Spielfeld winzig zu skalieren.
- Targets prallen an ihren Grenzen und aneinander ab, mit einem freien Bereich
  um die Kanone. Der Laser nutzt den ganzen sichtbaren reflektierenden Rahmen.
- Gepunktete Zielhilfe bis einschließlich erstem Abpraller. Sichtbare schnelle
  Laserpulse mit heller Spitze und kurzer Spur; höchstens zwei gleichzeitig,
  300ms Abstand. Zwei Wandabpraller erlaubt, dritter Wandkontakt absorbiert.
- Nur das geforderte Bild platzt; falsche Bilder zeigen einen warmroten Schutzring
  mit Querstrich, Ton und einem kurz zurückprallenden dekorativen Puls. Keine
  Leben oder Punktabzüge; die Set-Runde hat kein Zeitlimit. Wandtreffer erhalten goldene Partikel und
  einen Zusatzton, zählen aber genauso viel wie direkte Treffer.
- Richtig: kurzer Auflösungsimpuls, Partikel, lokaler Ring, Klang und genau ein
  Fortschrittszähler. Alte Schüsse verfallen mit dem Promptwechsel. 600ms
  Erfolgsphase sperrt neue Schüsse (Challenge: 180ms); Abschluss mit „Noch mal!“
  setzt die Runde zurück.
- Ton abschaltbar, Pause/Weiter sichtbar. Resize und Tab-Verlust pausieren,
  verwerfen Schüsse und erhalten gefundene IDs. Weiter startet ohne Physik-
  Zeitsprung; die Challenge-Uhr läuft dabei weiter.
  Kleine Handyformate dürfen scrollen; Desktop/Tablet halten die Steuerung
  sichtbar. Vor Spielstart gibt es einen expliziten Startknopf.

## Spielart und Schwierigkeitsgrad

`app.js` zeigt vor dem Spielfeld eine Auswahl für Set-Runde oder Challenge und
Leicht/Mittel/Knifflig. Die Auswahl lebt in `state.wordBlaster` für die aktuelle
Seite. Die drei Stufen werden zentral in `DIFFICULTIES` beschrieben; keine
getrennten Rundenmodelle oder doppelten Physikpfade.

| Stufe | Radius Desktop / Handy | Bewegung | Geschwindigkeit beim Zielen | Zielhilfe | Max. sichtbar Desktop |
| --- | --- | --- | --- | --- | --- |
| Leicht | 43 / 32px | 0,85× Basis | 55% | Bis nach erstem Abpraller | 4 |
| Mittel | 38 / 28px | 1,35× Basis | 75% | Bis zur ersten Wand | 5 |
| Knifflig | 33 / 26px | 1,85× Basis | 100% | Kurze 110px-Linie | 6 |

Die vorhandene Platzprüfung kann die Anzahl weiter reduzieren; Handy höchstens
drei Kapseln, Mindestdurchmesser 52px. Kleinere Bilder sind keine kleineren
Touchziele: Eingabe bleibt die feste Fläche um die Kanone.

## 60-Sekunden-Challenge

- Startet mit dem tatsächlichen „Los geht’s!“ nach erfolgreichem Laden, nicht
  schon in der Auswahl. Direkte Treffer geben 10 Punkte, nach einer Bande 15, nach zwei Banden 20;
  falsche Ziele bleiben geschützt. Einmal durch das Set beendet die Challenge nicht.
- Die Item-Warteschlange rotiert getroffene Items ans Ende. Nach einem vollständigen
  Setdurchlauf wird sie neu gemischt; bei mehr als einem Item kein unmittelbares
  Wiederholen am Übergang. Sichtbare IDs bleiben eindeutig, nur der aktuelle
  Prompt ist zerstörbar. Wiederholungen erhöhen Treffer/Punkte, nicht die Zahl
  verschiedener IDs. Promptgenerationen sperren alte Schüsse weiterhin.
- Getroffene Kapseln werden nach 180ms am frei gewordenen Ort ersetzt. Überlebende
  Kapseln behalten ihre Position. Falls dieser Ort nicht frei ist, begrenzte
  Rasterprüfung und maximal ein Nachfüllversuch pro 120ms statt Suche pro Frame.
- Genau 60 Sekunden tatsächliche Zeit ab Start (`deadline = Date.now()+60000`).
  Pause, Fokusverlust, versteckter Tab und Resize halten Physik/Eingabe an, die
  Uhr läuft weiter. Auswahl, Startansicht und Pause kommunizieren diese Regel.
- `expireChallenge` beendet idempotent die Runde. Vor Schuss und Treffer sowie
  regelmäßig wird die Deadline geprüft; bei `now >= deadline` keine Punkte mehr.
  Ein eigener 100ms-Timer aktualisiert die Anzeige auch während Pause und wird
  beim Abschluss/Destroy entfernt. Verdeckte Browser dürfen Timer verzögern;
  Deadline-Prüfung verhindert trotzdem spätere Treffer. Keine verpassten
  Physikschritte nachholen. Fortsetzen verlängert weder Deadline noch Cooldown.
- Nach Ablauf Ergebnisansicht mit Treffern, Punkten, Namenseingabe und Top 10.
  Bandenbonus wird im gemeinsamen Trefferpfad genau einmal vergeben; falsche,
  veraltete und verspätete Treffer bleiben ohne Punkte. Goldener Doppelring,
  kurze aufsteigende Bonusplakette und zusätzlicher hoher Ton kennzeichnen die
  Bande; Doppelbande erhält einen weiteren Ton. Reduzierte Bewegung blendet die
  Plakette ohne Aufstieg aus. In Set-Runden erscheint nur der Bandenhinweis.
  Beim Verlassen vor Ablauf gibt es keinen speicherbaren Zwischenstand.
  Neustart setzt Score/Deadline/Geste zurück, gespeicherte Einträge bleiben.

## Lokale Bestenlisten

Nur Challenge-Ergebnisse, getrennt nach Set-ID und Stufe. Storage-Key:
`lernwort.word-blaster.challenge.v2:<URL-encoded setId>:<difficultyId>`.
`v2` ist die Regelversion mit Bandenbonus; alte v1-Listen bleiben unverändert gespeichert
und werden nicht mit der neuen Rangliste vermischt. Bei wesentlich geänderter
Punkte-/Zeitregel künftig einen neuen Key verwenden. Keine Cloud-Rangliste,
keine Synchronisation zwischen
Browsern oder Domains und kein Schutz gegen manuelles Bearbeiten lokaler Daten.

Jede Liste enthält maximal zehn `{name,score,hits,at}`-Einträge; Punkte absteigend,
bei Gleichstand älterer Eintrag zuerst. Namen/Spitznamen auf 20 Unicode-Zeichen
begrenzen, Leerraum vereinheitlichen und Steuer-/Richtungszeichen entfernen.
Namen ausschließlich als Textknoten darstellen. Nur vollständige Challenge-
Ergebnisse lassen sich eintragen; `round.saved` verhindert Doppel-Submit.
Ergebnisse außerhalb der Top 10 bekommen eine klare Rückmeldung.

`readHighscores`/`saveHighscore` kapseln JSON-Validierung, Grenzen (0–4000 Punkte
in 5er-Schritten, 0–200 ganzzahlige Treffer und 10–20 Punkte pro Treffer) und Storage-Fehler. Ein blockierter/
voller Speicher darf das Spiel nicht abbrechen und keinen Speichervorgang
vortäuschen. Bei Fehler bleibt Wiederholen möglich. Die optionale `storage`-
Abhängigkeit von `mount` dient isolierten Tests; Runtime nutzt lokales Storage.
Keine neuen Daten im Lernfortschritt, keine Namen im Server-/Audio-/Setmodell.

## Architektur / Physik

`app.js` besitzt genau eine aktive Bonus-Session: `stopBonusGames()` zerstört
Catch a Pair und Word Blaster vor DOM-Ersatz. `word-blaster.js` stellt
`LernwortWordBlaster.mount(root, {items,title,urlFor,setId,difficulty,mode}) → {destroy()}` bereit.
Alle RAFs, Listener, ResizeObserver, Challenge-Timer, eigener AudioContext und ausstehende Bildlade-
Fortsetzungen gehören zu dieser Session. Bilderfehler sperren den Start und
bieten Wiederholung. Keine Runtime-Dependency und kein API-Aufruf.

Canvas2D zeichnet die Arena, HTML besitzt Aufgabenanzeige, native Menübuttons
und einen fokussierbaren Gestenbereich. Nur dieser freie untere Bereich nutzt
`touch-action: none`; außerhalb bleibt Scrollen möglich. Pointer-Capture hält die
Geste bei Bewegung, alle Kontakte werden für Mehrfinger-Abbruch verfolgt.
`dragAim` leitet Winkel und Freigabe aus Startposition, Startwinkel und aktuellem
X ab; kein zweites Winkelmodell. Abbruch stellt den Startwinkel wieder her.
Der Ziehbereich wird beim Laden, bei Pause und Erfolgsübergängen gesperrt.
Escape pausiert und bricht ab. Ein Tastaturwechsel bricht eine laufende Geste ab,
bevor der vorhandene Keyboardpfad verarbeitet wird.
Bilder werden einmal geladen, Kapselbilder auf Offscreen-Canvases zwischengespeichert,
DPR auf 2 begrenzt, Partikel auf 160 begrenzt.
Die Kanone besteht aus vier echten Raster-Assets unter `assets/images/word_blaster/`:
hinterem Sockel mit vertieftem Lager (`cannon-base-v2.png`), unabhängig drehbarem
Rohr (`cannon-barrel-v2.png`), fester vorderer Lagerschale (`cannon-mount-v2.png`)
und dem vorhandenen 2×2-Mündungsblitz-Atlas. Keine gezeichnete Ersatzkanone.
Alle vier Assets sind Voraussetzung für den Start
und nutzen denselben Lade-/Fehler-/Wiederholungsweg wie die Setbilder.
`cannonPose` ist die einzige Ableitung des gemalten Mündungsmittelpunkts für
Zielhilfe, Laserstart und Blitz. `drawCannon` hält die verbindliche Tiefenfolge: hinteres Lager → Rohr → feste
vordere Lagerschale → Blitz. Bildrechtecke sind zentral in `CANNON` verankert;
Lagerkugel, vordere Achskappe und Rohrdrehpunkt liegen auf demselben Punkt.
Der gekürzte Montageschaft verschwindet hinter der gefüllten Achskappe, statt
als spitzes Flaschenende auf einer Plattform zu liegen. Das Rohr sitzt 6px tiefer in der Aufnahme; Mündung und Strahlstart sind gemeinsam
angepasst. Die Gestenfläche bleibt fokussierbar, ohne gestrichelte Umrandung
um den Sockel. Die Lagerschale wird weder gedreht noch versetzt. Nur das Rohr federt 220ms axial in die Aufnahme
zurück und kehrt mit kleinem Nachfedern in die Ausgangslage zurück.
Der Blitz spielt vier Frames über 160ms, ohne Canvas-Readback oder Frame-Uploads.
Reduzierte Bewegung hält das Rohr still und zeigt nur den gedämpften ersten
Blitzframe mit Ausblendung. Pause und Resize verwerfen auch den Rückstoß.
Sockelhöhe über dem Boden, Target-Freiraum und Gestenfläche werden aus den
zentralen Bildrechtecken inklusive maximalem Nachfedern abgeleitet. Der
Target-Bereich hält Abstand zum gesamten größeren Rohr einschließlich
seiner Eckpunkte bei extremen Winkeln, nicht nur zur Mündung. Keine Blur-/Shadow-Filter pro Frame.
Reduzierte Bewegung senkt die Partikelzahl und entfernt Tastendruckbewegung;
bewegte Ziele bleiben als grundlegende Spielmechanik erhalten.

Physik in Schritten von 1/120s, RAF-Akkumulator mit maximal 100ms Nachlauf.
Jeder Laser-Unterabschnitt prüft den frühesten Kreis-/Wandkontakt kontinuierlich,
auch die Reststrecke nach Abprall. Bewegte Kreise über Relativgeschwindigkeit;
Target-Wand-/Target-Target-Korrektur in kleinen festen Schritten. Zielhilfe und
Laser teilen `wallHit`; Ecken spiegeln beide Komponenten in einem Kontakt.
Die Wand liegt auf der Mitte des sichtbaren Rahmens, der Puls ist darin zentriert.

`round` hält die unveränderten Itemreferenzen, Restliste, gefundene IDs, aktuellen
Prompt, Schüsse und Promptgeneration. `registerHit` nimmt nur aktuellen Prompt
und aktuelle Generation an. Dadurch können mehrere alte Schüsse keinen neuen
Prompt versehentlich abschließen. Teilfortschritt lebt nur in der laufenden
Bonusrunde und wird beim Verlassen verworfen. Nur ausdrücklich eingetragene
Challenge-Highscores bleiben bestehen.

## Assets / Offline / Release

`word-blaster.js/css` gehören in Index, PWA-Precache und Release-Exporter.
Das transparente Gouache-Auswahlmotiv `assets/images/bonus_games/word-blaster-v1.png`
folgt dem bestehenden Bonuskarten-Pattern; Original, Prompt und Freistellnachweis
unter `references/source_images/bonus_games/word-blaster-*`, nur Runtime-PNG exportieren.
Die gemeinsame Asset-Schicht versioniert/setzt vorhandene Setbilder ein.
Kanonenbilder werden gemeinsam vorbereitet und im PWA-Precache erfasst.
Die überarbeitete Lagerung hat Originale, Prompt, gezielten Edit, Processor-QC und
Pivot-/Hash-Nachweis unter `references/source_images/word-blaster-cannon-v2/`.
V1-Rohr und V1-Sockel sind unverändert in `word-blaster-cannon-v1/runtime-retired/`
archiviert und aus dem Runtime-Verzeichnis/Precache entfernt. Der vorhandene
V1-Blitz bleibt. Erzeugung: integriertes Imagegen; lokale Generate2dsprite-
Verarbeitung entfernt Magenta und extrahiert Bildteile. Runtime exportiert nur
aktuelle fertige transparente PNGs; die vierte Sheet-Zelle ist eine reine
Montagereferenz. Keine Parallelversion der aktiven Kanone.

## Prüfung / Grenzen

- `node --test tests/*.test.cjs`: Reflexion/Ecken, Zielhilfe, schnelle bewegte
  Treffer, Treffer nach Wandkontakt, frühester Treffer, Schusslimit, Generation,
  Sets mit 1/10/15 Items, Zielabstände und Grenzen.
- `tests/browser/word-blaster-smoke.html`: explizit startbare Browserprüfung für
  sichtbare Tastaturdrehung, Tastaturschuss, Abschluss/Replay, echte Sprite-
  Ausgabe beim Zieh-Release, Totzone/Zurückziehen, Pointercancel, Capture-Verlust,
  Mehrfinger-Abbruch, Release außerhalb, Pause/Resize während einer Geste und
  Abbau während Schuss/Bildladen sowie Bild-/Spritefehler. Synthetische Pointer-
  Tests ersetzen Capture nur auf ihrem eigenen Testelement; echte Capture und
  Loslassen zusätzlich per Browser-Ziehbewegung prüfen. `word-blaster-layout-audit.js` liest nur DOM.
- `tests/browser/word-blaster-challenge-smoke.html` läuft eine echte Minute:
  wiederkehrendes Einzel-Item, Countdown während Pause, Ende/Spätschuss-Sperre,
  Textsicherheit des Namens, Eintragen/Doppel-Submit, Neustart und Timer-Abbau.
  Testspeicher bleibt isoliert von echten Bestenlisten.
- Responsive Prüfung: 1440×900, 810×1080, 1080×810, 390×844, 320×568, 568×320;
  Bonusmotive, Touchgrößen, Navigation zu Memory/Catch a Pair und Colours-Auswahl.
- `tests/browser/word-blaster-cannon-preview.html` zeichnet mit der tatsächlichen
  Runtime-Funktion fünf Winkel (−75°, −45°, 0°, 45°, 75°) und die Schussbewegung;
  Lagerabdeckung und Anschluss müssen auch bei Rückstoß räumlich geschlossen sein.
- Keine Zusage von 60fps ohne Messung. Physisches iPad 9 und abschließende
  Safari-/Touch-/Tonabnahme bleiben offen. Synthese-Töne sind technisch eingebaut;
  Klangmischung und Spielschwierigkeit brauchen noch das gemeinsame Probespielen.

## Entscheidung – 2026-10-24

Kleines Canvas-Modul entlang des bestehenden Mount/Destroy-Musters statt Game-
Framework oder Erweiterung des Lernrundenmodells. Erst ein spielbarer Grundmodus;
weitere Aufgabenrichtungen später mit demselben Runden-/Physikmodell ergänzen.

## Abnahmestand – Stufen und Challenge (2026-10-24)

- 69 Node-Tests bestanden, einschließlich Wiederholungen, strikter Deadline,
  alter Schüsse, Stufen-Geometrie und isolierter/fehlerhafter Bestenlisten.
- Echte 60-Sekunden-Browserprüfung: zwei Treffer desselben Items, ablaufende
  Zeit bei Pause, Ergebnis/Speichern/Textsicherheit/Doppel-Submit und Replay.
- 36 Browserkombinationen: drei Stufen × zwei Modi × sechs Viewports; Auswahl,
  Spielfeld, Ergebnisformular und Zurück-Navigation. Ergebnis-Layout nutzt im
  isolierten Matrix-Fixture einen Uhrsprung; die echte Dauer wurde separat
  ohne Uhrmanipulation geprüft. Keine Testeinträge im echten Browserspeicher.
- Memory/Catch-a-Pair-Navigation weiter bestanden. Physisches iPad/Safari und
  Feintuning der Schwierigkeit durch Kinder bleiben eine eigene Praxisabnahme.

Bandenbonus-Prüfung: `tests/browser/word-blaster-bank-smoke.html` schießt
über eine echte Wandreflexion und erwartet 15 Punkte. `?live=1` lässt den
Bonus zur Sichtprüfung weiterlaufen; Standard pausiert nach dem Treffer.
Keine Namen oder Ergebnisse werden in Browser-Storage geschrieben.
