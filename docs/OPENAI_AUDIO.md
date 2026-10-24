# OpenAI-Audio für Oskar

## Vertrag und Vorbild

Neue englische Sprachdateien verwenden `gpt-audio-1.5` über Chat Completions,
wie Video Labs `server/voice.mjs` und `lib/project.ts`. Der Entwicklungs-CLI
`tools/render_openai_audio.py` hält diesen Ablauf vom statischen Spiel getrennt.
Er nutzt nur Python-Standardbibliothek, FFmpeg/FFprobe und auf dem Mac POSIX-Locks.
Kein neuer Player, laufender Produktdienst oder SDK. Video Lab und der gemeinsame
ElevenLabs Wizard werden dafür nicht geändert.

Die bisherige externe Wizard-Pflicht gilt für neue Oskar-Audios nicht mehr.
Die 289 bestehenden MP3s bleiben bytegenau erhalten. Die App bekommt dieselben
MP3-Pfade, Manifest-Einträge und Rhubarb-Mundbewegungen wie bisher.
Audio im Spiel ist synthetisch erzeugt; bei Weitergabe entsprechend kennzeichnen.

## Eigener Key – ausschließlich lokal eingeben

```bash
python3 tools/configure_openai_audio.py
```

Die ausgegebene URL im lokalen Browser öffnen und den Key im Passwortfeld
eintragen. Das Formular bindet ausschließlich `127.0.0.1` an einem freien Port,
prüft Host, Origin, zufälligen URL-Token und Eingabegröße, verbietet Framing und
Caching und protokolliert keine Anfragen. Nach erfolgreichem Speichern endet der
Server; ansonsten läuft er nach 30 Minuten ab. Speichern kontaktiert OpenAI nicht.
`Referrer-Policy: same-origin` erhält bei nativen Formular-POSTs den Origin-Header;
`no-referrer` würde ihn auch im Codex-Browser zu `null` machen und die strikte
Herkunftsprüfung auslösen. Fremde oder `null`-Origins bleiben abgelehnt.

Der Key liegt in `~/.config/lernspiel-oskar/openai-tts.key`, Datei 0600, Ordner
0700. Das ist eine lokale private Klartextdatei, kein verschlüsselter Tresor.
Sie befindet sich außerhalb von Git, Webroot, Cache, Projektdateien und Release.
Keine Werte in Chat, Screenshots, Kommandoargumente oder Logs übernehmen.
Andere Projekt-Keys und `OPENAI_API_KEY` werden bewusst nicht geerbt.
Erneutes Starten des Formulars ersetzt den Key. Zum Entfernen nur diese Datei
löschen, ohne ihren Inhalt anzuzeigen.

## Hörproben und Profil

```bash
python3 tools/render_openai_audio.py --dry-run
python3 tools/render_openai_audio.py --generate
```

Ohne `--generate` werden Eingaben geprüft, aber weder Ausgaben/Cache geschrieben
noch Anbieteranfragen gestellt. `--generate` erlaubt bezahlte Anfragen für noch
nicht gecachte Texte. Drei kurze synthetische Proben aus `tools/audio_samples.json`
testen Suchfrage, Lesen-Rückmeldung und Satzhinweis. Sie landen ausschließlich in
`~/.cache/lernspiel-oskar/audio/samples/oskar-samples/`, zusätzlich als ZIP und
Metadaten-Sidecar. Sie werden nicht ins Spiel importiert.

`tools/audio_profile.json` ist die einzige Standardkonfiguration:

Julius hat dieses Profil am 24.10.2026 nach den drei erzeugten Hörproben als
Standard für alle neuen Audios freigegeben. Modell, Stimme und Sprechregie
entsprechen exakt den Proben. Bestehende MP3s bleiben unverändert; ein anderer
Standard benötigt einen ausdrücklichen Änderungsauftrag.

- Modell `gpt-audio-1.5`, Stimme `alloy` wie Video Lab;
- natürliches britisches Englisch, warme freundliche Erwachsenenstimme;
- langsam, ungefähr 90 Wörter/Minute, deutlich und mit kurzen natürlichen Pausen;
- keine Ergänzungen, Ansagerstimme, Musik oder Effekte.

Tempo ist eine Sprechregie, kein garantiertes Timing und kein separater
API-Speed-Parameter. Mit `--profile /pfad/profil.json` kann ein explizites Profil
mit denselben drei Feldern erprobt werden. Kein automatischer Modellfallback.
Für neue Sets beide Prompt-Dateien durch `tools/build_audio_prompts.py` erzeugen;
vollständiger Ablauf in `SET_GENERATION_PIPELINE.md`.

