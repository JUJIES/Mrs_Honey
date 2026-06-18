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

Karten:

- 🇩🇪 Deutsch
- 🇬🇧 English

Flagge immer mit Textlabel.

### Lernset wählen

Titel:

`Was möchtest du üben?`

Für English:

- Animals
- Food
- Colours
- School things

Im MVP nur Animals aktiv.

### Modus wählen

Titel:

`Wie möchtest du üben?`

Karten:

- Hear & Tap
- Read & Tap
- Match Pairs

Layout ähnlich Referenz `references/ui/03_mode_selection.png`.

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
