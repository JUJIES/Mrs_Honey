# Lernwort-App MVP – Codex-Paket

Dieses Paket enthält die tablet- und handytaugliche Mrs-Honey-Lernwort-WebApp für Klasse 1/2.

## Ziel

Eine ruhige, minimalistische, kindgerechte WebApp für iPad 9.

Startflow:

1. Sprache wählen
2. Lernset wählen
3. Modus wählen
4. Spiel startet sofort

Die App enthält neun englische Lernsets, Audioübungen, Memory und das Farben-Wimmelspiel.

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
- Bildkarten, Memory und Farben-Wimmelspiel
- zufällig gemischte Antwortkarten
- lokaler Whisper-Endpoint für Einzelwort-Erkennung im Sprechen-Modus
- lokale JSON-/Bundle-Lernsets
- lokale PNG-Bilder
- statischer Hintergrund

MVP enthält noch nicht:

- animierter Hintergrund / Video-Loop
- Benutzerkonten
- Fortschritt pro Kind
- Lehrer-Editor
- freie Satzbewertung
- native iPad-Tastatur

## Start und Produktion

Der integrierte Server liefert App und Spracherkennung aus demselben Origin:

```bash
export WHISPER_CPP_BIN=/pfad/zu/whisper-cli
export WHISPER_CPP_MODEL=/pfad/zu/ggml-small.bin
export FFMPEG_BIN=/pfad/zu/ffmpeg
python3 server/local_app_server.py
```

Liveness: `GET /health`. Vollständige Speech-Bereitschaft: `GET /health/ready`.

Der dauerhafte Beelink-Betrieb, das minimale Release und die getrennten Windows-Dienste für App und Tunnel sind unter `deployment/` dokumentiert. Der aktuelle Migrations- und Abnahmestand steht in `MIGRATIONSPLAN_BEELINK.md`.
