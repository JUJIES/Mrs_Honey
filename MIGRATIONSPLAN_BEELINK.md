# Migrationsplan Beelink: Mrs Honey

Diese eine Datei ist Plan, Entscheidungsprotokoll und Abschlussnachweis. Statuswerte: `offen`, `bestanden`, `blockiert`, `nicht relevant`. `Nicht relevant` benötigt einen Grund.

## 1. Auftrag und kleinster Betriebsvertrag

| Feld | Entscheidung |
|---|---|
| Projekt / Zweck | Mrs Honey, dauerhaft erreichbare Englisch-Lern-PWA mit lokaler Whisper-Sprechprüfung |
| Klasse | `service`, weil App und stabile URL dauerhaft verfügbar sein sollen |
| Quellrepository / Branch | `git@github.com:JUJIES/Mrs_Honey.git`, `main` |
| Produkt-Freeze-Commit auf GitHub | `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3` |
| Readiness-Dokumentationscommit | `21bdbf5e5255f48474a2be4bb1d52a6e945434db` |
| Schreibender Arbeitsort | Mac-Repository; Beelink `_dev\Mrs_Honey` reproduziert nur gepushte Commits |
| Persistente Daten | keine Lern- oder Nutzerdaten; Runtime enthält nur reproduzierbare Dependencies, temporäre Dateien und redigierte Betriebslogs |
| Secrets / personenbezogene Daten | Mikrofon-Audio und Transkript nur anfragebezogen; keine dauerhafte Speicherung; Named-Tunnel-Credential ausschließlich ACL-geschützt außerhalb von Git |
| Startmodell | zwei getrennte automatische Windows-SCM-Dienste für App und Named Tunnel |
| Öffentliche URL | `https://mrshoney.jujies.app` |
| Control-Center-Scope | App status-only: Status, Details, Logs und Ereignisse; keine Liveaktionen |
| Nichtziele | keine neuen Lernfeatures, kein Redesign, keine Benutzerkonten, kein Fortschritts-Backend und kein Cleanup bestehender Beelink-Dienste |

## 2. Gates und Evidenz

| Gate | Status | Knappe Evidenz oder Blocker |
|---|---|---|
| Produktlogik, Datenfluss, Persistenz und bisheriger Startweg verstanden | bestanden | Statische PWA und `/api/speech/check` laufen same-origin; Speech-Dateien sind temporär; Browserzustand ist nicht persistent |
| Dirty-/Remote-/Branch-Drift geklärt; Freeze-Commit auf GitHub vorhanden | bestanden | Freeze `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3` ist gepusht und von `origin/main` erreichbar |
| Readiness-Commit enthält nur Plan-/Evidenzdokumentation und ist gepusht | bestanden | `21bdbf5e5255f48474a2be4bb1d52a6e945434db` ändert ausschließlich diesen Migrationsplan |
| Secrets, Nutzerdaten, Logs und Backup-Scope klassifiziert | bestanden | keine App-Secrets oder persistenten Nutzerdaten; Transkripte standardmäßig redigiert; Tunnel-Credential bleibt externe geheime Konfiguration |
| `_dev` reproduziert Setup, Tests und Produktverhalten | bestanden | Beelink-`_dev\Mrs_Honey` ist sauber auf `main`/`21bdbf5...`; ein separater Freeze-Worktree bestand 5 Unit-Tests, Syntax- und Readiness-Smoke |
| Kandidat auf freiem Port lokal gesund / Tool-Dry-run bestanden | bestanden | lokaler integrierter Server auf 5190; `/health/ready` 200; reales `cat.mp3` wurde korrekt als `cat` erkannt |
| Persistenz und Runtime liegen außerhalb des Releases | bestanden | minimaler Release enthält nur 856 Runtime-Dateien; Modell, Binaries, Temp und Logs liegen außerhalb |
| Unveränderlicher `_services`-Release erzeugt | bestanden | sauberer detached Git-Worktree `_services\Mrs_Honey\fda31f55...`, exakt auf dem Produkt-Freeze |
| App-Lifecycle unabhängig vom Control Center nachgewiesen | bestanden | `BeelinkApp-MrsHoney`, Automatic/LocalService; Restart und erzwungener Child-Crash führten jeweils zu neuem gesundem Listener |
| Named-Tunnel-Lifecycle separat nachgewiesen | bestanden | `BeelinkTunnel-MrsHoney`, Automatic/LocalService; Tunnel-Restart ließ die lokale App unangetastet und stellte vier Edge-Verbindungen wieder her |
| Rollback vor Cutover konkret und ausführbar geprüft | bestanden | App- und Tunnel-Dienst lassen sich getrennt stoppen/starten; ursprüngliches Runtime-Paket bleibt unter `_runtime\Mrs_Honey\rollback` rückholbar; Route ist separat entfernbar |
| Verschlüsseltes Backup plus isolierte Restore-Probe bestanden | nicht relevant | keine persistenten App-/Nutzerdaten; Runtime-Abhängigkeiten sind hashverzeichnet und reproduzierbar, das ersetzbare Tunnel-Credential bleibt ACL-geschützt außerhalb von Git |
| Kleinster Registry-Vertrag ohne Sonderlogik validiert | bestanden | Control Center `2ea37cebdb717e2a29c880c5a58212a7f55d3b96`: `mrs-honey`, status-only, keine Mutationen, sechs registrierte Logs |
| Lokaler und – falls relevant – öffentlicher Postcheck bestanden | bestanden | lokal und öffentlich `/health/ready` 200; Root 200; echter öffentlicher `cat.mp3`-Speech-Check korrekt in 6,3 s |
| Autostart/Recovery geprüft; voller Reboot durchgeführt oder als offenes Gate benannt | bestanden | beide Dienste Automatic, App-/Tunnel-Restart und App-Crash-Recovery bestanden; voller Host-Reboot bleibt mangels gesonderter Freigabe offen |
| Abschlussstand in GitHub, `_dev`, `_services`, Runtime und Registry konsistent | bestanden | GitHub/`_dev` Readiness `21bdbf5...`, Produktivrelease Freeze `fda31f55...`, Runtime-Hashes dokumentiert, Control Center meldet `healthy` |

