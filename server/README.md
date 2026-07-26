# Lernwort Speech Check

Lokaler MVP-Dienst für den Modus **Sprechen**.

Im integrierten Betrieb nimmt die WebApp ein kurzes Wort auf und schickt es same-origin an:

```text
/api/speech/check
```

Der Dienst wandelt die Aufnahme mit `ffmpeg` in WAV um, transkribiert mit `whisper.cpp` und vergleicht das Ergebnis tolerant mit dem erwarteten Wort.

Aufnahmen und Whisper-Zwischendateien liegen nur in einem temporären Verzeichnis und werden nach jeder Anfrage entfernt. Transkripte werden standardmäßig nicht in Service-Logs geschrieben.

## Empfehlung für den MVP

Für einzelne englische Wörter:

```text
ggml-small.bin
```

Das war im lokalen Test deutlich zuverlässiger als `base` bei kurzen Tierwörtern, bleibt aber auf einem aktuellen Mac/Mini-PC noch schnell genug. `large-v3-turbo` war für diese kurzen Wörter nicht besser und langsamer.

## Start

```bash
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build -j --config Release
./models/download-ggml-model.sh small
```

Dann im Lernwort-Paket:

```bash
export WHISPER_CPP_BIN=/pfad/zu/whisper.cpp/build/bin/whisper-cli
export WHISPER_CPP_MODEL=/pfad/zu/whisper.cpp/models/ggml-small.bin
export FFMPEG_BIN=/pfad/zu/ffmpeg
python3 server/local_app_server.py
```

Checks:

```bash
curl http://127.0.0.1:5173/health
curl http://127.0.0.1:5173/health/ready
```

`/health` prüft den laufenden HTTP-Dienst. `/health/ready` liefert nur `200`, wenn Whisper-Binary, Modell und `ffmpeg` vorhanden sind.

## Produktionsvariablen

- `LERNWORT_APP_HOST` und `LERNWORT_APP_PORT`: Bind-Adresse und Port des integrierten Servers.
- `WHISPER_CPP_BIN`, `WHISPER_CPP_MODEL`, `FFMPEG_BIN`: explizite Dependency-Pfade.
- `LERNWORT_MAX_REQUEST_BYTES`: maximale Multipart-Anfrage, standardmäßig 4 MiB.
- `LERNWORT_SPEECH_CONCURRENCY`: parallele Whisper-Prüfungen, standardmäßig 2.
- `LERNWORT_LOG_TRANSCRIPTS`: nur bei explizitem `1` werden Transkripte geloggt; Produktion verwendet `0`.
- `LERNWORT_CORS_ORIGIN`: erlaubter Origin für den getrennten lokalen Speech-Server; im integrierten Betrieb auf die öffentliche App-URL setzen.
