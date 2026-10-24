# UI- und UX-Regeln

## Allgemein

- Tablet-first für iPad 9
- möglichst wenig Text
- große Karten und Buttons
- ruhige Pastellfarben
- weiche Ecken
- sanfte Schatten
- klare Abstände
- Fokus auf genau eine Aufgabe

## Touch

- keine kleinen Tap-Ziele
- ganze Karten sind klickbar
- Buttons groß und mit Abstand
- keine Überlagerungen
- keine hover-basierten Interaktionen
- keine komplizierten Gesten

## Hintergrund

MVP nutzt statisches Bild:

`assets/backgrounds/calm-learning-bg.png`

Der Hintergrund liegt als eigene Layer unter der App:

```html
<div class="background-layer"></div>
<div class="app-shell">...</div>
```

So kann später ein Video-Loop ergänzt werden.

## Screens

### Sprache wählen

Titel:

`Was möchtest du lernen?`

Aktuell nur English (🇬🇧); keine deutsche Lernsprache im MVP.

Flagge immer mit Textlabel.

### Lernset wählen

Titel:

`Was möchtest du üben?`

Für English:

- Animals
- Food
- Colours
- School things

Aktuell neun aktive englische Sets; die Auswahl in `app.js` ist maßgeblich.

### Modus wählen

Titel:

`Wie möchtest du üben?`

Karten:

- **Hören**: „Hör zu und tippe auf das passende Bild.“ Ohr/Schall und Bildauswahl.
- **Lesen**: „Lies das Wort und finde das passende Bild.“ Wortkarte `cat` und passendes Bild.
- **Sprechen**: „Sag auf Englisch in einem Satz, was du siehst.“ Bild, Mikrofon und Beispielsatz `It's a cat.`

Die warmen, ruhigen Illustrationen liegen als weboptimierte JPEGs unter `assets/images/mode_cards/*-competency-v2.jpg`.
Keine dunkle Textüberlagerung und kein Beschnitt: Titel und Lernziel stehen separat unter dem Bild.
Auf dem Tablet/Desktop drei gleichwertige Karten nebeneinander, auf schmalen Handys
untereinander mit Bild links und Text rechts. Ganze Karte bleibt ein Touch-/Tastatur-Ziel;
das dekorative Bild hat einen leeren Alternativtext, Titel und Lernziel ergeben den zugänglichen Namen.
Die Bilder sind im PWA-Precache enthalten; Asset-Version und Cache-Version müssen bei Änderungen zusammen aktualisiert werden.

Nach der Lernrunde folgt eine Bonusauswahl: Catch a Pair, Word Blaster und Memory, bei Colours
zusätzlich das Farben-Wimmelspiel. Diese Spiele sind keine Kompetenzkarten.
Catch a Pair: zwei gemischte Bahnen, ganze Sockel als Touchziele mit fest
eingesetzten Bildern/Wörtern, nur wechselnde
Teile gesperrt; Details unter `CATCH_A_PAIR.md`.
Word Blaster: Wort lesen → Bild mit drehbarer Kanone treffen. Im freien Bereich
um die Kanone ziehen und zum Schießen loslassen; keine Richtungsbuttons,
Winkelleiste oder Feuertaste. Desktop behält Pfeile/Leertaste. Bilder sind keine
Tap-Ziele. Vor dem Spiel Set-Runde/60-Sekunden-Challenge und drei Stufen wählen;
Challenge-Bestenliste mit lokalem Namenseintrag pro Set/Stufe. Details unter `WORD_BLASTER.md`.

