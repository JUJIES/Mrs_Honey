# Lernwort-App MVP – Codex-Paket

Dieses Paket enthält die tablet- und handytaugliche Mrs-Honey-Lernwort-WebApp für Klasse 1/2.

## Ziel

Eine ruhige, minimalistische, kindgerechte WebApp für iPad 9.

Produktiv ist die App dauerhaft unter
[`https://mrshoney.jujies.app`](https://mrshoney.jujies.app) erreichbar.

Startflow:

1. Sprache wählen
2. Lernset wählen
3. Modus wählen
4. Spiel startet sofort

Die App enthält neun englische Lernsets, Audioübungen, Memory, Catch a Pair, Word Blaster und das Farben-Wimmelspiel.
Nach einer Lernrunde wählt das Kind ein Belohnungsspiel. Catch a Pair verbindet
bewegte Bild-/Wortpaare auf zwei Bahnen und ist für Desktop und Tablet ausgelegt.
Produktlogik und Modulvertrag: [docs/CATCH_A_PAIR.md](docs/CATCH_A_PAIR.md).
Word Blaster lässt Kinder mit drehbarer Kanone und Wandabprallern das passende
Bild treffen: drei Schwierigkeitsgrade, entspannte Set-Runden und eine 60-Sekunden-
Challenge mit lokalen Top 10. Grundmodus und Bedienung: [docs/WORD_BLASTER.md](docs/WORD_BLASTER.md).

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

Standard für neue Sets: quadratische Szenenbilder statt Freisteller, English-only Setdaten, neue MP3s über OpenAI GPT-Audio-1.5 nach dem Video-Lab-Verfahren, Audio-QA und visuelle App-Prüfung in allen drei Modi.

## Audio-Erzeugung und eigener API-Key

Die App spielt weiterhin lokale MP3s ab. Die bisherigen 289 Aufnahmen bleiben
unverändert. Neue Aufnahmen entstehen bewusst über einen lokalen Entwicklungs-CLI
mit `gpt-audio-1.5`, warmer langsamer englischer Stimme, Transkriptprüfung und Cache.

```bash
python3 tools/configure_openai_audio.py
python3 tools/render_openai_audio.py --dry-run
python3 tools/render_openai_audio.py --generate
```

Den eigenen API-Key ausschließlich im ausgegebenen lokalen Passwortformular
eintragen. Er liegt mit privaten Dateirechten außerhalb des Projekt-/Webordners;
der Player und Exporte brauchen keinen Key. Das Speichern ruft OpenAI nicht auf.
`--generate` erzeugt drei getrennte Hörproben außerhalb des Audio-Bestands.
Details und Set-Import: [OpenAI-Audio](docs/OPENAI_AUDIO.md).

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
export WHISPER_CPP_MODEL=/pfad/zu/ggml-base.en.bin
export FFMPEG_BIN=/pfad/zu/ffmpeg
python3 server/local_app_server.py
```

Liveness: `GET /health`. Vollständige Speech-Bereitschaft: `GET /health/ready`.

Der dauerhafte Beelink-Betrieb, das minimale Release und die getrennten Windows-Dienste für App und Tunnel sind unter `deployment/` dokumentiert. Der aktuelle Migrations- und Abnahmestand steht in `MIGRATIONSPLAN_BEELINK.md`.

## Nutzung unterwegs

Lerninhalte werden automatisch vorgeladen: zuerst die aktuelle/nächste Aufgabe, dann das gewählte Set und gemeinsame Rückmeldungen. Es gibt keinen zusätzlichen Downloadschritt. Vollständig vorbereitete Bilder und Audios werden lokal wiederverwendet und bleiben über Oberflächen-Updates erhalten. Noch fehlende Inhalte benötigen Verbindung; die Sprechprüfung bleibt online.

Architektur, Grenzen und Aktualisierung des Datei-Inventars: [docs/OFFLINE_LOADING.md](docs/OFFLINE_LOADING.md).
