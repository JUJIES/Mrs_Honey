# Konzeptstand Lernwort-App MVP

## Grundidee

Die App ist keine einzelne Spielerei, sondern eine kleine Lernwort-Engine:

`Lernset → Spielmodus → Aufgabe`

Lernsets liegen als JSON-Dateien vor. Bilder und Audiodateien werden extern erzeugt und lokal eingebunden.

## Zielgruppe

- Klasse 1/2
- Anfang Lesen/Schreiben
- Nutzung auf iPad 9
- Bedienung über große Touchflächen

## Designprinzip

Die App soll:

- minimalistisch
- warm
- ruhig
- kindgerecht, aber nicht kitschig
- optisch ansprechend
- satisfying durch Sound, Feedback und kleine Animationen
- mit möglichst wenig Text bedienbar sein

## Startflow

Drei Taps bis zum Spiel:

1. Sprache wählen: English (aktueller MVP ist English-only)
2. Lernset wählen: z. B. Animals
3. Modus wählen: Hören / Lesen / Sprechen

Pro Screen wird nur eine Entscheidung angezeigt.

## Sprachenlogik

### Englisch

Erstmal rezeptiv:

- Wort hören
- Wort lesen
- passendes Bild antippen

### Deutsch (nur spätere Idee, nicht im MVP)

Später produktiver:

- Bild sehen
- Wort bauen
- Buchstaben aus custom Tastatur wählen
- keine echten Input-Felder

## Erste drei Modi

### Hear & Tap

Kind hört ein englisches Wort und tippt das passende Bild.

### Read & Tap

Kind sieht ein englisches Wort und tippt das passende Bild. Lautsprecherbutton zum Anhören bleibt möglich.

### Sprechen

Kind sieht ein Bild, kann die Aussprache anhören und benennt es auf Englisch in
einem Satz (z. B. `It's a cat.`). Die Aufnahme wird an den same-origin
Whisper-Dienst geschickt. Er prüft tolerant das erwartete Wort und die unterstützten
Satzmuster (`requiresSentence=true`), nicht frei die Grammatik beliebiger Sätze.

## Erster funktionaler Modus

English / Animals / Read & Tap, Hear & Tap oder Sprechen:

- oben englisches Wort, z. B. `cat`
- Lautsprecherbutton
- darunter 4 Bildkarten
- 1 richtig, 3 Distraktoren aus demselben Set
- Kartenpositionen zufällig gemischt
- 2x2-Raster, keine Überlagerung
- große Tapflächen
- richtig: positives Feedback
- falsch: sanftes Feedback, nochmal versuchen
- Sprechen: ein Bild, Mikrofonaufnahme, lokaler Whisper-Check

## Schreib-/Wortbau-Modus später

Wichtige Architekturentscheidung:

Keine echten `<input>`- oder `<textarea>`-Felder im Kindermodus.

Stattdessen:

- Antwortfeld als nicht-editierbares `div`
- Custom-Tastatur aus Buttons
- native iPad-Tastatur soll nicht aufspringen

Progression:

1. nur Zielbuchstaben, aber gemischt
2. Zielbuchstaben + wenige Distraktoren
3. mehr Distraktoren
4. Lernset-Tastatur
5. ABC-Tastatur

Buchstaben dürfen nie in richtiger Reihenfolge angezeigt werden.