Die Bonusauswahl verwendet eigene freigestellte PNG-Motive unter
`assets/images/bonus_games/`: Memory zeigt gleiche Tierkarten, Catch a Pair
Bild und Wort in Sockeln, Word Blaster eine Spielzeug-Lichtkanone mit Wandtreffer. Alpha bleibt erhalten; `object-fit: contain` zeigt das
gesamte Motiv ohne Beschnitt. Desktop/Tablet: Bild über dem Text, schmales Handy:
Bild links neben dem Text. Ganze Schaltfläche ist weiterhin ein natives
Touch-/Tastaturziel, das dekorative Bild hat `alt=""`. Titel und Beschreibung
bleiben außerhalb des Bilds. Die drei Motive werden gemeinsam vorgeladen und
im PWA-Precache erfasst. Originale, Prompts und Freistell-QA liegen ausschließlich
unter `references/source_images/bonus_games/`, nicht im Runtime-Export.

### Spielscreen

- oben links: zurück
- oben klein: Breadcrumb `English / Animals`
- oben rechts: Fortschritt, z. B. `3 / 10`
- Mitte oben: Lautsprecherbutton + Wort
- darunter: 4 große Bildkarten im 2x2-Raster

## Feedback

Richtig:

- Karte leuchtet weich auf
- kurzer positiver Sound möglich
- nach kurzer Pause nächste Aufgabe

Falsch:

- Karte wackelt leicht
- kein harter Fehlerton
- Wort kann erneut vorgelesen werden
- Kind darf nochmal wählen

## Motion

Für MVP nur kleine UI-Animationen:

- Button-Tap-Feedback
- Karten-Fade/Scale
- sanftes Wackeln bei Fehlern

Kein animierter Hintergrund im MVP.

## Zuverlässiges Laden auf Mobilgeräten

- Hören/Lesen: Erst wenn alle vier Bilddateien erfolgreich dekodiert sind, werden die Antwortkarten und automatisches Vorlesen freigegeben. Ladefehler werden einmal mit neuer URL wiederholt; danach bleibt die Auswahl gesperrt und bietet „Erneut laden“. Kein Platzhalter darf als unsichtbare Antwort dienen.
- Ein einziges Audioelement bleibt außerhalb des ersetzten Spiel-DOMs bestehen. Der erste echte Klick schaltet es frei; vor direkter Wortwiedergabe darf kein Metadaten-/Lipsync-Fetch abgewartet werden (iPad/Safari).
- Audioladen und Abspielen haben getrennte Timeouts. Fehler müssen sichtbar und per Bärenbutton wiederholbar sein. Optionale Lipsync-Daten dürfen Audio nicht blockieren.
- Kein `filter: drop-shadow()` auf dem äußeren Bärenbutton: Safari kann die darüber hinaus ragenden, transformierten Kopfebenen an der Filterfläche abschneiden (WebKit 313665). Bodenschatten als eigenes, begrenztes Element zeichnen.
- Kopf und Körper des Bären teilen ein quadratisches Koordinatensystem. Native Buttonabstände und gerätespezifische Kopfversätze vermeiden. Auf iPad hoch/quer und Handy prüfen, auch während Wiedergabe.
- Automatisches Vorladen: ausgewähltes Set und gemeinsame Rückmeldungen ohne zusätzliche Bedienung vorbereiten; aktuelle/nächste Aufgabe priorisieren. Gespeicherte Bilder und Audio aus einem vom Shell-Update unabhängigen Inhaltsspeicher bedienen. Details, Updatevertrag und Generierung: [OFFLINE_LOADING.md](OFFLINE_LOADING.md). Noch fehlende Inhalte benötigen weiterhin Verbindung; eine HTTP-200-Dateiprüfung allein ist kein Offline-/Gerätenachweis.

Checks: `node --test tests/*.test.cjs`, `python3 -m unittest discover -s server -p 'test_*.py'`, dazu reale Browserprüfung mit verzögertem Audio und fehlschlagenden Bildanfragen. Ein Browser-Viewport ersetzt keine Abnahme auf dem physischen iPad.

## Rendering-Freigabe

Für Avatar-/Layoutänderungen gilt [RENDERING.md](RENDERING.md): eine Runtime-Darstellung, dekodierte Animationsframes, pausierbare Dekoration und ein wiederholbarer Browser-Audit. Echte Safari-Sichtprüfung zusätzlich zu Unit-Tests und DOM-Messung.
