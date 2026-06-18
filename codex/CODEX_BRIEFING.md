# Auftrag für Codex: Lernwort-App MVP bauen

Baue eine kleine, statische, tabletfreundliche WebApp für iPad 9.

## Ziel

Eine Lernwort-App für Klasse 1/2. Die App soll ruhig, minimalistisch und kindgerecht wirken. Sie nutzt JSON-Lernsets, lokale Bilder und später lokale MP3-Audios.

## Tech

Bitte zunächst ohne Framework:

- HTML
- CSS
- Vanilla JavaScript

Keine Build-Tools nötig, wenn es einfach geht.

## Dateien/Assets

Nutze diese vorhandenen Assets:

- `data/sets/animals_01.json`
- `assets/images/animals_01/*.png`
- `assets/backgrounds/calm-learning-bg.png`

## Grundflow

Implementiere diesen 3-Schritt-Flow:

1. Sprache wählen
2. Lernset wählen
3. Modus wählen
4. Spiel starten

### Screen 1: Sprache

Titel:

`Was möchtest du lernen?`

Große Karten:

- Deutsch
- English

MVP: English aktiv, Deutsch darf sichtbar sein, aber kann ggf. später führen.

### Screen 2: Lernset

Titel:

`Was möchtest du üben?`

Zeige verfügbare Sets für die gewählte Sprache.

MVP: `Animals 1` aktiv.

### Screen 3: Modus

Titel:

`Wie möchtest du üben?`

Zeige diese drei Modus-Karten:

- Hear & Tap
- Read & Tap
- Match Pairs

MVP: Mindestens `Read & Tap` funktional. `Hear & Tap` kann denselben Screen nutzen, nur mit Auto-Audio beim Aufgabenstart. `Match Pairs` darf zunächst Platzhalter sein, falls nötig.

## Erster funktionaler Spielmodus: English / Animals / Read & Tap

Ablauf:

- Lade `data/sets/animals_01.json`
- Nutze `labels.en` als Wort
- Zeige pro Aufgabe 1 englisches Wort
- Zeige darunter 4 Bildkarten
- 1 Bild ist korrekt
- 3 Bilder sind Distraktoren aus demselben Set
- mische die 4 Karten zufällig
- Karten im sauberen 2x2-Raster
- keine Überlagerung
- große Touchflächen
- Fortschritt anzeigen, z. B. `3 / 10`
- kein Zeitdruck

### Richtig

- Karte visuell positiv markieren
- kurzer sanfter Erfolgseffekt
- dann nächste Aufgabe

### Falsch

- Karte kurz sanft wackeln lassen
- nicht hart bestrafen
- Kind darf erneut wählen

## Audio

Jedes Item hat Pfade zu Audios.

Für MVP:

- Wenn Audio-Datei vorhanden ist: abspielen
- Wenn nicht vorhanden: kein Fehler in der Konsole; Button deaktivieren oder Web Speech API als Fallback nutzen
- Keine ElevenLabs-API im Frontend

## UI-Stil

Orientiere dich an den Bildern in:

`references/ui/`

Besonders:

- große Karten
- weiche Ecken
- ruhiger Hintergrund
- wenig Text
- klare Abstände
- freundlich, aber nicht kitschig
- satisfying, aber nicht überladen

## Hintergrund

Nutze:

`assets/backgrounds/calm-learning-bg.png`

als statischen Fullscreen-Hintergrund.

Struktur so bauen, dass später ein Video-Loop als Hintergrund möglich ist:

```html
<div class="background-layer"></div>
<main class="app-shell">...</main>
```

## Wichtige iPad-Regeln

- keine Hover-Abhängigkeit
- große Touchflächen
- keine kleinen Buttons
- keine unnötigen Scrollflächen
- 4 Bildkarten dürfen sich niemals überlagern
- Layout soll im iPad-Querformat gut funktionieren
- auch Hochformat möglichst nicht brechen

## Keine echten Eingabefelder für Kinder

Auch wenn der Schreibmodus noch nicht im MVP ist:

- keine nativen `<input>`/`textarea` für Kindereingabe vorsehen
- spätere Eingabe über custom Tastatur aus Buttons
- Antwortfeld als `div`, damit die iPad-Tastatur nicht aufspringt

## Akzeptanzkriterien

Die App ist MVP-fertig, wenn:

1. Startflow Sprache → Lernset → Modus funktioniert.
2. Animals 1 wird aus JSON geladen.
3. Read & Tap zeigt pro Aufgabe ein englisches Wort und 4 Bildkarten.
4. Die richtige Antwort wird erkannt.
5. Karten werden pro Aufgabe gemischt.
6. Layout ist touchfreundlich und überlappt nicht.
7. Statischer Hintergrund ist eingebunden.
8. App funktioniert lokal ohne Backend.
