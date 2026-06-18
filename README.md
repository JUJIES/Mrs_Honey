# Lernwort-App MVP – Codex-Paket

Dieses Paket enthält alles für den ersten MVP einer tabletfreundlichen Lernwort-WebApp für Klasse 1/2.

## Ziel

Eine ruhige, minimalistische, kindgerechte WebApp für iPad 9.

Startflow:

1. Sprache wählen
2. Lernset wählen
3. Modus wählen
4. Spiel startet sofort

Erstes Lernset: `Animals 1` mit 10 Tieren.

## Enthalten

- `assets/images/animals_01/` – 10 freigestellte Tier-PNGs mit Alpha-Kanal
- `assets/backgrounds/calm-learning-bg.png` – statischer Hintergrund für MVP
- `data/sets/animals_01.json` – Lernset im geplanten JSON-Format
- `server/speech_check_server.py` – lokaler Whisper-Check für den Modus Sprechen
- `references/ui/` – Mockup-Referenzen für Screens
- `docs/` – Konzept, UI-Regeln, Datenstruktur
- `codex/CODEX_BRIEFING.md` – direkt nutzbarer Auftrag für Codex

## Neue Lernsets

Für neue Wortlisten ist die feste Bild-/Audio-Pipeline dokumentiert in:

- `docs/SET_GENERATION_PIPELINE.md`

Standard für neue Sets: quadratische Szenenbilder statt Freisteller, English-only Setdaten, MP3-Erzeugung über den 11labs Wizard, Audio-QA und visuelle App-Prüfung in allen drei Modi.

## MVP-Abgrenzung

MVP enthält:

- statische WebApp
- iPad-first Layout
- Sprache wählen
- Lernset wählen
- Modus wählen
- funktionale Modi: English / Hear, Lesen, Sprechen
- 4 Bildkarten im 2x2-Raster
- zufällig gemischte Antwortkarten
- lokaler Whisper-Endpoint für Einzelwort-Erkennung im Sprechen-Modus
- lokales JSON-Lernset
- lokale PNG-Bilder
- statischer Hintergrund

MVP enthält noch nicht:

- animierter Hintergrund / Video-Loop
- Benutzerkonten
- Fortschritt pro Kind
- Lehrer-Editor
- gehostetes Backend
- freie Satzbewertung
- native iPad-Tastatur
