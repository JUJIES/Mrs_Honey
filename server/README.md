# Lernwort Speech Check

Lokaler MVP-Dienst für den Modus **Sprechen**.

Die WebApp nimmt ein kurzes Wort auf und schickt es an:

```text
http://127.0.0.1:8787/api/speech/check
```

Der Dienst wandelt die Aufnahme mit `ffmpeg` in WAV um, transkribiert mit `whisper.cpp` und vergleicht das Ergebnis tolerant mit dem erwarteten Wort.

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
python3 server/speech_check_server.py
```

Healthcheck:

```bash
curl http://127.0.0.1:8787/health
```
