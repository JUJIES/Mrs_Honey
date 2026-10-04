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

Memory und Farben-Wimmelspiel sind eigene Auswahlpfade, keine Kompetenzkarten.

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
