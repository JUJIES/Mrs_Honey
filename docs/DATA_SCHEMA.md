# Datenstruktur

Lernsets liegen unter:

`data/sets/`

Beispiel:

`data/sets/animals_01.json`

## Prinzip

Ein Item enthält Bild, deutsche und englische Labels sowie optionale Audios.

```json
{
  "id": "cat",
  "image": "assets/images/animals_01/cat.png",
  "labels": {
    "de": "Katze",
    "en": "cat"
  },
  "audio": {
    "de": "assets/audio/animals_01/de/cat.mp3",
    "en": "assets/audio/animals_01/en/cat.mp3"
  },
  "difficulty": 1,
  "tags": ["animal", "pet"]
}
```

## Audios

Für MVP können Audiodateien fehlen. Die App soll damit robust umgehen:

- wenn MP3 vorhanden: abspielen
- wenn MP3 fehlt: Button deaktivieren oder Browser-TTS als Fallback nutzen
- keine ElevenLabs-API-Keys im Frontend

Zielpfade später:

```text
assets/audio/animals_01/en/cat.mp3
assets/audio/animals_01/de/cat.mp3
```

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