## 3. Entscheidungen und Abweichungen

- Der öffentliche Origin bleibt ohne zusätzliche Login-Seite, damit die Lernabläufe unverändert bleiben. Uploadlimit, Einzel-Whisper-Slot auf dem Beelink und redigierte Logs begrenzen die zusätzliche Internetangriffsfläche.
- Das bestehende Same-Origin-Python-Muster bleibt erhalten; es wird kein paralleler Reverse-Proxy- oder Container-Stack eingeführt.
- Der minimale Build-/Auditexport ist eine überprüfbare Runtime-Auswahl aus dem Freeze-Commit und enthält keine Entwicklungs- oder Referenzartefakte.
- Der produktive `_services`-Pfad ist nach der Control-Center-Vorabnahme ein sauberer detached Git-Worktree des Freeze-Commits. Das minimale 856-Dateien-Paket bleibt Build-/Auditnachweis, wird aber nicht als produktiver Registry-Pfad verwendet.
- Auf dem Intel N150 war `ggml-small.bin` korrekt, aber mit rund 21,5 Sekunden pro Prüfung zu langsam. `ggml-base.en.bin` erkannte vier repräsentative Wörter korrekt und senkte die warme öffentliche `cat`-Prüfung zuletzt auf 6,3 Sekunden; `small` bleibt Fallback.
- Python, whisper.cpp, Modelle, FFmpeg, WinSW, cloudflared und Servicekonfigurationen sind mit Versionen und SHA-256 unter `deployment/windows/runtime-dependencies.json` festgehalten.

## 4. Rollback

- Vorheriger Zustand: keine Mrs-Honey-App, kein Mrs-Honey-Dienst und kein DNS-Eintrag auf dem Beelink.
- Exakte Rückfallaktion: Tunnel-Dienst und App-Dienst stoppen; öffentliche Route entfernen oder auf 404 setzen; neuen Release und Runtime für Diagnose behalten.
- Nachweis: getrennte App-/Tunnel-Restarts und App-Crash-Recovery bestanden. Das vor der Git-Worktree-Ausrichtung aktive Runtime-Paket liegt rückholbar unter `_runtime\Mrs_Honey\rollback\release-package-fda31f55-20260726-0745Z`.
- Cleanup bleibt separat und ist nicht freigegeben.

## 5. Abschluss

- Ergebnis: `bestanden`
- Produkt-Freeze-Commit: `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3`
- Readiness-Dokumentationscommit: `21bdbf5e5255f48474a2be4bb1d52a6e945434db`
- Control-Center-Commit: `2ea37cebdb717e2a29c880c5a58212a7f55d3b96`
- Lokaler Healthcheck: `http://127.0.0.1:5900/health/ready` → 200
- Öffentlicher Healthcheck: `https://mrshoney.jujies.app/health/ready` → 200
- Öffentlicher Produktcheck: Start-, Lernset-, Modus- und Sprechen-Ansicht im Desktop-/Mobil-Viewport; Speech-API mit realem MP3 → korrekt/200
- Backup-/Restore-Nachweis: `nicht relevant`, weil keine persistenten App-/Nutzerdaten existieren; Abhängigkeiten sind reproduzierbar und hashverzeichnet
- Bewusst offene Praxischecks: voller Host-Reboot erst nach ausdrücklicher Freigabe; reale Mikrofonberechtigung einmal auf dem konkreten Handy bestätigen
