# Migrationsplan Beelink: Mrs Honey

Diese eine Datei ist Plan, Entscheidungsprotokoll und Abschlussnachweis. Statuswerte: `offen`, `bestanden`, `blockiert`, `nicht relevant`. `Nicht relevant` benötigt einen Grund.

## 1. Auftrag und kleinster Betriebsvertrag

| Feld | Entscheidung |
|---|---|
| Projekt / Zweck | Mrs Honey, dauerhaft erreichbare Englisch-Lern-PWA mit lokaler Whisper-Sprechprüfung |
| Klasse | `service`, weil App und stabile URL dauerhaft verfügbar sein sollen |
| Quellrepository / Branch | `git@github.com:JUJIES/Mrs_Honey.git`, `main` |
| Produkt-Freeze-Commit auf GitHub | wird nach Freeze gesetzt |
| Readiness-Dokumentationscommit | wird nach Freeze gesetzt |
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
| Dirty-/Remote-/Branch-Drift geklärt; Freeze-Commit auf GitHub vorhanden | offen | Ausgangsstand `06f0d49624ba9e668721132330f51bdea1b96d63` war sauber und exakt `origin/main`; Freeze folgt nach Produktchecks |
| Readiness-Commit enthält nur Plan-/Evidenzdokumentation und ist gepusht | offen | folgt nach Produkt-Freeze |
| Secrets, Nutzerdaten, Logs und Backup-Scope klassifiziert | bestanden | keine App-Secrets oder persistenten Nutzerdaten; Transkripte standardmäßig redigiert; Tunnel-Credential bleibt externe geheime Konfiguration |
| `_dev` reproduziert Setup, Tests und Produktverhalten | offen | Beelink-Reproduktion folgt nach Readiness |
| Kandidat auf freiem Port lokal gesund / Tool-Dry-run bestanden | bestanden | lokaler integrierter Server auf 5190; `/health/ready` 200; reales `cat.mp3` wurde korrekt als `cat` erkannt |
| Persistenz und Runtime liegen außerhalb des Releases | bestanden | minimaler Release enthält nur 856 Runtime-Dateien; Modell, Binaries, Temp und Logs liegen außerhalb |
| Unveränderlicher `_services`-Release erzeugt | offen | folgt aus Freeze-Commit |
| App-Lifecycle unabhängig vom Control Center nachgewiesen | offen | folgt auf dem Beelink |
| Named-Tunnel-Lifecycle separat nachgewiesen | offen | folgt auf dem Beelink |
| Rollback vor Cutover konkret und ausführbar geprüft | offen | Ziel: neue Route/Dienste stoppen; Mac/GitHub bleiben unverändert |
| Verschlüsseltes Backup plus isolierte Restore-Probe bestanden | offen | App-Daten nicht relevant; geheime Tunnel-Konfiguration wird getrennt bewertet |
| Kleinster Registry-Vertrag ohne Sonderlogik validiert | offen | status-only nach unabhängiger App-Abnahme |
| Lokaler und – falls relevant – öffentlicher Postcheck bestanden | offen | folgt nach Tunnel-Cutover |
| Autostart/Recovery geprüft; voller Reboot durchgeführt oder als offenes Gate benannt | offen | SCM-Recovery wird geprüft; Host-Reboot benötigt gesonderte Freigabe |
| Abschlussstand in GitHub, `_dev`, `_services`, Runtime und Registry konsistent | offen | Abschlussgate |

## 3. Entscheidungen und Abweichungen

- Der öffentliche Origin bleibt ohne zusätzliche Login-Seite, damit die Lernabläufe unverändert bleiben. Uploadlimit, Einzel-Whisper-Slot auf dem Beelink und redigierte Logs begrenzen die zusätzliche Internetangriffsfläche.
- Das bestehende Same-Origin-Python-Muster bleibt erhalten; es wird kein paralleler Reverse-Proxy- oder Container-Stack eingeführt.
- Der veröffentlichte Release ist eine überprüfbare Runtime-Auswahl aus dem Freeze-Commit und enthält keine Entwicklungs- oder Referenzartefakte.

## 4. Rollback

- Vorheriger Zustand: keine Mrs-Honey-App, kein Mrs-Honey-Dienst und kein DNS-Eintrag auf dem Beelink.
- Exakte Rückfallaktion: Tunnel-Dienst und App-Dienst stoppen; öffentliche Route entfernen oder auf 404 setzen; neuen Release und Runtime für Diagnose behalten.
- Nachweis: wird vor öffentlichem Cutover lokal geprüft.
- Cleanup bleibt separat und ist nicht freigegeben.

## 5. Abschluss

- Ergebnis: `offen`
- Produkt-Freeze-Commit: offen
- Readiness-Dokumentationscommit: offen
- Control-Center-Commit oder `nicht relevant`: offen
- Lokaler Healthcheck: offen
- Öffentlicher Healthcheck oder `nicht relevant`: offen
- Backup-/Restore-Nachweis oder `nicht relevant`: offen
- Bewusst offene Praxischecks: Beelink-Abnahme, öffentlicher Mobiltest und Host-Reboot
