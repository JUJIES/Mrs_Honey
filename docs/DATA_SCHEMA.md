# Datenstruktur

Lernsets liegen unter:

`data/sets/`

Beispiel:

`data/sets/animals_01.json`

## Prinzip

Das aktuelle MVP ist English-only (`languages: ["en"]`). Ein Item enthält
Bild, englisches Label, Sprechertext, Audio und optional Lesen-Rückmeldung:

```json
{
  "id": "cat",
  "image": "assets/images/animals_01/cat.png",
  "labels": {"en": "cat"},
  "speak": {"en": "Can you find the cat?"},
  "audio": {"en": "assets/audio/animals_01/en/cat.mp3"},
  "readFeedbackText": {"en": "Yes! That's a cat."},
  "readFeedback": {"en": "assets/audio/animals_01/en/read_feedback_cat.mp3"},
  "difficulty": 1,
  "tags": ["animal", "pet"]
}
```

## Audios

Die App konsumiert lokale MP3s und passende Rhubarb-JSONs. Alle referenzierten
Audios müssen existieren und im Audio-Manifest stehen. Nach Set-JSON-Änderungen
auch das zugehörige Bundle neu erzeugen. Keine Provider-Keys oder Generierung im
Frontend; fehlende Audios nicht mit stiller Browser-TTS-Regenerierung kaschieren.

Neue Audios: `docs/OPENAI_AUDIO.md`. Das Lernset-Modell bleibt anbieterunabhängig.
`assets/audio/audio-provenance.json` ergänzt ausschließlich für neu importierte
OpenAI-Dateien Profil und Prüfsumme; Altdateien bleiben der Legacy-Stimmgruppe
zugeordnet. Die Datei steuert Entwicklungs-QA, nicht die Wiedergabe.

## Bilder

Aktuelles MVP-Set:

```text
assets/images/animals_01/cat.png
assets/images/animals_01/dog.png
assets/images/animals_01/fish.png
assets/images/animals_01/bird.png
assets/images/animals_01/rabbit.png
assets/images/animals_01/mouse.png
assets/images/animals_01/horse.png
assets/images/animals_01/cow.png
assets/images/animals_01/pig.png
assets/images/animals_01/duck.png
```