## Cache, Texttreue und MP3-QA

Der SHA-256-Cache berücksichtigt exakten Text, Modell, Stimme, Sprechregie sowie
Prompt-/Verarbeitungsrevision. Audiodateien haben eigene SHA-256-Prüfsummen.
Visuelle Änderungen lösen keine Sprachgenerierung aus. Prozessübergreifende
Locks verhindern gleichzeitige bezahlte Anfragen für denselben Cache-Eintrag.
Providerfehler werden ohne Antwortbody/Key gemeldet; kein automatisches Retry.

Die Antwort muss eine vollständige WAV-Datei und ein Anbietertranskript liefern.
Der Wortvergleich normalisiert Großschreibung, Unicode und Satzzeichen, erlaubt
aber keine Wortergänzungen oder Ersetzungen. Abweichungen bleiben als WAV und
Transkript im `review`-Unterordner des Cache-Eintrags; kein MP3/ZIP wird publiziert.
Ein erneuter ausdrücklicher Generierungsaufruf kann erneut Kosten verursachen.
Das Anbietertranskript ist keine unabhängige ASR; tatsächliche Aussprache und
Texttreue zusätzlich hören.

FFmpeg normalisiert auf -19 LUFS, -2 dBTP, LRA 7 und ergänzt 180 ms vor/260 ms nach
dem Signal. Ausgabe: Mono-MP3, 44,1 kHz, 128 kbit/s. Vollständiger Decode,
Nicht-Stille und gemessene Dauer werden geprüft. Padding ist zusätzlich zu
eventuellen Pausen im Modell-WAV. Diese QA beweist weder subjektive Natürlichkeit
noch einen bestimmten Akzent oder eine bestimmte Sprechgeschwindigkeit.

## Import und Stimmen-QA

Der ZIP-Vertrag bleibt flach: nur die erwarteten MP3-Dateinamen. Daneben liegt
`<bundle>.metadata.json` mit Profil-ID, Text, Transkript, QA und Audio-Hashes.
`tools/import_audio_bundles.py` validiert beide vollständigen Gruppen vor dem
Schreiben, prüft vorhandene Sidecars gegen Quelltexte und ZIP-Inhalte und erstellt
nur fehlende Dateien per exklusivem Dateizugriff. Bestehende MP3s und ihre
Änderungszeiten werden nicht angetastet. Dry-run zeigt `imported` und `preserved`.
Alte Wizard-ZIPs ohne Sidecar bleiben als Legacy-Audio importierbar.

Für neu importierte Dateien entsteht `assets/audio/audio-provenance.json` mit
Pfad, Profil und SHA-256. Bestehende Dateien brauchen keine rückwirkende Mutation.
`voice_consistency_qa.py` prüft Provenienz-Hashes und berechnet Tonhöhen-Ausreißer
pro Profil; unmarkierte Altdateien bilden eine gemeinsame Legacy-Gruppe.
Weniger als acht zuverlässig messbare Dateien liefern ausdrücklich
`insufficient-baseline; manual listening required` und einen Fehlerstatus.
Keine Ausreißerprüfung durch Abschalten der QA oder Regenerieren alter Dateien
umgehen. Der automatische Sync prüft danach Manifest, Pfade und Lipsync wie bisher.
Neue Lipsync-Dateien verwenden den vollständigen `speak.en`-Text als Dialoghilfe;
ältere Items ohne Sprechertext behalten das Label als Fallback. Bestehende
Lipsync-Dateien werden bei unveränderten MP3s nicht neu erzeugt.

## Prüfungen ohne echten Key

```bash
python3 -B -m unittest discover -s tools -p 'test_audio_pipeline.py'
python3 -B -m unittest discover -s server -p 'test_*.py'
node --test tests/mobile-reliability.test.cjs
```

Audio-Tests nutzen synthetische WAVs und gemockte Anbieterantworten. Sie prüfen
unter anderem sichere Key-Eingabe, Cache-Wiederverwendung, Textabweichungen,
Dry-run ohne Schreibvorgänge, MP3-Konvertierung, Metadaten/Hash-Manipulation und
Bestandsschutz beim Import. Echte Hörproben bleiben ein getrennter Praxistest.

Offizielle API-Referenz:
[Audio in Chat Completions](https://developers.openai.com/api/docs/guides/audio-chat-completions).
